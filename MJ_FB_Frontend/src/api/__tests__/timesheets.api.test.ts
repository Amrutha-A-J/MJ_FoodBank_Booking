import { apiFetch, handleResponse } from '../client';
import {
  listTimesheets,
  listAllTimesheets,
  getTimesheetDays,
  updateTimesheetDay,
  submitTimesheet,
  rejectTimesheet,
  processTimesheet,
} from '../timesheets';

jest.mock('../client', () => ({
  API_BASE: '/api',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('timesheets api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('lists my timesheets', async () => {
    await listTimesheets();
    expect(apiFetch).toHaveBeenCalledWith('/api/timesheets/mine');
  });

  it('lists all timesheets with optional staff filter', async () => {
    await listAllTimesheets();
    expect(apiFetch).toHaveBeenCalledWith('/api/timesheets');
    await listAllTimesheets(7);
    expect(apiFetch).toHaveBeenCalledWith('/api/timesheets?staffId=7');
  });

  it('gets timesheet days', async () => {
    await getTimesheetDays(5);
    expect(apiFetch).toHaveBeenCalledWith('/api/timesheets/5/days');
  });

  it('updates timesheet day', async () => {
    await updateTimesheetDay(3, '2024-01-02', 7.5);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/timesheets/3/days/2024-01-02',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ hours: 7.5 }),
      }),
    );
  });

  it('submits timesheet', async () => {
    await submitTimesheet(9);
    expect(apiFetch).toHaveBeenCalledWith('/api/timesheets/9/submit', {
      method: 'POST',
    });
  });

  it('rejects timesheet', async () => {
    await rejectTimesheet(4);
    expect(apiFetch).toHaveBeenCalledWith('/api/timesheets/4/reject', {
      method: 'POST',
    });
  });

  it('processes timesheet', async () => {
    await processTimesheet(6);
    expect(apiFetch).toHaveBeenCalledWith('/api/timesheets/6/process', {
      method: 'POST',
    });
  });
});

