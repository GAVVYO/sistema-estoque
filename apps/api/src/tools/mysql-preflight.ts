import mariadb from 'mariadb';
import { mysqlOptions } from '../prisma/mysql-adapter';

async function main() {
  const url = process.env.MYSQL_PREFLIGHT_URL;
  if (!url) throw new Error('Defina MYSQL_PREFLIGHT_URL explicitamente.');
  const db = await mariadb.createConnection(mysqlOptions(url));
  try {
    const [server] = await db.query('SELECT VERSION() AS version, @@version_comment AS engine, @@sql_mode AS sqlMode, @@time_zone AS timeZone, @@max_allowed_packet AS maxPacket, @@max_connections AS maxConnections');
    const collations = await db.query("SHOW COLLATION WHERE Collation IN ('utf8mb4_nopad_bin','utf8mb4_0900_bin')");
    const maria = server.version.includes('MariaDB');
    const version = server.version.match(/^(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number);
    if (!version || (maria ? version[0] < 10 || (version[0] === 10 && version[1] < 6) : version[0] < 8 || (version[0] === 8 && version[1] === 0 && version[2] < 17))) throw new Error('Versão não suportada.');
    const required = maria ? 'utf8mb4_nopad_bin' : 'utf8mb4_0900_bin';
    if (!collations.some((row: { Collation: string }) => row.Collation === required)) throw new Error('Collation binária NO PAD ausente.');
    console.log(JSON.stringify({ version: server.version, engine: server.engine, sqlMode: server.sqlMode, timeZone: server.timeZone, maxPacket: Number(server.maxPacket), maxConnections: Number(server.maxConnections), requiredCollation: required }, null, 2));
  } finally { await db.end(); }
}
void main().catch(() => { console.error('Preflight não concluído. Confira versão, collation, permissões e conexão em ambiente privado.'); process.exitCode = 1; });
