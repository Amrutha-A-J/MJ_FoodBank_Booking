import { screen, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import Timesheets from '../timesheets';
import { MemoryRouter } from 'react-router-dom';

const mockSubmit = jest.fn();
const mockUpdate = jest.fn();
const mockUseTimesheets = jest.fn();
const defaultTimesheetDays = {
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
} as const;
const mockUseTimesheetDays = jest.fn(() => defaultTimesheetDays);
const defaultTimesheetsResponse = {
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
} as const;

const mockUseAllTimesheets = jest.fn();
const mockSearchStaff = jest.fn();
const mockAdminSearchStaff = jest.fn();

const adminTimesheets = {
  timesheets: [
    {
      id: 1,
      staff_id: 2,
      start_date: '2024-01-01',
      end_date: '2024-01-07',
      submitted_at: '2024-01-08',
      approved_at: null,
      total_hours: 40,
      expected_hours: 40,
      balance_hours: 0,
      ot_hours: 0,
    },
  ],
  isLoading: false,
  error: null,
} as const;

const emptyAdminTimesheets = {
  timesheets: [],
  isLoading: false,
  error: null,
} as const;

jest.mock('../../../api/timesheets', () => ({
  useTimesheets: (...args: any[]) => mockUseTimesheets(...args),
  useAllTimesheets: (...args: any[]) => mockUseAllTimesheets(...args),
  useTimesheetDays: (...args: any[]) => (mockUseTimesheetDays as any)(...args),
  updateTimesheetDay: (...args: any[]) => mockUpdate(...args),
  useSubmitTimesheet: () => ({ mutateAsync: mockSubmit, isPending: false }),
  useRejectTimesheet: () => ({ mutate: jest.fn() }),
  useProcessTimesheet: () => ({ mutate: jest.fn() }),
}));

jest.mock('../../../api/staff', () => ({
  searchStaff: (...args: any[]) => mockSearchStaff(...args),
}));

jest.mock('../../../api/adminStaff', () => ({
  searchStaff: (...args: any[]) => mockAdminSearchStaff(...args),
}));
jest.mock('../../../api/leaveRequests', () => ({
  useCreateLeaveRequest: () => ({ mutate: jest.fn() }),
  useLeaveRequests: () => ({ requests: [], isLoading: false, error: null }),
  useApproveLeaveRequest: () => ({ mutate: jest.fn() }),
}));

beforeEach(() => {
  mockSubmit.mockClear();
  mockUpdate.mockClear();
  mockUpdate.mockResolvedValue(undefined);
  mockUseTimesheets.mockReset();
  mockUseTimesheets.mockImplementation(() => defaultTimesheetsResponse);
  mockUseTimesheetDays.mockReset();
  mockUseTimesheetDays.mockImplementation(() => defaultTimesheetDays);
  mockUseAllTimesheets.mockReset();
  mockSearchStaff.mockReset();
  mockAdminSearchStaff.mockReset();
});

function render(path = '/timesheet') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Timesheets />
    </MemoryRouter>,
  );
}

describe('Timesheets', () => {
  it('renders table headers', async () => {
    await act(async () => render());
    expect(await screen.findByText('Date')).toBeInTheDocument();
    expect(await screen.findByText('Reg')).toBeInTheDocument();
    expect(await screen.findByText('OT')).toBeInTheDocument();
  });

  it('prefills stat day and allows editing', async () => {
    await act(async () => render());
    const rows = await screen.findAllByRole('row');
    const statRow = rows[1];
    const statInput = within(statRow).getAllByRole('spinbutton')[2];
    expect(statInput).toHaveValue(8);
    expect(statInput).not.toBeDisabled();
  });

  it('shows hint when day total exceeds cap', async () => {
    const user = userEvent.setup();
    await act(async () => render());
    const rows = await screen.findAllByRole('row');
    const dayRow = rows[2];
    const regInput = within(dayRow).getAllByRole('spinbutton')[0];
    await user.clear(regInput);
    await user.type(regInput, '9');
    expect(regInput).toHaveAttribute('aria-invalid', 'true');
    const cells = within(dayRow).getAllByRole('cell');
    const paidCell = cells[cells.length - 1];
    const paidValue = within(paidCell).getByText('9');
    expect(paidValue).toHaveStyle('color: rgb(148, 24, 24)');
  });

  it('calculates footer summaries', async () => {
    await act(async () => render());
    const totalsRow = (await screen.findByText('Totals')).closest('tr')!;
    const cells = within(totalsRow).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('16');
    expect(cells[2]).toHaveTextContent('1');
    expect(cells[3]).toHaveTextContent('8');
    expect(cells[7]).toHaveTextContent('25');
    expect(await screen.findByText(/Expected: 24/)).toBeInTheDocument();
    expect(await screen.findByText(/Shortfall: -1/)).toBeInTheDocument();
    expect(await screen.findByText(/OT bank remaining: 39/i)).toBeInTheDocument();
  });

  it('submits timesheet', async () => {
    const user = userEvent.setup();
    await act(async () => render());
    await user.click(await screen.findByRole('button', { name: /submit/i }));
    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockSubmit).toHaveBeenCalledWith(1);
  });

  it('shows current and next four timesheet tabs with up to five previous', async () => {
    const timesheets = Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      staff_id: 1,
      start_date: `2024-${(i + 1).toString().padStart(2, '0')}-01`,
      end_date: `2024-${(i + 1).toString().padStart(2, '0')}-07`,
      submitted_at: null,
      approved_at: i < 7 ? '2024-01-01' : null,
      total_hours: 0,
      expected_hours: 0,
      balance_hours: 0,
      ot_hours: 0,
    }));
    const response = {
      timesheets,
      isLoading: false,
      error: null,
    } as const;
    mockUseTimesheets.mockImplementation(() => response);
    await act(async () => render());
    const tabs = await screen.findAllByRole('tab');
    expect(tabs).toHaveLength(10);
    expect(tabs[0]).toHaveTextContent('2024-03-01 - 2024-03-07');
    expect(tabs[9]).toHaveTextContent('2024-12-01 - 2024-12-07');
  });

  it('locks day when leave approved', async () => {
    const user = userEvent.setup();
    const leaveDayResponse = {
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
    } as const;
    mockUseTimesheetDays.mockImplementation(() => leaveDayResponse);
    await act(async () => render());
    const rows = await screen.findAllByRole('row');
    const leaveRow = rows[1];
    const lockIcon = within(leaveRow).getByTestId('LockIcon');
    expect(lockIcon).toBeInTheDocument();
    const inputs = within(leaveRow).getAllByRole('spinbutton');
    const vacInput = inputs[4];
    expect(vacInput).toBeDisabled();
    await user.hover(lockIcon);
    expect(
      await screen.findByText("Leave request locked; hours can't be changed"),
    ).toBeInTheDocument();
    await user.unhover(lockIcon);
  });

  it('shows select staff message for admin', async () => {
    mockUseAllTimesheets.mockReturnValue({
      timesheets: [],
      isLoading: false,
      error: null,
    });
    await act(async () => render('/admin/timesheet'));
    expect(await screen.findByText('Select staff')).toBeInTheDocument();
  });

  it('loads timesheets after selecting staff in admin', async () => {
    const staffResults = [
      { id: 2, firstName: 'Alice', lastName: 'Smith', email: '', access: [] },
    ] as const;
    mockAdminSearchStaff.mockResolvedValue(staffResults);
    mockUseAllTimesheets.mockImplementation((id?: number) =>
      id === 2 ? adminTimesheets : emptyAdminTimesheets,
    );
    const user = userEvent.setup();
    await act(async () => render('/admin/timesheet'));
    const input = await screen.findByLabelText('Staff');
    await user.type(input, 'Ali');
    await waitFor(() => expect(mockAdminSearchStaff).toHaveBeenCalled());
    const option = await screen.findByText('Alice Smith');
    await user.click(option);
    await waitFor(() =>
      expect(mockUseAllTimesheets).toHaveBeenCalledWith(
        2,
        expect.any(Number),
        expect.any(Number),
      ),
    );
    const accordionHeader = await screen.findByText('2024-01-01 - 2024-01-07');
    await user.click(accordionHeader);
    await screen.findByText('Reject');
  });
});

