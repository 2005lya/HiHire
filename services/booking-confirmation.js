export function bookingConfirmationText(booking, pickupAddress) {
    return [
        `Hello ${booking.name},`,
        '',
        'Your HiHire booking is confirmed.',
        '',
        `Booking ID: ${booking.id}`,
        `Tool: ${booking.productName}`,
        `Start date: ${booking.startDate}`,
        `End date: ${booking.endDate}`,
        `Rental days: ${booking.rentalDays}`,
        `Pickup time on start date: ${booking.pickupTime}`,
        'Timezone: Pacific/Auckland',
        `Pickup address: ${pickupAddress}`,
        '',
        `Rental: ${booking.currency} ${booking.rentalCost}`,
        `Deposit: ${booking.currency} ${booking.deposit}`,
        `Total including deposit: ${booking.currency} ${booking.total}`,
        '',
        'Thank you for choosing HiHire.'
    ].join('\n');
}
