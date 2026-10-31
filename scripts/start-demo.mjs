// Inicializador da demo: contêiner isolado ou banco local criado por demo-mac.sh.
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync, spawn } from 'node:child_process';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = require('pg');
const mac = process.env.LAUNDRY_DEMO_MAC === '1';
const databaseUrl = mac ? process.env.DATABASE_URL : 'postgresql://demo:demo@postgres:5432/lavanderia_demo';
const database = new URL(databaseUrl ?? 'file:///');
if (mac ? !(database.protocol === 'postgresql:' && database.hostname === '127.0.0.1'
  && database.port === '55439' && database.pathname === '/lavanderia_demo' && database.username === 'demo')
  : process.env.DATABASE_URL !== databaseUrl) {
  throw new Error('Este inicializador aceita somente o banco isolado da demo (Docker ou demo-mac.sh).');
}

const settings = {
  DATABASE_URL: databaseUrl,
  API_PORT: '3000',
  WEB_ORIGIN: 'http://localhost:5173',
  VITE_API_URL: '/api',
  JWT_SECRET: mac ? process.env.JWT_SECRET : randomBytes(32).toString('hex'),
  NODE_ENV: 'development',
  BACKUP_AUTO_ENABLED: 'false',
  SEED_ADMIN_EMAIL: 'demo@lavanderia.local',
  SEED_ADMIN_PASSWORD: 'LavanderiaDemo123!',
};
Object.assign(process.env, settings);
if (!settings.JWT_SECRET || settings.JWT_SECRET.length < 32) throw new Error('JWT_SECRET da demo ausente.');
if (!mac) writeFileSync(new URL('../.env', import.meta.url),
  Object.entries(settings).map(([key, value]) => `${key}=${value}`).join('\n') + '\n',
  { mode: 0o600 });

function run(...args) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Falha ao executar pnpm ${args.join(' ')}`);
}

run('--filter', '@stock/api', 'db:deploy');
const client = new Client({ connectionString: databaseUrl });
await client.connect();
let initialized;
try {
  await client.query('CREATE TABLE IF NOT EXISTS "_LaundryDemo" (id integer PRIMARY KEY)');
  initialized = (await client.query('SELECT id FROM "_LaundryDemo" WHERE id = 1')).rowCount > 0;
  if (!initialized) {
    const { rows } = await client.query('SELECT count(*)::int AS count FROM "User"');
    if (rows[0].count !== 0) {
      throw new Error('Preparação anterior incompleta. Consulte docs/DEMO.md; nenhum dado foi apagado.');
    }
    run('db:seed');
    run('--filter', '@stock/api', 'db:demo');
    await client.query('INSERT INTO "_LaundryDemo" (id) VALUES (1)');
  }
} finally {
  await client.end();
}

console.info('\nDemo: http://localhost:5173');
console.info(`Login: ${settings.SEED_ADMIN_EMAIL} | Senha: ${settings.SEED_ADMIN_PASSWORD}\n`);
const app = spawn('pnpm', ['exec', 'concurrently', '--kill-others', '-n', 'api,web',
  'pnpm --filter @stock/api start',
  `pnpm --filter @stock/web exec vite preview --host ${mac ? '127.0.0.1' : '0.0.0.0'} --port 5173 --strictPort`],
  { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => app.kill(signal));
}
app.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
app.on('exit', (code) => { process.exitCode = code ?? 1; });
