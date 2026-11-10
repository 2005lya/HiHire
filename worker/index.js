import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import { createBookingHandler } from '../services/booking-api.js';
import { createD1Bookings } from './bookings.js';
import { sendGmailConfirmation } from './gmail.js';

const server = createServer(createBookingHandler({
    adminApiKey: env.ADMIN_API_KEY,
    pickupAddress: env.PICKUP_ADDRESS,
    ...createD1Bookings(env.DB),
    sendBookingConfirmation: (booking, pickupAddress) =>
        sendGmailConfirmation(booking, pickupAddress, env)
}));

export default httpServerHandler(server);
