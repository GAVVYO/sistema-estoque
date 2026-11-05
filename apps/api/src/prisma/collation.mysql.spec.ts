import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { matchingIds } from './search';

const connection = process.env.TEST_COLLATION_DATABASE_URL;
test('real MySQL collations preserve case, accents, trailing spaces and exact barcode uniqueness', { skip: !connection }, async () => {
  const url = new URL(connection!);
  assert(url.protocol === 'mysql:' && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.endsWith('_test'));
  assert.notEqual(connection, process.env.DATABASE_URL);
  const db = new PrismaService(new ConfigService({ DATABASE_URL: connection }));
  const tag = randomUUID();
  try {
    const names = ['A', 'a', 'Á', 'A '];
    const categories = await Promise.all(names.map(name => db.category.create({ data: { name: tag + name } })));
    assert.equal(new Set(categories.map(row => row.id)).size, names.length);
    const codes = ['CODE', 'code', 'CÓDE', 'CODE '];
    const products = [];
    for (const [index, barcode] of codes.entries()) products.push(await db.product.create({ data: {
      sku: tag + '-' + index, barcode: tag + barcode, name: tag + (index === 0 ? 'ÁGUA' : 'AGUA'),
      categoryId: categories[0].id, unit: 'UNIT', minimumStock: '0',
    } }));
    await assert.rejects(db.product.create({ data: { sku: products[0].sku.toUpperCase(), name: 'Duplicate', categoryId: categories[0].id, unit: 'UNIT', minimumStock: '0' } }), (error: unknown) => (error as { code?: string }).code === 'P2002');
    for (const [index, barcode] of codes.entries()) assert.equal((await db.product.findUniqueOrThrow({ where: { barcode: tag + barcode } })).id, products[index].id);
    const accented = await matchingIds(db, 'Product', ['name'], tag + 'água');
    assert.deepEqual(accented, [products[0].id]);
    assert.equal((await matchingIds(db, 'Product', ['name'], tag + 'agua')).length, 3);
    const longUrl = 'https://example.test/' + 'a'.repeat(1000);
    await db.productImage.create({ data: { ownerId: randomUUID(), publicId: tag + '-a', url: longUrl } });
    await db.productImage.create({ data: { ownerId: randomUUID(), publicId: tag + '-b', url: longUrl + 'b' } });
    await assert.rejects(db.productImage.create({ data: { ownerId: randomUUID(), publicId: tag + '-c', url: longUrl } }), (error: unknown) => (error as { code?: string }).code === 'P2002');
    const [collation] = await db.$queryRaw<{ TABLE_COLLATION: string }[]>`SELECT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Product'`;
    assert.equal(collation.TABLE_COLLATION, 'utf8mb4_0900_bin');
  } finally { await db.$disconnect(); }
});
