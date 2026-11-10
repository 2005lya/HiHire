import { DatabaseSync } from 'node:sqlite';

const databaseUrl = new URL('./hihire.sqlite', import.meta.url);

export const db = new DatabaseSync(databaseUrl);

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    productId INTEGER NOT NULL,
    productName TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    pickupTime TEXT NOT NULL,
    rentalDays INTEGER NOT NULL CHECK (rentalDays > 0),
    rentalCost REAL NOT NULL CHECK (rentalCost >= 0),
    deposit REAL NOT NULL CHECK (deposit >= 0),
    total REAL NOT NULL CHECK (total >= 0),
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    createdAt TEXT NOT NULL
  );
`);

const bookingColumns = db
  .prepare('PRAGMA table_info(bookings)')
  .all();

if (!bookingColumns.some((column) => column.name === 'email')) {
  db.exec(`
    ALTER TABLE bookings
    ADD COLUMN email TEXT NOT NULL DEFAULT ''
  `);
}