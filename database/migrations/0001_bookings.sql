CREATE TABLE bookings (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL DEFAULT '',
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

CREATE INDEX bookings_confirmed_dates
ON bookings (productId, startDate, endDate)
WHERE status = 'confirmed';
