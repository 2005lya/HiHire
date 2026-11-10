import nodemailer from 'nodemailer';
import { bookingConfirmationText } from './booking-confirmation.js';

const port = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
});

export async function sendBookingConfirmation(booking, pickupAddress) {
    if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS ||
        !process.env.MAIL_FROM
    ) {
        throw new Error('Email service is not configured');
    }

    const text = bookingConfirmationText(booking, pickupAddress);

    const result = await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: {
            address: booking.email,
            name: booking.name
        },
        subject: `HiHire booking confirmation - ${booking.productName}`,
        text
    });

    if (!result.accepted?.length) {
        throw new Error('The email recipient was not accepted');
    }
}