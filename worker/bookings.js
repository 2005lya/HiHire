export function createD1Bookings(db) {
    return {
        async saveBooking(booking) {
            // Check availability and write in a single statement to prevent overlapping bookings.
            const result = await db.prepare(`
                INSERT INTO bookings (
                    id, email, name, phone, productId, productName, startDate, endDate,
                    pickupTime, rentalDays, rentalCost, deposit, total, currency, status, createdAt
                )
                SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM bookings
                    WHERE productId = ?5
                      AND status = 'confirmed'
                      AND startDate <= ?8
                      AND endDate >= ?7
                )
            `).bind(
                booking.id, booking.email, booking.name, booking.phone, booking.productId,
                booking.productName, booking.startDate, booking.endDate, booking.pickupTime,
                booking.rentalDays, booking.rentalCost, booking.deposit, booking.total,
                booking.currency, booking.status, booking.createdAt
            ).run();

            return result.meta.changes === 1;
        },

        async getBookedRanges(productId) {
            const { results } = await db.prepare(`
                SELECT startDate, endDate
                FROM bookings
                WHERE productId = ? AND status = 'confirmed'
                ORDER BY startDate
            `).bind(productId).all();

            return results;
        },

        async getAllBookings() {
            const { results } = await db.prepare(`
                SELECT id, name, phone, email, productId, productName, startDate, endDate,
                       pickupTime, rentalDays, rentalCost, deposit, total, currency, status, createdAt
                FROM bookings
                ORDER BY startDate, pickupTime
            `).all();

            return results;
        },

        async cancelBooking(id) {
            const result = await db.prepare(`
                UPDATE bookings
                SET status = 'cancelled'
                WHERE id = ? AND status = 'confirmed'
            `).bind(id).run();

            return result.meta.changes === 1;
        }
    };
}
