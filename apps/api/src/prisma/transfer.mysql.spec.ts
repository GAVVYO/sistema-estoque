import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import mariadb from 'mariadb';
import { mysqlOptions, mysqlAdapter } from './mysql-adapter';
import { PrismaClient } from '../generated/prisma/client';

const source = process.env.TEST_MIGRATION_SOURCE_URL, target = process.env.TEST_MIGRATION_TARGET_URL;
test('real PostgreSQL to MySQL transfer, exact values, retries and refusal to merge', { skip: !source || !target }, async () => {
  for (const value of [source!, target!]) {
    const url = new URL(value);
    assert(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.endsWith('_migration_test'));
    assert.notEqual(value, process.env.DATABASE_URL);
  }
  const pg = new Client({ connectionString: source });
  const my = await mariadb.createConnection({ ...mysqlOptions(target!), dateStrings: true });
  await pg.connect();
  const id = randomUUID(), category = randomUUID(), product = randomUUID(), customer = randomUUID(), movement = randomUUID();
  const run = (apply = false) => spawnSync(process.execPath, [require.resolve('tsx/cli'), 'src/tools/transfer-database.ts', ...(apply ? ['--apply', '--maintenance-ack'] : [])], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, MIGRATION_SOURCE_URL: source, MIGRATION_TARGET_URL: target },
  });
  try {
    assert.equal((await pg.query('SELECT count(*)::int AS count FROM "User"')).rows[0].count, 0);
    assert.equal(Number((await my.query('SELECT count(*) AS count FROM "User"'))[0].count), 0);
    await pg.query('INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6)', [id, 'Migration QA', 'migration@test.local', 'fixture-argon-hash-preserved', 'ADMIN', '2026-10-23T12:34:56.123Z']);
    await pg.query('INSERT INTO "Category" (id,name,"updatedAt") VALUES ($1,$2,$3)', [category, 'Água e água ', '2026-10-23T12:34:56.123Z']);
    await pg.query('INSERT INTO "Customer" (id,code,name,"updatedAt") VALUES ($1,$2,$3,now())', [customer, 'CLI-MIGRATION', 'Nome atual']);
    await pg.query('INSERT INTO "Product" (id,sku,barcode,name,"categoryId",unit,stock,"minimumStock","costPrice","salePrice","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,$10)', [product, 'ÁGUA', '0000123 ', 'Água de teste', category, 'KG', '99.125', '0.125', '12345678901234.56', '2026-10-23T12:34:56.123Z']);
    await pg.query('INSERT INTO "StockMovement" (id,"productId","userId",type,quantity,"previousStock","resultingStock",reason,"customerId","buyerIdentification","customerNameSnapshot","customerCodeSnapshot") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [movement, product, id, 'EXIT', '1', '100.125', '99.125', 'SALE', customer, 'IDENTIFIED', 'Nome da época', 'CLI-MIGRATION']);
    const check = run(); assert.equal(check.status, 0, check.stderr);
    assert.equal(Number((await my.query('SELECT count(*) AS count FROM "Product"'))[0].count), 0);
    const apply = run(true); assert.equal(apply.status, 0, apply.stderr);
    const [row] = await my.query('SELECT p.*,u."passwordHash",m."customerNameSnapshot" FROM "Product" p JOIN "StockMovement" m ON m."productId"=p.id JOIN "User" u ON u.id=m."userId" WHERE p.id=?', [product]);
    assert.equal(row.stock, '99.125'); assert.equal(row.costPrice, '12345678901234.56'); assert.equal(row.salePrice, null);
    assert.equal(row.barcode, '0000123 '); assert.equal(row.passwordHash, 'fixture-argon-hash-preserved'); assert.equal(row.customerNameSnapshot, 'Nome da época');
    assert.equal(row.updatedAt, '2026-10-23 12:34:56.123');
    // Verify the application's adapter reads and writes UTC independently of the host timezone.
    const app = new PrismaClient({ adapter: mysqlAdapter(target!) });
    try {
      assert.equal((await app.product.findUniqueOrThrow({ where: { id: product } })).updatedAt.toISOString(), '2026-10-23T12:34:56.123Z');
      await app.product.update({ where: { id: product }, data: { updatedAt: new Date('2026-10-23T12:34:56.123Z') } });
      assert.equal((await my.query('SELECT updatedAt FROM Product WHERE id=?', [product]))[0].updatedAt, '2026-10-23 12:34:56.123');
    } finally { await app.$disconnect(); }
    const repeat = run(true); assert.equal(repeat.status, 0, repeat.stderr); assert.equal(JSON.parse(repeat.stdout).reexecution, true);
    await my.query('UPDATE "Product" SET name=? WHERE id=?', ['Conflito proposital', product]);
    const conflict = run(true); assert.notEqual(conflict.status, 0);
    assert.equal((await my.query('SELECT name FROM "Product" WHERE id=?', [product]))[0].name, 'Conflito proposital');
  } finally { await pg.end(); await my.end(); }
});
