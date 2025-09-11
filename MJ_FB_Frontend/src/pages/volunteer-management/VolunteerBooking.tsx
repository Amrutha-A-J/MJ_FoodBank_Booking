import { useCallback } from 'react';
import BookingUI from '../BookingUI';
import { getVolunteerRolesForVolunteer, requestVolunteerBooking } from '../../api/volunteers';
import type { VolunteerRole, Slot } from '../../types';

export default function VolunteerBooking() {
  const fetchSlots = useCallback(
    (date: string) => getVolunteerRolesForVolunteer(date),
    [],
  );

  const mapSlot = useCallback(
    (r: VolunteerRole): (Slot & { name: string }) => ({
      id: String(r.id),
      startTime: r.start_time,
      endTime: r.end_time,
      available: r.available,
      reason: r.status === 'blocked' ? r.status : undefined,
      name: r.name || r.role_name,
    }),
    [],
  );

  const groupByRole = useCallback(
    (slots: (Slot & { name: string })[]) => {
      return slots.reduce<Record<string, Slot[]>>((acc, s) => {
        const key = s.name;
        acc[key] = acc[key] ? [...acc[key], s] : [s];
        return acc;
      }, {});
    },
    [],
  );

  const bookAction = useCallback(
    ({ slotId, date }: { slotId: string; date: string; note: string }) =>
      requestVolunteerBooking(Number(slotId), date),
    [],
  );

  return (
    <BookingUI
      slotFetcher={fetchSlots}
      mapSlot={mapSlot}
      bookingAction={bookAction}
      groupSlots={groupByRole}
    />
  );
}
