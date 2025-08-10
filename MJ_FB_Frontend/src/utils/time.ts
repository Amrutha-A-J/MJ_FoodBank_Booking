export function formatTime(time: string): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  let hour = parseInt(hStr, 10);
  const minute = mStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

export function formatHHMM(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}
