import { Buffer } from 'node:buffer';
import { bookingConfirmationText } from '../services/booking-confirmation.js';

export async function sendGmailConfirmation(booking, pickupAddress, env) {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER } = env;

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_SENDER) {
        throw new Error('Gmail API is not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: GMAIL_CLIENT_ID,
            client_secret: GMAIL_CLIENT_SECRET,
            refresh_token: GMAIL_REFRESH_TOKEN,
            grant_type: 'refresh_token'
        }),
        signal: AbortSignal.timeout(10000)
    });

    if (!tokenResponse.ok) {
        throw new Error(`Gmail authorization failed (${tokenResponse.status})`);
    }

    const { access_token: accessToken } = await tokenResponse.json();
    if (!accessToken) {
        throw new Error('Google did not return an access token');
    }

    const body = Buffer.from(bookingConfirmationText(booking, pickupAddress))
        .toString('base64')
        .match(/.{1,76}/g)
        .join('\r\n');

    const message = [
        `From: HiHire <${GMAIL_SENDER}>`,
        `To: <${booking.email}>`,
        `Subject: HiHire booking confirmation - ${booking.productName}`,
        `Date: ${new Date().toUTCString()}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        body
    ].join('\r\n');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: Buffer.from(message).toString('base64url') }),
        signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
        throw new Error(`Gmail could not accept the confirmation email (${response.status})`);
    }
}
