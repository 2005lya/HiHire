import http from 'node:http';
import { createBookingHandler } from './services/booking-api.js';
import {
    saveBooking,
    getBookedRanges,
    getAllBookings,
    cancelBooking
} from './database/bookings.js';
import { sendBookingConfirmation } from './services/email.js';

const pickupAddress = process.env.PICKUP_ADDRESS;
const adminApiKey = process.env.ADMIN_API_KEY;

if (!pickupAddress) {
    throw new Error('PICKUP_ADDRESS is required');
}

if (!adminApiKey) {
    throw new Error('ADMIN_API_KEY is required');
}

const server = http.createServer(createBookingHandler({
    pickupAddress,
    adminApiKey,
    saveBooking,
    getBookedRanges,
    getAllBookings,
    cancelBooking,
    sendBookingConfirmation
}));

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
