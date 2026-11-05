import { Prisma } from '../generated/prisma/client';

type QueryClient = Pick<Prisma.TransactionClient, '$queryRaw'>;

// Identifiers come exclusively from call sites in the API, never request input.
// LOWER with a binary collation ignores case without collapsing accents.
export async function matchingIds(db: QueryClient, table: string, fields: string[], text: string) {
  const pattern = '%' + text.replace(/[!%_]/g, character => '!' + character).toLowerCase() + '%';
  const predicates = fields.map(field => Prisma.sql`LOWER(${Prisma.raw('"' + field + '"')}) LIKE ${pattern} ESCAPE '!'`);
  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM ${Prisma.raw('"' + table + '"')} WHERE ${Prisma.join(predicates, ' OR ')}`);
  return rows.map(row => row.id);
}
