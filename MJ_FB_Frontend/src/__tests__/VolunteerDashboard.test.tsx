import { filterAvailableSlots } from '../utils/volunteer';
import type { VolunteerRole } from '../types';
import { toDate } from '../utils/date';

describe('filterAvailableSlots', () => {
  it('excludes shifts earlier than now on the same day', () => {
    const availability: VolunteerRole[] = [
      {
        id: 1,
        role_id: 1,
        name: 'Morning',
        start_time: '09:00:00',
        end_time: '11:00:00',
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: 'available',
        date: '2024-01-29',
        category_id: 1,
        category_name: 'Cat',
        is_wednesday_slot: false,
      },
      {
        id: 2,
        role_id: 1,
        name: 'Afternoon',
        start_time: '14:00:00',
        end_time: '16:00:00',
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: 'available',
        date: '2024-01-29',
        category_id: 1,
        category_name: 'Cat',
        is_wednesday_slot: false,
      },
    ];
    const now = toDate('2024-01-29T13:00:00');
    const result = filterAvailableSlots(availability, now);
    expect(result).toHaveLength(1);
    expect(result[0].start_time).toBe('14:00:00');
  });
});
