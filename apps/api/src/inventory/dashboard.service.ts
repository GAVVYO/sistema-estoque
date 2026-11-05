import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { movementInclude, productInclude } from './inventory.service';

import { midnight, timezone } from './operational-time';

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async summary(periodDays = 7) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
    const todayDate = `${parts.year}-${parts.month}-${parts.day}`;
    const dates = Array.from({ length: periodDays + 1 }, (_, index) => new Date(Date.parse(todayDate + 'T12:00:00Z') + (index - periodDays + 1) * 86400000).toISOString().slice(0, 10));
    const bounds = dates.map(midnight);
    return this.db.$transaction(async tx => {
      const [raw] = await tx.$queryRaw<Array<Record<string, string | number | bigint>>> `
        SELECT CAST(COALESCE(sum("stock"),0) AS CHAR) AS units, count(*) AS products,
          COALESCE(sum("stock" > "minimumStock"),0) AS normal,
          COALESCE(sum("stock" > 0 AND "stock" <= "minimumStock"),0) AS low,
          COALESCE(sum("stock" <= 0),0) AS "out",
          CAST(COALESCE(sum("stock" * "costPrice"),0) AS CHAR) AS "costValue",
          COALESCE(sum("costPrice" IS NULL),0) AS "productsWithoutCost"
        FROM "Product" WHERE active = true`;
      const metrics = { units: String(raw.units), products: Number(raw.products), normal: Number(raw.normal), low: Number(raw.low), out: Number(raw.out), costValue: String(raw.costValue), productsWithoutCost: Number(raw.productsWithoutCost) };
      const [counts] = await tx.$queryRaw<Array<{ entries: bigint; exits: bigint; adjustments: bigint }>>`
        SELECT COALESCE(sum(type = 'ENTRY'),0) AS entries, COALESCE(sum(type = 'EXIT'),0) AS exits,
          COALESCE(sum(type IN ('ADJUSTMENT_IN','ADJUSTMENT_OUT')),0) AS adjustments
        FROM "StockMovement" WHERE "createdAt" >= ${bounds[periodDays - 1]} AND "createdAt" < ${bounds[periodDays]}`;
      const today = { entries: Number(counts.entries), exits: Number(counts.exits), adjustments: Number(counts.adjustments) };
      const dayCase = Prisma.sql`CASE ${Prisma.join(dates.slice(0, -1).map((date, index) => Prisma.sql`WHEN "createdAt" >= ${bounds[index]} AND "createdAt" < ${bounds[index + 1]} THEN ${date}`), ' ')} END`;
      const grouped = await tx.$queryRaw<Array<{ date: string; entries: string; exits: string; entryRecords: bigint; exitRecords: bigint }>>(Prisma.sql`
        SELECT ${dayCase} AS date,
          CAST(COALESCE(sum(CASE WHEN type='ENTRY' THEN quantity ELSE 0 END),0) AS CHAR) AS entries,
          CAST(COALESCE(sum(CASE WHEN type='EXIT' THEN quantity ELSE 0 END),0) AS CHAR) AS exits,
          sum(type='ENTRY') AS "entryRecords", sum(type='EXIT') AS "exitRecords"
        FROM "StockMovement" WHERE "createdAt" >= ${bounds[0]} AND "createdAt" < ${bounds[periodDays]}
        GROUP BY date ORDER BY date`);
      const days = dates.slice(0, -1).map(date => {
        const item = grouped.find(item => item.date === date);
        return { date, entries: item?.entries ?? '0', exits: item?.exits ?? '0', entryRecords: Number(item?.entryRecords ?? 0), exitRecords: Number(item?.exitRecords ?? 0) };
      });
      const priorities = await tx.product.findMany({ where: { active: true, stock: { lte: this.db.product.fields.minimumStock } }, include: productInclude, orderBy: [{ stock: 'asc' }, { name: 'asc' }], take: 8 });
      const recent = await tx.stockMovement.findMany({ include: movementInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5 });
      const categoryRows = await tx.$queryRaw<Array<{ id: string; name: string; products: bigint }>>`
        SELECT c.id, c.name, count(p.id) AS products FROM "Category" c
        JOIN "Product" p ON p."categoryId" = c.id AND p.active = true
        GROUP BY c.id, c.name ORDER BY count(p.id) DESC, c.name ASC, c.id ASC`;
      const categories = categoryRows.map(item => ({ ...item, products: Number(item.products) }));
      return { ...metrics, today, days, priorities, recent, categories, periodDays, from: days[0].date, to: days[days.length - 1].date, timezone };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
