import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// Keep UTC timestamps and quoted identifiers independent of server defaults.
// A bounded pool leaves connections for deploy, backup and administration.
export function mysqlOptions(connection: string) {
  const url = new URL(connection);
  if (url.protocol !== 'mysql:') throw new Error('Use uma conexão mysql://.');
  return {
    host: url.hostname, port: Number(url.port || 3306),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)), connectionLimit: 5, timezone: 'Z',
    initSql: ["SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ONLY_FULL_GROUP_BY,ERROR_FOR_DIVISION_BY_ZERO,NO_ZERO_DATE,NO_ZERO_IN_DATE,NO_ENGINE_SUBSTITUTION,ANSI_QUOTES'", "SET SESSION time_zone = '+00:00'"],
    ...(url.searchParams.get('sslmode') === 'require' ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}

export function mysqlAdapter(connection: string) { return new PrismaMariaDb(mysqlOptions(connection)); }
