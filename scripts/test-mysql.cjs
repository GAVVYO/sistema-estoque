// Explicit opt-in: creates fresh disposable databases, never uses DATABASE_URL.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const req = createRequire(path.join(repo, 'apps/api/package.json'));
const maria = req('mariadb');
const { Client } = req('pg');
function connection(key, protocol) {
  const value = process.env[key];
  if (!value) throw new Error('Defina ' + key + ' explicitamente para servidores locais descartáveis.');
  const url = new URL(value);
  if (url.protocol !== protocol || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Servidor de teste deve ser loopback: ' + key);
  return url;
}
(async () => {
  const mysql = connection('MYSQL_TEST_ADMIN_URL', 'mysql:');
  const postgres = connection('POSTGRES_TEST_ADMIN_URL', 'postgresql:');
  const prefix = 'gav_qa_' + Date.now() + '_';
  const env = { ...process.env, DATABASE_URL: 'mysql://unused@127.0.0.1:1/no_fallback' };
  const admin = new Client({ connectionString: postgres.href });
  await admin.connect();
  try { await admin.query('CREATE DATABASE "' + prefix + 'migration_test"'); } finally { await admin.end(); }
  postgres.pathname = '/' + prefix + 'migration_test';
  env.TEST_MIGRATION_SOURCE_URL = postgres.href;
  const source = new Client({ connectionString: postgres.href });
  await source.connect();
  try {
    const migrations = path.join(repo, 'apps/api/prisma/migrations');
    for (const name of fs.readdirSync(migrations).sort()) {
      const file = path.join(migrations, name, 'migration.sql');
      if (fs.existsSync(file)) await source.query(fs.readFileSync(file, 'utf8'));
    }
  } finally { await source.end(); }
  const db = await maria.createConnection({ host: mysql.hostname, port: Number(mysql.port || 3306), user: decodeURIComponent(mysql.username), password: decodeURIComponent(mysql.password), multipleStatements: true });
  try {
    const databases = {
      TEST_DATABASE_URL: 'stock_test', TEST_CUSTOMERS_DATABASE_URL: 'customers_stock_test',
      TEST_PURCHASE_DATABASE_URL: 'purchases_test', TEST_PHYSICAL_DATABASE_URL: 'physical_test',
      TEST_IMPORT_DATABASE_URL: 'import_test', IMAGES_TEST_DATABASE_URL: 'images_stock_test',
      TEST_BACKUP_DATABASE_URL: 'backup_test', TEST_BACKUP_RESTORE_URL: 'backup_restore_test',
      TEST_COLLATION_DATABASE_URL: 'collation_test', TEST_MIGRATION_TARGET_URL: 'migration_test',
    };
    for (const [key, suffix] of Object.entries(databases)) {
      const name = prefix + suffix;
      await db.query('CREATE DATABASE ' + db.escapeId(name) + ' CHARACTER SET utf8mb4');
      mysql.pathname = '/' + name; env[key] = mysql.href;
      if (key !== 'TEST_BACKUP_RESTORE_URL') {
        await db.query('USE ' + db.escapeId(name));
        await db.query(fs.readFileSync(path.join(repo, 'apps/api/prisma/mysql-migrations/20261105000000_mysql_initial/migration.sql'), 'utf8'));
      }
    }
  } finally { await db.end(); }
  console.log('Bancos fictícios isolados com prefixo ' + prefix + ' (mantidos para inspeção).');
  const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['test'], { cwd: repo, env, stdio: 'inherit' });
  child.on('error', () => { console.error('Não foi possível iniciar pnpm test.'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
})().catch(() => { console.error('Preparação isolada falhou; verifique permissões, portas e URLs de teste em ambiente privado.'); process.exitCode = 1; });
