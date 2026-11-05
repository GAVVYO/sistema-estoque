import mariadb from 'mariadb';
import { open } from 'node:fs/promises';
import { mysqlOptions } from '../prisma/mysql-adapter';

export async function exportMysql(connection: string, destination: string, timeoutMs: number) {
  const db = await mariadb.createConnection({ ...mysqlOptions(connection), dateStrings: true, autoJsonMap: false, connectTimeout: Math.min(15000, timeoutMs) });
  const file = await open(destination, 'w', 0o600);
  const timer = setTimeout(() => { void db.destroy(); }, timeoutMs);
  try {
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    const tables = await db.query<{ TABLE_NAME: string; ENGINE: string }[]>('SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE=\'BASE TABLE\' ORDER BY TABLE_NAME');
    if (!tables.length || tables.some(table => table.ENGINE !== 'InnoDB')) throw new Error('UNSUPPORTED_TABLE');
    await file.write('-- GAVYO MySQL consistent backup v1\nSET NAMES utf8mb4;\nSET SESSION sql_mode=\'STRICT_TRANS_TABLES,ONLY_FULL_GROUP_BY,ERROR_FOR_DIVISION_BY_ZERO,NO_ZERO_DATE,NO_ZERO_IN_DATE,NO_ENGINE_SUBSTITUTION,ANSI_QUOTES\';\nSET FOREIGN_KEY_CHECKS=0;\nSET time_zone=\'+00:00\';\n');
    for (const table of tables) {
      const name = db.escapeId(table.TABLE_NAME);
      const [ddl] = await db.query<Record<string, string>[]>('SHOW CREATE TABLE ' + name);
      await file.write(ddl['Create Table'] + ';\n');
      const columns = await db.query<{ COLUMN_NAME: string; EXTRA: string }[]>('SELECT COLUMN_NAME, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION', [table.TABLE_NAME]);
      const names = columns.filter(column => !/VIRTUAL GENERATED|STORED GENERATED/.test(column.EXTRA)).map(column => column.COLUMN_NAME);
      const list = names.map(name => db.escapeId(name)).join(',');
      // The stream is bounded by the driver backpressure, not the table size.
      for await (const row of db.queryStream('SELECT ' + list + ' FROM ' + name)) {
        const values = names.map(name => db.escape(row[name])).join(',');
        await file.write('INSERT INTO ' + name + ' (' + list + ') VALUES (' + values + ');\n');
      }
    }
    await db.commit();
    await file.write('SET FOREIGN_KEY_CHECKS=1;\n-- GAVYO BACKUP COMPLETE\n');
    await file.sync();
  } finally {
    clearTimeout(timer);
    await file.close();
    await db.end().catch(() => undefined);
  }
}

// Validation before publication detects truncated/incomplete exports. Actual
// restore and semantic comparison are a separate mandatory recovery drill.
export async function verifyMysqlArchive(path: string) {
  const file = await open(path, 'r');
  try {
    const info = await file.stat();
    if (info.size < 80) throw new Error('INVALID_ARCHIVE');
    const tail = Buffer.alloc(64);
    await file.read(tail, 0, tail.length, Math.max(0, info.size - tail.length));
    if (!tail.toString().endsWith('-- GAVYO BACKUP COMPLETE\n')) throw new Error('INVALID_ARCHIVE');
  } finally { await file.close(); }
}

export async function restoreMysqlArchive(connection: string, archive: string, expectedSha256: string) {
  const { createReadStream } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { createInterface } = await import('node:readline');
  const url = new URL(connection);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw new Error('Restaure primeiro em um banco novo e isolado terminado em _test.');
  await verifyMysqlArchive(archive);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(archive)) hash.update(chunk);
  if (hash.digest('hex') !== expectedSha256) throw new Error('Checksum divergente.');
  const db = await mariadb.createConnection(mysqlOptions(connection));
  try {
    const tables = await db.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    if (tables.length) throw new Error('O destino da restauração deve estar vazio.');
    const lines = createInterface({ input: createReadStream(archive), crlfDelay: Infinity });
    let statement = '';
    for await (const line of lines) {
      if (line.startsWith('--') || !line.trim()) continue;
      statement += line + '\n';
      if (line.endsWith(';')) { await db.query(statement); statement = ''; }
    }
    if (statement.trim()) throw new Error('Arquivo SQL incompleto.');
    const foreignKeys = await db.query<{ TABLE_NAME: string; COLUMN_NAME: string; REFERENCED_TABLE_NAME: string; REFERENCED_COLUMN_NAME: string; ORDINAL_POSITION: number }[]>('SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME,ORDINAL_POSITION FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL');
    for (const key of foreignKeys) {
      if (key.ORDINAL_POSITION !== 1) throw new Error('Constraint composta requer verificação adicional.');
      const table = db.escapeId(key.TABLE_NAME), column = db.escapeId(key.COLUMN_NAME);
      const parent = db.escapeId(key.REFERENCED_TABLE_NAME), parentColumn = db.escapeId(key.REFERENCED_COLUMN_NAME);
      const [result] = await db.query('SELECT COUNT(*) AS missing FROM ' + table + ' c LEFT JOIN ' + parent + ' p ON c.' + column + '=p.' + parentColumn + ' WHERE c.' + column + ' IS NOT NULL AND p.' + parentColumn + ' IS NULL');
      if (Number(result.missing)) throw new Error('Relação inválida após restauração.');
    }
  } finally { await db.end(); }
}
