import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';

const dbPath = process.env.DB_PATH
  ?? (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const rawDb = drizzle(sqlite, { schema });

// Drizzle v0.45 : db.query.X.findMany/findFirst() retourne un SQLiteSyncRelationalQuery
// qui nécessite .sync() pour s'exécuter. Ce proxy l'appelle automatiquement.
const queryProxy = new Proxy((rawDb as any).query, {
  get(target, tableName: string) {
    const tableQuery = target[tableName];
    if (!tableQuery || typeof tableQuery !== 'object') return tableQuery;
    return new Proxy(tableQuery, {
      get(tableTarget: any, method: string) {
        const fn = tableTarget[method];
        if (typeof fn === 'function' && (method === 'findMany' || method === 'findFirst')) {
          return (...args: any[]) => fn.apply(tableTarget, args).sync();
        }
        return fn;
      },
    });
  },
});

export const db: typeof rawDb = Object.assign(Object.create(Object.getPrototypeOf(rawDb)), rawDb, { query: queryProxy });
export { sqlite };
