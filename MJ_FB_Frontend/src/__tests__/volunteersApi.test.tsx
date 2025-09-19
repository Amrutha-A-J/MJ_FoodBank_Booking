import { apiFetch, handleResponse, jsonApiFetch } from '../api/client';
import {
  createVolunteerBookingForVolunteer,
  createRecurringVolunteerBookingForVolunteer,
  updateVolunteerTrainedAreas,
  getVolunteerMasterRoles,
  getMyRecurringVolunteerBookings,
  getRecurringVolunteerBookingsForVolunteer,
  updateVolunteerBookingStatus,
  cancelVolunteerBooking,
  getUnmarkedVolunteerBookings,
  createVolunteer,
  getVolunteerById,
  loginVolunteer,
  getVolunteerBookingsByRoles,
} from '../api/volunteers';

jest.mock('../api/client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  jsonApiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('volunteers api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (jsonApiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('creates volunteer booking for volunteer', async () => {
    await createVolunteerBookingForVolunteer(5, 3, '2024-01-01');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteer-bookings/staff',
      expect.objectContaining({
        method: 'POST',
        body: { volunteerId: 5, roleId: 3, date: '2024-01-01', force: false },
      }),
    );
  });

  it('creates volunteer booking with force', async () => {
    await createVolunteerBookingForVolunteer(5, 3, '2024-01-01', true);
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteer-bookings/staff',
      expect.objectContaining({
        method: 'POST',
        body: { volunteerId: 5, roleId: 3, date: '2024-01-01', force: true },
      }),
    );
  });

  it('updates volunteer trained areas', async () => {
    await updateVolunteerTrainedAreas(2, [1, 3]);
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteers/2/trained-areas',
      expect.objectContaining({
        method: 'PUT',
        body: { roleIds: [1, 3] },
      }),
    );
  });

  it('fetches volunteer by id', async () => {
    await getVolunteerById(7);
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/volunteers/7');
  });

  it('fetches volunteer master roles', async () => {
    await getVolunteerMasterRoles();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/volunteer-master-roles');
  });

  it('fetches unmarked volunteer bookings', async () => {
    await getUnmarkedVolunteerBookings();
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteer-bookings/unmarked',
    );
  });

  it('fetches recurring volunteer bookings', async () => {
    await getMyRecurringVolunteerBookings();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/volunteer-bookings/recurring');
  });

  it('logs in volunteer with email', async () => {
    await loginVolunteer('user@example.com', 'pass');
    expect(jsonApiFetch).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({
      method: 'POST',
      body: { email: 'user@example.com', password: 'pass' },
    }));
  });

  it('creates a volunteer', async () => {
    await createVolunteer(
      'John',
      'Doe',
      [1, 2],
      true,
      'a@b.com',
      '123',
      'Secret!1',
      false,
    );
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteers',
      expect.objectContaining({
        method: 'POST',
        body: {
          firstName: 'John',
          lastName: 'Doe',
          roleIds: [1, 2],
          onlineAccess: true,
          email: 'a@b.com',
          phone: '123',
          password: 'Secret!1',
          sendPasswordLink: false,
        },
      }),
    );
  });

  it('fetches volunteer bookings by roles', async () => {
    await getVolunteerBookingsByRoles([1, 2, 3]);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteer-bookings?roleIds=1,2,3',
    );
  });

  it('creates recurring volunteer booking for volunteer', async () => {
    (handleResponse as jest.Mock).mockResolvedValueOnce({
      recurringId: 1,
      successes: [
        {
          id: 10,
          status: 'approved',
          role_id: 3,
          date: '2024-01-01T00:00:00.000Z',
          start_time: '09:00:00',
          end_time: '12:00:00',
          role_name: 'Role',
        },
      ],
      skipped: [],
    });
    const result = await createRecurringVolunteerBookingForVolunteer(
      5,
      3,
      '2024-01-01',
      'weekly',
      [1, 3],
      '2024-02-01',
    );
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteer-bookings/recurring/staff',
      expect.objectContaining({
        method: 'POST',
        body: {
          volunteerId: 5,
          roleId: 3,
          startDate: '2024-01-01',
          pattern: 'weekly',
          daysOfWeek: [1, 3],
          endDate: '2024-02-01',
        },
      }),
    );
    expect(result.successes[0].date).toBe('2024-01-01');
  });

  it('fetches recurring volunteer bookings for volunteer', async () => {
    await getRecurringVolunteerBookingsForVolunteer(7);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteer-bookings/recurring/volunteer/7',
    );
  });

  it('updates volunteer booking status with reason', async () => {
    await updateVolunteerBookingStatus(7, 'cancelled', 'sick');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteer-bookings/7',
      expect.objectContaining({
        method: 'PATCH',
        body: { status: 'cancelled', reason: 'sick' },
      }),
    );
  });

  it('updates volunteer booking status to completed', async () => {
    await updateVolunteerBookingStatus(7, 'completed');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteer-bookings/7',
      expect.objectContaining({
        method: 'PATCH',
        body: { status: 'completed' },
      }),
    );
  });

  it('cancels volunteer booking with reason', async () => {
    await cancelVolunteerBooking(10, 'sick');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/volunteer-bookings/10/cancel',
      expect.objectContaining({
        method: 'PATCH',
        body: { reason: 'sick', type: 'volunteer shift' },
      }),
    );
  });

  it('normalizes ISO dates for volunteer role availability', async () => {
    (handleResponse as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '09:00:00',
        end_time: '10:00:00',
        max_volunteers: 3,
        booked: 0,
        available: 3,
        status: 'available',
        date: '2024-01-29T00:00:00.000Z',
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);
    const { getVolunteerRolesForVolunteer } = await import('../api/volunteers');
    const roles = await getVolunteerRolesForVolunteer('2024-01-29');
    expect(roles[0].date).toBe('2024-01-29');
  });

});
