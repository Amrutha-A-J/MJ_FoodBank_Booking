import { apiFetch, handleResponse } from '../api/client';
import {
  createVolunteerBookingForVolunteer,
  updateVolunteerTrainedAreas,
  getVolunteerMasterRoles,
  getMyRecurringVolunteerBookings,
  updateVolunteerBookingStatus,
  cancelVolunteerBooking,
  getVolunteerNoShowRanking,
  getUnmarkedVolunteerBookings,
} from '../api/volunteers';

jest.mock('../api/client', () => ({
  API_BASE: '/api',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('volunteers api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('creates volunteer booking for volunteer', async () => {
    await createVolunteerBookingForVolunteer(5, 3, '2024-01-01');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteer-bookings/staff',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ volunteerId: 5, roleId: 3, date: '2024-01-01' }),
      }),
    );
  });

  it('updates volunteer trained areas', async () => {
    await updateVolunteerTrainedAreas(2, [1, 3]);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteers/2/trained-areas',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ roleIds: [1, 3] }),
      }),
    );
  });

  it('fetches volunteer master roles', async () => {
    await getVolunteerMasterRoles();
    expect(apiFetch).toHaveBeenCalledWith('/api/volunteer-master-roles');
  });

  it('fetches unmarked volunteer bookings', async () => {
    await getUnmarkedVolunteerBookings();
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteer-bookings/unmarked',
    );
  });

  it('fetches recurring volunteer bookings', async () => {
    await getMyRecurringVolunteerBookings();
    expect(apiFetch).toHaveBeenCalledWith('/api/volunteer-bookings/recurring');
  });

  it('updates volunteer booking status with reason', async () => {
    await updateVolunteerBookingStatus(7, 'cancelled', 'sick');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteer-bookings/7',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled', reason: 'sick' }),
      }),
    );
  });

  it('updates volunteer booking status to completed', async () => {
    await updateVolunteerBookingStatus(7, 'completed');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteer-bookings/7',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      }),
    );
  });

  it('cancels volunteer booking with reason', async () => {
    await cancelVolunteerBooking(10, 'sick');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteer-bookings/10/cancel',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ reason: 'sick' }),
      }),
    );
  });

  it('fetches volunteer no-show ranking', async () => {
    await getVolunteerNoShowRanking();
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/volunteer-stats/no-show-ranking',
    );
  });
});
