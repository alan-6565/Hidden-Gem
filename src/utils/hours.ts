import { OpenHours } from '../types';

const DAY_NAMES: OpenHours['day'][] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Business hours are free text, so this accepts "21:00", "9:00", "9am",
// "9:30pm", "9 AM", etc. Returns null for anything it can't confidently
// parse, rather than silently producing NaN comparisons downstream.
function toMinutes(time: string): number | null {
  const match = time.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];
  if (minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }
  return hour * 60 + minute;
}

function getEntry(hours: OpenHours[], day: OpenHours['day']) {
  const entry = hours.find((h) => h.day === day);
  if (!entry) return null;
  const open = toMinutes(entry.open);
  const close = toMinutes(entry.close);
  if (open === null || close === null) return null;
  return { open, close };
}

// If the business is open right now, returns the clock-time minutes it
// closes at. An overnight range (e.g. 21:00-1:00, close <= open) rolls into
// the next day, so "today's" window can still be open after midnight, in
// which case it's actually found via yesterday's entry.
function currentlyOpenUntil(hours: OpenHours[], now: Date): number | null {
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const today = getEntry(hours, DAY_NAMES[now.getDay()]);
  if (today) {
    const overnight = today.close <= today.open;
    if (overnight ? minutesNow >= today.open : minutesNow >= today.open && minutesNow < today.close) {
      return today.close;
    }
  }

  const yesterday = getEntry(hours, DAY_NAMES[(now.getDay() + 6) % 7]);
  if (yesterday && yesterday.close <= yesterday.open && minutesNow < yesterday.close) {
    return yesterday.close;
  }

  return null;
}

export function isOpenNow(hours: OpenHours[], now: Date = new Date()): boolean {
  return currentlyOpenUntil(hours, now) !== null;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

export function getStatusLabel(hours: OpenHours[], now: Date = new Date()): string {
  const closesAt = currentlyOpenUntil(hours, now);
  if (closesAt !== null) {
    return `Open · Closes ${formatTime(closesAt)}`;
  }

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i <= 7; i++) {
    const dayIndex = (now.getDay() + i) % 7;
    const nextEntry = getEntry(hours, DAY_NAMES[dayIndex]);
    if (nextEntry && !(i === 0 && minutesNow >= nextEntry.open)) {
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[dayIndex];
      return `Closed · Opens ${label} ${formatTime(nextEntry.open)}`;
    }
  }
  return 'Hours unavailable';
}

// "15-20 min" → 20, "1 hr" → 60, "45" → 45. Takes the upper end of a range
// so a pickup slot is never earlier than the business said it could be ready.
export function parsePrepMinutes(prepTime: string | undefined): number | null {
  if (!prepTime) return null;
  const numbers = prepTime.match(/\d+(\.\d+)?/g);
  if (!numbers) return null;
  const value = Math.max(...numbers.map(Number));
  return Math.round(/h(ou)?r/i.test(prepTime) ? value * 60 : value);
}

export interface PickupSlot {
  // Stored as the order's pickup_time, e.g. "Today 5:15PM".
  label: string;
  // Minutes from midnight today; can run past 1440 for tomorrow.
  minutes: number;
}

const SLOT_STEP = 15;
const DEFAULT_PREP_MINUTES = 15;

// Every 15-minute pickup time from (now + prep time) through closing, for
// today and tomorrow, within the business's open hours. Overnight ranges are
// handled the same way as isOpenNow. Empty if hours are missing or closed.
export function getPickupSlots(
  hours: OpenHours[],
  prepTime: string | undefined,
  now: Date = new Date(),
): PickupSlot[] {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const prep = parsePrepMinutes(prepTime) ?? DEFAULT_PREP_MINUTES;
  const earliest = Math.ceil((minutesNow + prep) / SLOT_STEP) * SLOT_STEP;

  // Open windows as [start, end) in minutes relative to midnight today —
  // yesterday's overnight window, today's, and tomorrow's.
  const windows: [number, number][] = [];
  for (const offset of [-1, 0, 1]) {
    const entry = getEntry(hours, DAY_NAMES[(now.getDay() + 7 + offset) % 7]);
    if (!entry) continue;
    const start = offset * 1440 + entry.open;
    const end = offset * 1440 + (entry.close <= entry.open ? entry.close + 1440 : entry.close);
    windows.push([start, end]);
  }

  const horizon = 2 * 1440; // through end of tomorrow
  const slots = new Map<number, PickupSlot>(); // keyed by minutes: windows can overlap
  for (const [start, end] of windows) {
    let t = Math.max(Math.ceil(start / SLOT_STEP) * SLOT_STEP, earliest);
    for (; t < end && t < horizon; t += SLOT_STEP) {
      const dayOffset = Math.floor(t / 1440);
      const dayLabel =
        dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : DAY_NAMES[(now.getDay() + dayOffset) % 7];
      slots.set(t, { label: `${dayLabel} ${formatTime(t % 1440)}`, minutes: t });
    }
  }
  return [...slots.values()].sort((a, b) => a.minutes - b.minutes);
}
