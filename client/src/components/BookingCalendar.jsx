import { useState } from 'react';


function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function overlapsBooking(startDate, endDate, bookedRanges) {
  return bookedRanges.some((range) => {
    return range.startDate <= endDate && range.endDate >= startDate;
  });
}

export default function BookingCalendar({
  today,
  startDate,
  endDate,
  bookedRanges,
  disabled,
  onChange
}) {
  const [month, setMonth] = useState(() => {
    const date = parseDate(today);

    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const [selectingEnd, setSelectingEnd] = useState(false);

  const firstDay = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  );

  const firstCell = new Date(firstDay);

  // Start the calendar week on Monday.
  const offset = (firstDay.getDay() + 6) % 7;
  firstCell.setDate(firstCell.getDate() - offset);

  const dates = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);

    return date;
  });

  const currentMonth = today.slice(0, 7);
  const displayedMonth = formatDate(month).slice(0, 7);

  function changeMonth(amount) {
    setMonth(
      new Date(
        month.getFullYear(),
        month.getMonth() + amount,
        1
      )
    );
  }

  function selectDate(value) {
    if (!selectingEnd || !startDate || value < startDate) {
      onChange(value, value);
      setSelectingEnd(true);
      return;
    }

    onChange(startDate, value);
    setSelectingEnd(false);
  }

  const monthButtonClass =
  'rounded-none border border-slate-200 bg-white px-3 py-2 text-sm enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500';

  return (
    <section className="mx-auto my-6 w-full max-w-[560px] rounded-none border border-slate-200 bg-white p-4 text-slate-900" aria-label="Rental calendar">
      <div className="flex items-center justify-between gap-2">
        <button
        className={monthButtonClass}
          type="button"
          aria-label="Previous month"
          disabled={displayedMonth <= currentMonth}
          onClick={() => changeMonth(-1)}
        >
          Previous
        </button>

        <h3 aria-live="polite">
          {month.toLocaleDateString('en-NZ', {
            month: 'long',
            year: 'numeric'
          })}
        </h3>

        <button
        className={monthButtonClass}
          type="button"
          aria-label="Next month"
          onClick={() => changeMonth(1)}
        >
          Next
        </button>
      </div>

      <p aria-live="polite">
        {disabled
          ? 'Calendar unavailable while availability is being checked.'
          : selectingEnd
            ? 'Choose an end date. Choose the same date for one day.'
            : 'Choose a start date.'}
      </p>

      <div className="mb-2 mt-4 grid grid-cols-7 gap-1 text-center text-xs text-slate-600" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
          (day) => <span key={day}>{day}</span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const value = formatDate(date);
          const outsideMonth = date.getMonth() !== month.getMonth();
          const past = value < today;

          const booked = overlapsBooking(
            value,
            value,
            bookedRanges
          );

          const crossesBooking = Boolean(
            selectingEnd &&
              startDate &&
              value >= startDate &&
              overlapsBooking(startDate, value, bookedRanges)
          );

          const unavailable =
            disabled ||
            outsideMonth ||
            past ||
            booked ||
            crossesBooking;

          const selected = Boolean(
            startDate &&
              endDate &&
              value >= startDate &&
              value <= endDate
          );

          let dayColors = 'border-slate-200 bg-white text-slate-900 enabled:hover:bg-emerald-50';

if (booked) {
  dayColors = 'border-slate-300 bg-slate-200 text-slate-600';
} else if (past || crossesBooking) {
  dayColors = 'border-slate-200 bg-slate-50 text-slate-500';
} else if (selected) {
  dayColors = 'border-emerald-700 bg-emerald-700 text-white enabled:hover:bg-emerald-800';
}

const classes = [
  'flex min-h-[54px] min-w-0 flex-col items-center justify-center rounded-none border px-0 py-1 text-sm',
  'enabled:cursor-pointer disabled:cursor-not-allowed',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
  dayColors,
  outsideMonth && 'invisible',
  value === today && 'inset-ring-2 inset-ring-emerald-600'
].filter(Boolean).join(' ');

          const label = booked
            ? `${value}: booked`
            : crossesBooking
              ? `${value}: rental would overlap a booking`
              : value;

          return (
            <button
              key={value}
              type="button"
              className={classes}
              disabled={unavailable}
              aria-label={label}
              aria-pressed={selected}
              aria-current={value === today ? 'date' : undefined}
              title={label}
              onClick={() => selectDate(value)}
            >
              {date.getDate()}
              {booked && <small className="text-[9px]">Booked</small>}
            </button>
          );
        })}
      </div>

      <div className="my-4 flex flex-wrap gap-4 text-sm">
  <span className="inline-flex items-center gap-2">
    <span aria-hidden="true" className="size-3 rounded-none bg-slate-200" />
    Booked
  </span>

  <span className="inline-flex items-center gap-2">
    <span aria-hidden="true" className="size-3 rounded-none bg-emerald-700" />
    Selected
  </span>
</div>

      <p>
        Start: {startDate || 'Not selected'}
        <br />
        End: {endDate || 'Not selected'}
      </p>
    </section>
  );
}