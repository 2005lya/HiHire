import { useState } from 'react';

const cardClass = 'min-w-0 rounded-none border border-slate-200 bg-white p-4 shadow-sm sm:p-6';
const labelClass = 'text-sm font-medium text-slate-800';
const inputClass =
  'mt-1 block w-full min-w-0 rounded-none border border-slate-300 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600';
const buttonClass =
  'rounded-none px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButtonClass = buttonClass + ' bg-emerald-700 text-white enabled:hover:bg-emerald-800';
const secondaryButtonClass = buttonClass + ' border border-slate-300 bg-white text-slate-800 enabled:hover:bg-slate-100';
const cancelButtonClass = buttonClass + ' border border-red-200 text-red-700 enabled:hover:bg-red-50';
const errorClass = 'rounded-none bg-red-50 p-3 text-sm text-red-800';
const tableHeadingClass = 'px-4 py-3 font-semibold';
const tableCellClass = 'px-4 py-3 align-top';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  productId: '',
  startDate: '',
  endDate: '',
  pickupTime: '09:00'
};

export default function AdminPanel({ products, today }) {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function adminRequest(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        setAuthenticated(false);
        setBookings([]);
      }

      const errorMessage = Array.isArray(data.errors)
        ? data.errors.join('. ')
        : data.message || 'Request failed';

      throw new Error(errorMessage);
    }

    return data;
  }

  async function loadBookings() {
    const data = await adminRequest('/api/admin/bookings');
    setBookings(data.bookings);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await loadBookings();
      setAuthenticated(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setBusy(true);
    setError('');
    setMessage('');

    try {
      await loadBookings();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    setAdminKey('');
    setAuthenticated(false);
    setBookings([]);
    setForm(initialForm);
    setError('');
    setMessage('');
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => {
      const updatedForm = {
        ...previousForm,
        [name]: value
      };

      if (
        name === 'startDate' &&
        (!previousForm.endDate || previousForm.endDate < value)
      ) {
        updatedForm.endDate = value;
      }

      return updatedForm;
    });
  }

  async function handleCreateBooking(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      await adminRequest('/api/admin/bookings', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          productId: Number(form.productId)
        })
      });

      setForm(initialForm);
      setMessage('Booking created successfully.');

      await loadBookings();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(booking) {
    const confirmed = window.confirm(
      `Cancel the booking for ${booking.name}, ` +
      `${booking.startDate} to ${booking.endDate}?`
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await adminRequest(
        `/api/admin/bookings/${encodeURIComponent(booking.id)}/cancel`,
        { method: 'POST' }
      );

      setMessage('Booking cancelled successfully.');
      await loadBookings();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!authenticated) {
    return (
      <section className={cardClass + ' mx-auto w-full max-w-md'}>
        <h1 className="text-2xl font-bold tracking-tight">HiHire Admin</h1>

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          <div>
            <label htmlFor="adminKey" className={labelClass}>Admin password</label>
            <input
              id="adminKey"
              name="password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              required
            />
          </div>

          <button type="submit" className={primaryButtonClass + ' w-full'} disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {error && <p role="alert" className={errorClass + ' mt-4'}>{error}</p>}
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">HiHire Admin</h1>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButtonClass} onClick={handleRefresh} disabled={busy}>
            Refresh bookings
          </button>
          <button type="button" className={secondaryButtonClass} onClick={handleLogout} disabled={busy}>
            Sign out
          </button>
        </div>
      </header>

      {error && <p role="alert" className={errorClass}>{error}</p>}
      {message && (
        <p role="status" className="rounded-none bg-emerald-50 p-3 text-sm text-emerald-900">
          {message}
        </p>
      )}

      <section aria-labelledby="bookings-heading" className={cardClass}>
        <h2 id="bookings-heading" className="mb-4 text-xl font-semibold">Bookings</h2>

        <div
          role="region"
          aria-labelledby="bookings-heading"
          tabIndex={0}
          className="overflow-x-auto rounded-none border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                {['Customer', 'Phone', 'Email', 'Tool', 'Dates', 'Pickup', 'Rental', 'Deposit', 'Status', 'Action'].map(
                  (heading) => <th key={heading} scope="col" className={tableHeadingClass}>{heading}</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50">
                  <td className={tableCellClass + ' font-medium'}>{booking.name}</td>
                  <td className={tableCellClass + ' whitespace-nowrap'}>{booking.phone || '—'}</td>
                  <td className={tableCellClass}>{booking.email || '—'}</td>
                  <td className={tableCellClass}>{booking.productName}</td>
                  <td className={tableCellClass + ' whitespace-nowrap'}>
                    {booking.startDate} to {booking.endDate}
                  </td>
                  <td className={tableCellClass}>{booking.pickupTime}</td>
                  <td className={tableCellClass + ' whitespace-nowrap'}>
                    {booking.currency} {booking.rentalCost}
                  </td>
                  <td className={tableCellClass + ' whitespace-nowrap'}>
                    {booking.currency} {booking.deposit}
                  </td>
                  <td className={tableCellClass}>
                    <span className={
                      'inline-block rounded-none px-2.5 py-1 text-xs font-medium capitalize ' +
                      (booking.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-slate-100 text-slate-700')
                    }>
                      {booking.status}
                    </span>
                  </td>
                  <td className={tableCellClass}>
                    {booking.status === 'confirmed' && (
                      <button
                        type="button"
                        className={cancelButtonClass + ' whitespace-nowrap'}
                        disabled={busy}
                        onClick={() => handleCancel(booking)}
                      >
                        Cancel booking
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {bookings.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-600">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="manual-booking-heading" className={cardClass}>
        <h2 id="manual-booking-heading" className="text-xl font-semibold">Add a manual booking</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use this form for bookings received by phone or other channels.
        </p>

        <form onSubmit={handleCreateBooking} className="mt-5">
          <fieldset disabled={busy} className="grid min-w-0 gap-4 disabled:opacity-60 sm:grid-cols-2">
            <legend className="sr-only">Booking details</legend>

            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="manualProduct" className={labelClass}>Tool</label>
              <select
                id="manualProduct"
                name="productId"
                className={inputClass}
                value={form.productId}
                onChange={handleChange}
                required
              >
                <option value="">Select a tool</option>

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.currency} {product.dailyRate} per day
                  </option>
                ))}
              </select>
            </div>

            {[
              { name: 'name', label: 'Customer name', type: 'text' },
              { name: 'phone', label: 'Phone number (optional)', type: 'tel' },
              { name: 'email', label: 'Customer email (optional)', type: 'email' },
              { name: 'startDate', label: 'Start date', type: 'date' },
              { name: 'endDate', label: 'End date', type: 'date' },
              { name: 'pickupTime', label: 'Pickup time', type: 'time' }
            ].map((field) => (
              <div key={field.name} className="min-w-0">
                <label htmlFor={`manual-${field.name}`} className={labelClass}>
                  {field.label}
                </label>
                <input
                  id={`manual-${field.name}`}
                  name={field.name}
                  type={field.type}
                  className={inputClass}
                  value={form[field.name]}
                  onChange={handleChange}
                  min={
                    field.name === 'startDate'
                      ? today
                      : field.name === 'endDate'
                        ? form.startDate || today
                        : undefined
                  }
                  required={field.name !== 'phone' && field.name !== 'email'}
                />
              </div>
            ))}

            <div className="sm:col-span-2">
              <button type="submit" className={primaryButtonClass + ' w-full sm:w-auto'} disabled={products.length === 0}>
                {busy ? 'Please wait...' : 'Add booking'}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </section>
  );
}
