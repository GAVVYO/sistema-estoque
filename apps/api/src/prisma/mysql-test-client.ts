import mariadb, { type Connection } from 'mariadb';
import { mysqlOptions } from './mysql-adapter';

// Used only by opt-in integration tests to hold independent database row locks.
// Keep the pg-style result shape so assertions retain their original meaning.
export class Client {
  private connection?: Connection;
  constructor(private readonly options: { connectionString?: string }) {}
  async connect() {
    const url = new URL(this.options.connectionString!);
    if (url.protocol !== 'mysql:' || !['localhost', '127.0.0.1'].includes(url.hostname) || !/_test$/.test(url.pathname)) throw new Error('Use an isolated loopback MySQL test database.');
    this.connection = await mariadb.createConnection(mysqlOptions(url.href));
  }
  async query(text: string, values: unknown[] = []) {
    const args: unknown[] = [];
    const sql = text.replace(/\$(\d+)/g, (_, index) => { args.push(values[Number(index) - 1]); return '?'; }).replace(/::(?:uuid|int|numeric)/g, '');
    const result = await this.connection!.query(sql, args);
    return { rows: Array.isArray(result) ? result : [], rowCount: Array.isArray(result) ? result.length : Number(result.affectedRows) };
  }
  async end() { await this.connection?.end(); }
}
