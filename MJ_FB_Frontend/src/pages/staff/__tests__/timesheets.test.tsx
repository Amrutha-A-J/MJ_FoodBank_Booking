import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import Timesheets from '../timesheets';
import { MemoryRouter } from 'react-router-dom';

const mockSubmit = jest.fn();
const mockUpdate = jest.fn();
const mockUseTimesheetDays = jest.fn(() => ({
  days: [
    {
      id: 1,
      timesheet_id: 1,
      work_date: '2024-01-01',
      expected_hours: 8,
      reg_hours: 0,
      ot_hours: 0,
      stat_hours: 8,
      sick_hours: 0,
      vac_hours: 0,
      note: null,
      locked_by_rule: true,
      locked_by_leave: false,
    },
    {
      id: 2,
      timesheet_id: 1,
      work_date: '2024-01-02',
      expected_hours: 8,
      reg_hours: 8,
      ot_hours: 0,
      stat_hours: 0,
      sick_hours: 0,
      vac_hours: 0,
      note: null,
      locked_by_rule: false,
      locked_by_leave: false,
    },
    {
      id: 3,
      timesheet_id: 1,
      work_date: '2024-01-03',
      expected_hours: 8,
      reg_hours: 8,
      ot_hours: 1,
      stat_hours: 0,
      sick_hours: 0,
      vac_hours: 0,
      note: null,
      locked_by_rule: false,
      locked_by_leave: false,
    },
  ],
  isLoading: false,
  error: null,
}));
const mockUseAllTimesheets = jest.fn();
const mockSearchStaff = jest.fn();

jest.mock('../../../api/timesheets', () => ({
  useTimesheets: () => ({
    timesheets: [
      {
        id: 1,
        staff_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        submitted_at: null,
        approved_at: null,
        total_hours: 0,
        expected_hours: 0,
        balance_hours: 0,
        ot_hours: 0,
      },
    ],
    isLoading: false,
    error: null,
  }),
  useAllTimesheets: (...args: any[]) => mockUseAllTimesheets(...args),
  useTimesheetDays: (...args: any[]) => mockUseTimesheetDays(...args),
  useUpdateTimesheetDay: () => ({ mutate: mockUpdate }),
  useSubmitTimesheet: () => ({ mutate: mockSubmit }),
  useRejectTimesheet: () => ({ mutate: jest.fn() }),
  useProcessTimesheet: () => ({ mutate: jest.fn() }),
}));

jest.mock('../../../api/staff', () => ({
  searchStaff: (...args: any[]) => mockSearchStaff(...args),
}));

beforeEach(() => {
  mockSubmit.mockClear();
  mockUpdate.mockClear();
  mockUseTimesheetDays.mockClear();
  mockUseAllTimesheets.mockClear();
  mockSearchStaff.mockClear();
});

function render(path = '/timesheet') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Timesheets />
    </MemoryRouter>,
  );
}

describe('Timesheets', () => {
  it('renders table headers', () => {
    render();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Reg')).toBeInTheDocument();
    expect(screen.getByText('OT')).toBeInTheDocument();
  });

  it('handles empty timesheet days without crashing', () => {
    mockUseTimesheetDays.mockReturnValueOnce({
      days: [],
      isLoading: false,
      error: null,
    });
    expect(() => render()).not.toThrow();
  });

  it('prefills stat day and allows editing', () => {
    render();
    const rows = screen.getAllByRole('row');
    const statRow = rows[1];
    const statInput = within(statRow).getAllByRole('spinbutton')[2];
    expect(statInput).toHaveValue(8);
    expect(statInput).not.toBeDisabled();
  });

  it('shows hint when day total exceeds cap', async () => {
    const user = userEvent.setup();
    render();
    const rows = screen.getAllByRole('row');
    const dayRow = rows[2];
    const regInput = within(dayRow).getAllByRole('spinbutton')[0];
    await user.clear(regInput);
    await user.type(regInput, '9');
    expect(regInput).toHaveAttribute('aria-invalid', 'true');
    const cells = within(dayRow).getAllByRole('cell');
    const paidCell = cells[cells.length - 1];
    expect(paidCell.style.color).toBe('rgb(211, 47, 47)');
  });

  it('calculates footer summaries', () => {
    render();
    const totalsRow = screen.getByText('Totals').closest('tr')!;
    const cells = within(totalsRow).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('16');
    expect(cells[2]).toHaveTextContent('1');
    expect(cells[3]).toHaveTextContent('8');
    expect(cells[7]).toHaveTextContent('25');
    expect(screen.getByText(/Expected Hours: 24/)).toBeInTheDocument();
    expect(screen.getByText(/Shortfall: -1/)).toBeInTheDocument();
    expect(screen.getByText(/OT Bank Remaining: 39/)).toBeInTheDocument();
  });

  it('submits timesheet', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(mockSubmit).toHaveBeenCalledWith(1);
  });

  it('locks day when leave approved', () => {
    mockUseTimesheetDays.mockReturnValueOnce({
      days: [
        {
          id: 1,
          timesheet_id: 1,
          work_date: '2024-02-01',
          expected_hours: 8,
          reg_hours: 0,
          ot_hours: 0,
          stat_hours: 0,
          sick_hours: 0,
          vac_hours: 8,
          note: null,
          locked_by_rule: false,
          locked_by_leave: true,
        },
      ],
      isLoading: false,
      error: null,
    });
    render();
    const rows = screen.getAllByRole('row');
    const leaveRow = rows[1];
    expect(within(leaveRow).getByTestId('LockIcon')).toBeInTheDocument();
    const inputs = within(leaveRow).getAllByRole('spinbutton');
    const vacInput = inputs[4];
    expect(vacInput).toBeDisabled();
    expect(screen.getByText('Leave day is locked')).toBeInTheDocument();
  });

  it('shows select staff message for admin', () => {
    mockUseAllTimesheets.mockReturnValue({
      timesheets: [],
      isLoading: false,
      error: null,
    });
    render('/admin/timesheet');
    expect(screen.getByText('Select Staff')).toBeInTheDocument();
  });

  it('loads timesheets after selecting staff in admin', async () => {
    mockSearchStaff.mockResolvedValueOnce([{ id: 2, name: 'Alice' }]);
    mockUseAllTimesheets.mockImplementation((id?: number) =>
      id === 2
        ? {
            timesheets: [
              {
                id: 10,
                staff_id: 2,
                start_date: '2024-01-01',
                end_date: '2024-01-07',
                submitted_at: '2024-01-02',
                approved_at: null,
                total_hours: 0,
                expected_hours: 0,
                balance_hours: 0,
                ot_hours: 0,
              },
            ],
            isLoading: false,
            error: null,
          }
        : { timesheets: [], isLoading: false, error: null },
    );
    const user = userEvent.setup();
    render('/admin/timesheet');
    const input = screen.getByLabelText('Staff');
    await user.type(input, 'Ali');
    const option = await screen.findByText('Alice');
    await user.click(option);
    expect(mockUseAllTimesheets).toHaveBeenLastCalledWith(2);
    await screen.findByText('Reject');
  });
});

