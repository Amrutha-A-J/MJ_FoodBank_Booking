import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../testUtils/renderWithProviders';
import Timesheets from '../timesheets';

jest.mock('../../../api/timesheets', () => ({
  useTimesheets: () => ({
    timesheets: [
      {
        id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        submitted_at: null,
        approved_at: null,
        total_hours: 0,
        expected_hours: 0,
        balance_hours: 0,
      },
    ],
    isLoading: false,
    error: null,
  }),
  useTimesheetDays: () => ({
    days: [
      {
        id: 1,
        timesheet_id: 1,
        work_date: '2024-01-01',
        expected_hours: 8,
        actual_hours: 0,
      },
    ],
    isLoading: false,
    error: null,
  }),
  useUpdateTimesheetDay: () => ({ mutate: jest.fn() }),
}));

describe('Timesheets', () => {
  it('renders table headers', () => {
    renderWithProviders(<Timesheets />);
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Reg')).toBeInTheDocument();
    expect(screen.getByText('OT')).toBeInTheDocument();
  });
});

