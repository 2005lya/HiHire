import { db } from './db.js';

try {
    const tables = db
        .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ?
    `)
        .all('bookings');

    console.log(tables);
} finally {
    db.close();
}