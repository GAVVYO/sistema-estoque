import { Prisma } from '../generated/prisma/client';
import { createHash } from 'node:crypto';
import { Client, types } from 'pg';
import mariadb from 'mariadb';
import { mysqlOptions } from '../prisma/mysql-adapter';

async function main() {
const sourceUrl = process.env.MIGRATION_SOURCE_URL;
const targetUrl = process.env.MIGRATION_TARGET_URL;
const apply = process.argv.includes('--apply');
if (!sourceUrl || !targetUrl) throw new Error('Defina MIGRATION_SOURCE_URL e MIGRATION_TARGET_URL explicitamente.');
const source = new URL(sourceUrl), target = new URL(targetUrl);
if (source.protocol !== 'postgresql:' || target.protocol !== 'mysql:') throw new Error('Origem PostgreSQL e destino MySQL obrigatórios.');
const isolated = [source, target].every(url => ['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.endsWith('_test'));
if (!isolated && !process.argv.includes('--approved-production-transfer=' + target.pathname.slice(1))) throw new Error('Destino não isolado requer aprovação específica e identificação explícita no argumento.');
if (apply && !process.argv.includes('--maintenance-ack')) throw new Error('Confirme suspensão das escritas e migrations do destino com --maintenance-ack.');
types.setTypeParser(1114, value => new Date(value.replace(' ', 'T') + 'Z'));
types.setTypeParser(1184, value => new Date(value));
const pg = new Client({ connectionString: sourceUrl });
const mysql = await mariadb.createConnection({ ...mysqlOptions(targetUrl), dateStrings: true, autoJsonMap: false });

function stable(value: unknown): string {
  if (value === null) return 'null';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (typeof value === 'object') return '{' + Object.entries(value!).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => JSON.stringify(key) + ':' + stable(val)).join(',') + '}';
  return JSON.stringify(value);
}
function normalized(value: unknown, type: string) {
  if (value === null) return null;
  if (['timestamp without time zone', 'timestamp with time zone'].includes(type)) return value instanceof Date ? value.toISOString() : new Date(String(value).replace(' ', 'T') + 'Z').toISOString();
  if (type === 'boolean') return Boolean(Number(value) || value === true);
  if (type === 'numeric') return String(value).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  if (['json', 'jsonb'].includes(type)) return typeof value === 'string' ? JSON.parse(value) : value;
  return value;
}
function fingerprint(rows: Record<string, unknown>[], columns: { column_name: string; data_type: string }[]) {
  return createHash('sha256').update(rows.map(row => stable(Object.fromEntries(columns.flatMap(column => [
    [column.column_name, normalized(row[column.column_name], column.data_type)],
    ...(['json', 'jsonb'].includes(column.data_type) ? [[column.column_name + '__sqlNull', Boolean(row[column.column_name + '__sqlNull'])]] : []),
  ])))).sort().join('\n')).digest('hex');
}
let stage = 'connect';
try {
  await pg.connect();
  await pg.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await mysql.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
  await mysql.beginTransaction();
  const { rows: tables } = await pg.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename");
  const { rows: edges } = await pg.query<{ child: string; parent: string }>("SELECT c.relname AS child, p.relname AS parent FROM pg_constraint f JOIN pg_class c ON c.oid=f.conrelid JOIN pg_class p ON p.oid=f.confrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE f.contype='f' AND n.nspname='public'");
  const ordered: string[] = [], pending = tables.map(row => row.tablename);
  while (pending.length) {
    const index = pending.findIndex(name => edges.filter(edge => edge.child === name && edge.parent !== name).every(edge => ordered.includes(edge.parent)));
    if (index < 0) throw new Error('Dependências cíclicas exigem revisão manual.');
    ordered.push(pending.splice(index, 1)[0]);
  }
  const report = [];
  // Validate the whole destination before the first INSERT. Never merge or upsert
  // existing business rows: either identical reexecution or an empty target.
  const snapshots = [];
  let nonempty = false, different = false;
  for (const table of ordered) {
    const { rows: columns } = await pg.query<{ column_name: string; data_type: string }>("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table]);
    const identifiers = columns.map(column => mysql.escapeId(column.column_name)).join(',');
    const jsonColumns = columns.filter(column => ['json', 'jsonb'].includes(column.data_type));
    const sourceColumns = columns.map(column => '"' + column.column_name + '"' + (['json', 'jsonb'].includes(column.data_type) ? '::text AS "' + column.column_name + '"' : '')).join(',');
    const sourceNulls = jsonColumns.map(column => ', "' + column.column_name + '" IS NULL AS "' + column.column_name + '__sqlNull"').join('');
    const targetNulls = jsonColumns.map(column => ', ' + mysql.escapeId(column.column_name) + ' IS NULL AS ' + mysql.escapeId(column.column_name + '__sqlNull')).join('');
    const sourceRows = (await pg.query('SELECT ' + sourceColumns + sourceNulls + ' FROM "' + table.replace(/"/g, '""') + '"')).rows;
    for (const row of sourceRows) for (const column of jsonColumns) {
      const raw = row[column.column_name];
      if (typeof raw !== 'string') continue;
      for (const match of raw.matchAll(/"(?:\\.|[^"\\])*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g)) {
        if (match[1] && (!Number.isFinite(Number(match[1])) || !new Prisma.Decimal(match[1]).eq(String(Number(match[1]))))) throw new Error('JSON contém número que não pode ser transferido sem perda.');
      }
    }
    const targetRows = await mysql.query('SELECT ' + identifiers + targetNulls + ' FROM ' + mysql.escapeId(table));
    const sourceHash = fingerprint(sourceRows, columns), targetHash = fingerprint(targetRows, columns);
    nonempty ||= targetRows.length > 0;
    different ||= sourceHash !== targetHash;
    snapshots.push({ table, columns, identifiers, targetNulls, sourceRows, sourceHash });
    report.push({ table, sourceCount: sourceRows.length, targetCount: targetRows.length, identical: sourceHash === targetHash });
  }
  if (nonempty && different) throw new Error('Destino contém dados conflitantes. Nenhuma linha foi transferida.');
  if (apply && different) {
    for (const snapshot of snapshots) {
      stage = 'insert:' + snapshot.table;
      for (const row of snapshot.sourceRows) {
        const values = snapshot.columns.map(column => {
          const value = row[column.column_name];
          if (value instanceof Date) return value.toISOString().slice(0, -1).replace('T', ' ');
          return ['json','jsonb'].includes(column.data_type) && !row[column.column_name + '__sqlNull'] ? (typeof value === 'string' ? value : JSON.stringify(value)) : value;
        });
        await mysql.query('INSERT INTO ' + mysql.escapeId(snapshot.table) + ' (' + snapshot.identifiers + ') VALUES (' + values.map(() => '?').join(',') + ')', values);
      }
      const rows = await mysql.query('SELECT ' + snapshot.identifiers + snapshot.targetNulls + ' FROM ' + mysql.escapeId(snapshot.table));
      stage = 'compare:' + snapshot.table;
      if (fingerprint(rows, snapshot.columns) !== snapshot.sourceHash) {
        const fields = snapshot.columns.filter(column => stable(normalized(rows[0]?.[column.column_name], column.data_type)) !== stable(normalized(snapshot.sourceRows[0]?.[column.column_name], column.data_type))).map(column => column.column_name);
        console.error(JSON.stringify({ table: snapshot.table, divergentFields: fields }));
        throw new Error('Fingerprint divergente em ' + snapshot.table);
      }
    }
    await mysql.commit();
  } else await mysql.rollback();
  await pg.query('COMMIT');
  // Fingerprints of private hashes and row contents are never printed.
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'check', targetDatabase: target.pathname.slice(1), reexecution: nonempty && !different, tables: report, verifiedAfterTransfer: apply }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ stage, code: (error as { code?: string }).code ?? 'VALIDATION', reason: error instanceof Error && error.message.startsWith('Fingerprint divergente') ? error.message : 'Transferência recusada' }));
  await pg.query('ROLLBACK').catch(() => undefined);
  await mysql.rollback().catch(() => undefined);
  throw new Error('Transferência recusada ou revertida. Confira destino, constraints, collations e conflitos em ambiente privado.');
} finally { await pg.end(); await mysql.end(); }

}
void main().catch(() => { console.error('Transferência não concluída. Consulte o procedimento e valide os destinos.'); process.exitCode = 1; });
