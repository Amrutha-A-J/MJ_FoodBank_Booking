import { apiFetch, jsonApiFetch } from '../client';
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
  API_BASE: 'http://localhost/api/v1',
  apiFetch: jest.fn(),
  jsonApiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('timesheets api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (jsonApiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('lists my timesheets', async () => {
    await listTimesheets();
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost/api/v1/timesheets/mine',
    );
  });

  it('lists all timesheets with optional staff filter', async () => {
    await listAllTimesheets();
    expect(apiFetch).toHaveBeenCalledWith('http://localhost/api/v1/timesheets');
    await listAllTimesheets(7);
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost/api/v1/timesheets?staffId=7',
    );
  });

  it('gets timesheet days', async () => {
    await getTimesheetDays(5);
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost/api/v1/timesheets/5/days',
    );
  });

  it('updates timesheet day', async () => {
    await updateTimesheetDay(3, '2024-01-02', {
      regHours: 7.5,
      otHours: 0,
      statHours: 0,
      sickHours: 0,
      vacHours: 0,
    });
    expect(jsonApiFetch).toHaveBeenCalledWith(
      'http://localhost/api/v1/timesheets/3/days/2024-01-02',
      expect.objectContaining({
        method: 'PATCH',
        body: {
          regHours: 7.5,
          otHours: 0,
          statHours: 0,
          sickHours: 0,
          vacHours: 0,
        },
      }),
    );
  });

  it('submits timesheet', async () => {
    await submitTimesheet(9);
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost/api/v1/timesheets/9/submit',
      {
        method: 'POST',
      },
    );
  });

  it('rejects timesheet', async () => {
    await rejectTimesheet(4);
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost/api/v1/timesheets/4/reject',
      {
        method: 'POST',
      },
    );
  });

  it('processes timesheet', async () => {
    await processTimesheet(6);
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost/api/v1/timesheets/6/process',
      {
        method: 'POST',
      },
    );
  });
});

