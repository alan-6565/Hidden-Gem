import { OpenHours } from '../types';

const DAY_NAMES: OpenHours['day'][] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function isOpenNow(hours: OpenHours[], now: Date = new Date()): boolean {
  const today = DAY_NAMES[now.getDay()];
  const entry = hours.find((h) => h.day === today);
  if (!entry) return false;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return minutesNow >= toMinutes(entry.open) && minutesNow < toMinutes(entry.close);
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

export function getStatusLabel(hours: OpenHours[], now: Date = new Date()): string {
  const today = DAY_NAMES[now.getDay()];
  const entry = hours.find((h) => h.day === today);

  if (entry && isOpenNow(hours, now)) {
    return `Open · Closes ${formatTime(entry.close)}`;
  }

  for (let i = 1; i <= 7; i++) {
    const dayIndex = (now.getDay() + i) % 7;
    const nextEntry = hours.find((h) => h.day === DAY_NAMES[dayIndex]);
    if (nextEntry) {
      const label = i === 1 ? 'Tomorrow' : DAY_NAMES[dayIndex];
      return `Closed · Opens ${label} ${formatTime(nextEntry.open)}`;
    }
  }
  return 'Hours unavailable';
}
