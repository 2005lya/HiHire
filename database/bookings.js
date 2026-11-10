import { db } from './db.js';

const findConflict = db.prepare(`
  SELECT id
  FROM bookings
  WHERE productId = ?
    AND status = 'confirmed'
    AND startDate <= ?
    AND endDate >= ?
  LIMIT 1
`);

const insertBooking = db.prepare(`
  INSERT INTO bookings (
    id,
    email,
    name,
    phone,
    productId,
    productName,
    startDate,
    endDate,
    pickupTime,
    rentalDays,
    rentalCost,
    deposit,
    total,
    currency,
    status,
    createdAt
  )
  VALUES (
    $id,
    $email,
    $name,
    $phone,
    $productId,
    $productName,
    $startDate,
    $endDate,
    $pickupTime,
    $rentalDays,
    $rentalCost,
    $deposit,
    $total,
    $currency,
    $status,
    $createdAt
  )
`);

const findBookedRanges = db.prepare(`
  SELECT startDate, endDate
  FROM bookings
  WHERE productId = ?
    AND status = 'confirmed'
  ORDER BY startDate
`);

export function saveBooking(booking) {
  db.exec('BEGIN IMMEDIATE');

  try {
    const conflict = findConflict.get(
      booking.productId,
      booking.endDate,
      booking.startDate
    );

    if (conflict) {
      db.exec('ROLLBACK');
      return false;
    }

    insertBooking.run(booking);

    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function getBookedRanges(productId) {
  return findBookedRanges.all(productId);
}

const findAllBookings = db.prepare(`
  SELECT
    id,
    name,
    phone,
    email,
    productId,
    productName,
    startDate,
    endDate,
    pickupTime,
    rentalDays,
    rentalCost,
    deposit,
    total,
    currency,
    status,
    createdAt
  FROM bookings
  ORDER BY startDate ASC, pickupTime ASC
`);

export function getAllBookings() {
  return findAllBookings.all();
}

const cancelBookingStatement = db.prepare(`
  UPDATE bookings
  SET status = 'cancelled'
  WHERE id = ?
    AND status = 'confirmed'
`);

export function cancelBooking(id) {
  const result = cancelBookingStatement.run(id);

  return result.changes > 0;
}