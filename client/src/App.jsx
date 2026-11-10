import { useEffect, useState } from 'react';
import BookingCalendar from './components/BookingCalendar';
import AdminPanel from './components/AdminPanel';

const bookingInputClass =
  'mt-1 block w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600';

const bookingLabelClass = 'text-sm font-medium text-slate-800';
const errorClass = 'rounded-none bg-red-50 p-3 text-sm text-red-800';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
const [bookingError, setBookingError] = useState('');
const [confirmedBooking, setConfirmedBooking] = useState(null);
const [bookedRanges, setBookedRanges] = useState([]);
const [availabilityLoading, setAvailabilityLoading] = useState(false);
const [availabilityError, setAvailabilityError] = useState('');
const [availabilityVersion, setAvailabilityVersion] = useState(0);
const [showAdmin, setShowAdmin] = useState(false);

const [form, setForm] = useState({
  name: '',
  phone: '',
  email: '',
  startDate: '',
  endDate: '',
  pickupTime: '09:00'
});

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch('/api/products', {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('Failed to load products');
        }

        const data = await response.json();
        setProducts(data);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, []);

  useEffect(() => {
  if (selectedProductId === null) {
    return;
  }

  const controller = new AbortController();

  async function loadAvailability() {
    setAvailabilityLoading(true);
    setAvailabilityError('');
    setBookedRanges([]);

    try {
      const response = await fetch(
        `/api/products/${selectedProductId}/availability`,
        {
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load availability');
      }

      const data = await response.json();
      setBookedRanges(data.bookedRanges);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setAvailabilityError(error.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setAvailabilityLoading(false);
      }
    }
  }

  loadAvailability();

  return () => controller.abort();
}, [selectedProductId, availabilityVersion]);

  function handleChange(event) {
  const { name, value } = event.target;

  setForm((previousForm) => ({
    ...previousForm,
    [name]: value
  }));
}

const selectedProduct = products.find(
  (product) => product.id === selectedProductId
);

let rentalDays = 0;

if (
  form.startDate &&
  form.endDate &&
  form.endDate >= form.startDate
) {
  rentalDays =
    (Date.parse(form.endDate) - Date.parse(form.startDate)) /
      (24 * 60 * 60 * 1000) +
    1;
}

const rentalCost = selectedProduct
  ? rentalDays * selectedProduct.dailyRate
  : 0;

const total = selectedProduct
  ? rentalCost + selectedProduct.deposit
  : 0;

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Pacific/Auckland',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

async function handleSubmit(event) {
  event.preventDefault();

  if (
  !selectedProduct ||
  submitting ||
  rentalDays < 1 ||
  availabilityLoading ||
  availabilityError ||
  hasDateConflict
) {
  return;
}

  setSubmitting(true);
  setBookingError('');
  setConfirmedBooking(null);

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...form,
        productId: selectedProduct.id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        setAvailabilityLoading(true);
        setAvailabilityVersion((version) => version + 1);
      }

      const message = Array.isArray(data.errors)
        ? data.errors.join('. ')
        : data.message || 'Booking failed';

      throw new Error(message);
    }

    setConfirmedBooking(data.booking);
    setForm((previousForm) => ({
      ...previousForm,
      startDate: '',
      endDate: ''
    }));
    setAvailabilityLoading(true);
    setAvailabilityVersion((version) => version + 1);
  } catch (error) {
    setBookingError(error.message);
  } finally {
    setSubmitting(false);
  }
}

const hasDateConflict = Boolean(
  form.startDate &&
    form.endDate &&
    bookedRanges.some((range) => {
      return (
        range.startDate <= form.endDate &&
        range.endDate >= form.startDate
      );
    })
);
  if (showAdmin) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl bg-slate-50 px-4 py-8 text-left text-slate-900 scheme-light sm:px-8">
        <button
          type="button"
          className="mb-6 rounded-none border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          onClick={() => {
            setShowAdmin(false);
            setAvailabilityVersion((version) => version + 1);
          }}
        >
          Back to rental page
        </button>

        <AdminPanel products={products} today={today} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1126px] bg-slate-50 px-4 py-8 text-left text-slate-900 scheme-light sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-full text-center">
          <h1 className="m-0">
            <img
              src="/hihire-waving-hand-logo.png"
              alt="HiHire"
              width={2172}
              height={724}
              className="mx-auto block h-auto w-56 max-w-full sm:w-64"
            />
          </h1>
          <p className="text-sm text-slate-600">Hiring tools is as easy as saying hi.</p>
        </div>

        <button
          type="button"
          className="rounded-none border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          onClick={() => setShowAdmin(true)}
        >
          Admin
        </button>
      </header>

      <h2 className="mb-4 text-2xl font-semibold text-slate-900">Available tools</h2>

      {loading && <p className="text-slate-600">Loading products...</p>}
      {error && <p role="alert" className={errorClass}>{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <article
            key={product.id}
            className="flex flex-col gap-2 rounded-none border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="font-medium">
              {product.currency} {product.dailyRate} per day
            </p>
            <p className="text-sm text-slate-600">
              Deposit: {product.currency} {product.deposit}
            </p>
            <button
              type="button"
              aria-pressed={selectedProductId === product.id}
              className={`mt-3 w-fit rounded-none px-4 py-2 text-sm font-semibold ${
                selectedProductId === product.id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
              onClick={() => {
                if (selectedProductId === product.id) {
                  return;
                }

                setAvailabilityLoading(true);
                setBookedRanges([]);
                setAvailabilityError('');
                setSelectedProductId(product.id);
                setConfirmedBooking(null);
                setBookingError('');

                setForm((previousForm) => ({
                  ...previousForm,
                  startDate: '',
                  endDate: ''
                }));
              }}
            >
              {selectedProductId === product.id ? 'Selected' : 'Select tool'}
            </button>
          </article>
        ))}
      </div>

      {selectedProduct && (
        <section className="mt-8 rounded-none border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            Book {selectedProduct.name}
          </h2>

          {availabilityLoading && (
            <p className="text-sm text-slate-600">Checking availability...</p>
          )}
          {availabilityError && (
            <p role="alert" className={errorClass}>{availabilityError}</p>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p>
              <label htmlFor="name" className={bookingLabelClass}>Your name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                className={bookingInputClass}
                value={form.name}
                onChange={handleChange}
                required
              />
            </p>

            <p>
              <label htmlFor="phone" className={bookingLabelClass}>Phone number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+64211234567"
                className={bookingInputClass}
                value={form.phone}
                onChange={handleChange}
                required
              />
            </p>

            <p>
              <label htmlFor="email" className={bookingLabelClass}>Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="you@example.com"
                className={bookingInputClass}
                value={form.email}
                onChange={handleChange}
                required
              />
              <small className="mt-1 block text-sm text-slate-600">
                Your booking confirmation and pickup details will be sent here.
              </small>
            </p>

            <BookingCalendar
              key={selectedProduct.id}
              today={today}
              startDate={form.startDate}
              endDate={form.endDate}
              bookedRanges={bookedRanges}
              disabled={availabilityLoading || Boolean(availabilityError) || submitting}
              onChange={(startDate, endDate) => {
                setBookingError('');
                setForm((previousForm) => ({
                  ...previousForm,
                  startDate,
                  endDate
                }));
              }}
            />

            <p>
              <label htmlFor="pickupTime" className={bookingLabelClass}>
                Pickup time on start date
              </label>
              <input
                id="pickupTime"
                name="pickupTime"
                type="time"
                className={bookingInputClass}
                value={form.pickupTime}
                onChange={handleChange}
                required
              />
            </p>

            {rentalDays > 0 && (
              <div className="space-y-1 rounded-none border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <h3 className="text-base font-semibold">Estimated cost</h3>
                <p>Rental days: {rentalDays}</p>
                <p>Rental: {selectedProduct.currency} {rentalCost}</p>
                <p>
                  Refundable deposit: {selectedProduct.currency}{' '}
                  {selectedProduct.deposit}
                </p>
                <p className="font-semibold">
                  Total including deposit: {selectedProduct.currency} {total}
                </p>
              </div>
            )}

            {hasDateConflict && !bookingError && (
              <p role="alert" className={errorClass}>
                Your selected dates overlap an existing booking.
                Please choose different dates.
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-none bg-emerald-700 px-5 py-3 font-semibold text-white enabled:hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              disabled={
                submitting ||
                rentalDays < 1 ||
                availabilityLoading ||
                Boolean(availabilityError) ||
                hasDateConflict
              }
            >
              {submitting ? 'Submitting...' : 'Confirm booking'}
            </button>

            {bookingError && <p role="alert" className={errorClass}>{bookingError}</p>}
          </form>

          {confirmedBooking && (
            <section
              aria-live="polite"
              className="mt-6 space-y-2 rounded-none border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
            >
              <h3 className="text-lg font-semibold">Booking confirmed</h3>
              <p>Booking reference: {confirmedBooking.id}</p>

              {confirmedBooking.emailStatus === 'accepted' ? (
                <p>
                  Your booking confirmation and pickup details have been
                  submitted for delivery to {confirmedBooking.email}.
                  Please check your inbox and spam folder.
                </p>
              ) : (
                <p role="alert" className={errorClass}>
                  Your booking has been saved, but the confirmation email
                  could not be sent. Please contact HiHire with your booking
                  reference. Do not submit another booking.
                </p>
              )}
            </section>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
