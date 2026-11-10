import { randomUUID, timingSafeEqual } from 'node:crypto';
import { products } from '../data/products.js';

export function createBookingHandler({
    adminApiKey,
    pickupAddress,
    saveBooking,
    getBookedRanges,
    getAllBookings,
    cancelBooking,
    sendBookingConfirmation
}) {
    function isAdmin(request) {
        const authorization = request.headers.authorization;

        if (!adminApiKey || !authorization?.startsWith('Bearer ')) {
            return false;
        }

        const providedKey = Buffer.from(authorization.slice(7));
        const expectedKey = Buffer.from(adminApiKey);

        return (
            providedKey.length === expectedKey.length &&
            timingSafeEqual(providedKey, expectedKey)
        );
    }

    function requireAdmin(request, response) {
        if (isAdmin(request)) {
            return true;
        }

        response.writeHead(401, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        });

        response.end(
            JSON.stringify({
                message: 'Admin authentication required'
            })
        );

        return false;
    }

    function isValidDate(value) {
        if (typeof value !== 'string') {
            return false;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
        }

        const date = new Date(`${value}T00:00:00Z`);

        return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value
        );
    }

    return async function handleRequest(request, response) {
        if (request.method === 'GET' && request.url === '/api/products') {
            response.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8'
            });

            response.end(JSON.stringify(products));
            return;
        }
        const url = new URL(request.url, 'http://localhost:3000');
        const match = url.pathname.match(/^\/api\/products\/(\d+)$/);

        if (request.method === 'GET' && match) {
            const productId = Number(match[1]);
            const product = products.find((item) => item.id === productId);

            if (!product) {
                response.writeHead(404, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

                response.end(
                    JSON.stringify({
                        message: 'Product not found'
                    })
                );

                return;
            }

            response.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8'
            });

            response.end(JSON.stringify(product));
            return;
        }

        if (
            request.method === 'POST' &&
            (
                url.pathname === '/api/bookings' ||
                url.pathname === '/api/admin/bookings'
            )
        ) {
            const isAdminBooking = url.pathname === '/api/admin/bookings';

            if (isAdminBooking && !requireAdmin(request, response)) {
                return;
            }

            if (!pickupAddress && !isAdminBooking) {
                response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ message: 'Online bookings are temporarily unavailable' }));
                return;
            }

            let body = '';

            for await (const chunk of request) {
                body += chunk;
            }

            let booking;

            try {
                booking = JSON.parse(body);
            } catch {
                response.writeHead(400, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

                response.end(
                    JSON.stringify({
                        message: 'Invalid JSON'
                    })
                );

                return;
            }

            if (
                booking === null ||
                typeof booking !== 'object' ||
                Array.isArray(booking)
            ) {
                response.writeHead(400, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

                response.end(
                    JSON.stringify({
                        message: 'Booking must be a JSON object'
                    })
                );

                return;
            }

            const { name, productId, startDate, endDate, pickupTime } = booking;
            const errors = [];

            const phone = typeof booking.phone === 'string' ? booking.phone.trim() : '';
            const email = typeof booking.email === 'string' ? booking.email.trim() : '';

            if (
                (!isAdminBooking || phone !== '') &&
                !/^\+?[\d ()-]{7,22}$/.test(phone)
            ) {
                errors.push('A valid phone number is required');
            }

            if (
                (!isAdminBooking || email !== '') &&
                (
                    email.length > 254 ||
                    !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)
                )
            ) {
                errors.push('A valid email address is required');
            }

            if (typeof name !== 'string' || name.trim().length === 0) {
                errors.push('Name is required');
            }

            const product = products.find((item) => item.id === productId);

            if (!product) {
                errors.push('Product not found');
            }

            const validDates = isValidDate(startDate) && isValidDate(endDate);

            if (!validDates) {
                errors.push('Valid dates in YYYY-MM-DD format are required');
            } else {
                const today = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'Pacific/Auckland',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(new Date());

                if (startDate < today) {
                    errors.push('Start date cannot be in the past');
                }

                if (endDate < startDate) {
                    errors.push('End date cannot be before start date');
                }
            }

            if (
                typeof pickupTime !== 'string' ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime)
            ) {
                errors.push('Pickup time must use HH:mm format');
            }

            if (errors.length > 0) {
                response.writeHead(400, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

                response.end(
                    JSON.stringify({
                        message: 'Validation failed',
                        errors
                    })
                );

                return;
            }

            const millisecondsPerDay = 24 * 60 * 60 * 1000;

            const rentalDays =
                (Date.parse(endDate) - Date.parse(startDate)) / millisecondsPerDay + 1;

            const rentalCost = rentalDays * product.dailyRate;
            const deposit = product.deposit;
            const total = rentalCost + deposit;



            const newBooking = {
                id: randomUUID(),
                email,
                name: name.trim(),
                phone,
                productId,
                productName: product.name,
                startDate,
                endDate,
                pickupTime,
                rentalDays,
                rentalCost,
                deposit,
                total,
                currency: product.currency,
                status: 'confirmed',
                createdAt: new Date().toISOString()
            };

            try {
                const saved = await saveBooking(newBooking);

                if (!saved) {
                    response.writeHead(409, {
                        'Content-Type': 'application/json; charset=utf-8'
                    });

                    response.end(
                        JSON.stringify({
                            message: 'This product is already booked for the selected dates'
                        })
                    );

                    return;
                }
            } catch (error) {
                console.error('Failed to save booking:', error);

                response.writeHead(500, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

                response.end(
                    JSON.stringify({
                        message: 'Unable to save booking. Please try again.'
                    })
                );

                return;
            }

            let emailStatus = 'not_requested';

            if (!isAdminBooking) {
                try {
                    await sendBookingConfirmation(newBooking, pickupAddress);
                    emailStatus = 'accepted';
                } catch (error) {
                    console.error('Booking email failed:', error.message);
                    emailStatus = 'failed';
                }
            }

            response.writeHead(201, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            });

            response.end(
                JSON.stringify({
                    message: 'Booking confirmed',
                    booking: {
                        id: newBooking.id,
                        email: newBooking.email,
                        emailStatus
                    }
                })
            );

            return;
        }

        const availabilityMatch = url.pathname.match(
            /^\/api\/products\/(\d+)\/availability$/
        );

        if (request.method === 'GET' && availabilityMatch) {
            const productId = Number(availabilityMatch[1]);
            const product = products.find((item) => item.id === productId);

            if (!product) {
                response.writeHead(404, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

                response.end(
                    JSON.stringify({
                        message: 'Product not found'
                    })
                );

                return;
            }

            let bookedRanges;

            try {
                bookedRanges = await getBookedRanges(productId);
            } catch (error) {
                console.error('Failed to load availability:', error);
                response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ message: 'Unable to load availability' }));
                return;
            }

            response.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8'
            });

            response.end(
                JSON.stringify({
                    productId,
                    bookedRanges
                })
            );

            return;
        }

        if (
            request.method === 'GET' &&
            url.pathname === '/api/admin/bookings'
        ) {
            if (!requireAdmin(request, response)) {
                return;
            }

            try {
                const bookings = await getAllBookings();

                response.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-store'
                });

                response.end(JSON.stringify({ bookings }));
            } catch (error) {
                console.error('Failed to load bookings:', error);

                response.writeHead(500, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-store'
                });

                response.end(
                    JSON.stringify({
                        message: 'Unable to load bookings'
                    })
                );
            }

            return;
        }

        const cancelBookingMatch = url.pathname.match(
            /^\/api\/admin\/bookings\/([a-f0-9-]+)\/cancel$/i
        );

        if (request.method === 'POST' && cancelBookingMatch) {
            if (!requireAdmin(request, response)) {
                return;
            }

            response.setHeader('Cache-Control', 'no-store');

            const bookingId = cancelBookingMatch[1];

            try {
                const cancelled = await cancelBooking(bookingId);

                if (!cancelled) {
                    response.writeHead(409, {
                        'Content-Type': 'application/json; charset=utf-8'
                    });

                    response.end(
                        JSON.stringify({
                            message: 'Booking does not exist or is no longer confirmed'
                        })
                    );

                    return;
                }

                response.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

                response.end(
                    JSON.stringify({
                        message: 'Booking cancelled',
                        bookingId,
                        status: 'cancelled'
                    })
                );
            } catch (error) {
                console.error('Failed to cancel booking:', error);

                response.writeHead(500, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

                response.end(
                    JSON.stringify({
                        message: 'Unable to cancel booking'
                    })
                );
            }

            return;
        }


        response.writeHead(404, {
            'Content-Type': 'application/json; charset=utf-8'
        });

        response.end(
            JSON.stringify({
                message: 'Route not found'
            })
        );
    };
}
