import { toDate } from './date';
import type { VolunteerRole } from '../types';

export function filterAvailableSlots(
  availability: VolunteerRole[],
  now: Date,
  roleFilter?: string,
): VolunteerRole[] {
  const slots = availability.filter(a => {
    const slotStart = toDate(`${a.date}T${a.start_time}`);
    return a.status === 'available' && a.available > 0 && slotStart >= now;
  });
  return roleFilter ? slots.filter(s => String(s.role_id) === roleFilter) : slots;
}
