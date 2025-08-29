import { apiFetch, handleResponse } from '../api/client';
import {
  createVolunteerBookingForVolunteer,
  updateVolunteerTrainedAreas,
  getVolunteerMasterRoles,
  getVolunteerStats,
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

  it('fetches volunteer stats', async () => {
    await getVolunteerStats();
    expect(apiFetch).toHaveBeenCalledWith('/api/volunteers/me/stats');
  });
});
