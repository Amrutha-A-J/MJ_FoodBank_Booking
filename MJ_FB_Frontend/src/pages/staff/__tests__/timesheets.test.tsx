import { screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import Timesheets from '../timesheets';
import { MemoryRouter } from 'react-router-dom';

const mockSubmit = jest.fn();
const mockUpdate = jest.fn();
const mockUseTimesheets = jest.fn();
const defaultTimesheetDays = [
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
];

const defaultUseTimesheetDaysImplementation = () => ({
  days: defaultTimesheetDays,
  isLoading: false,
  error: null,
});

const mockUseTimesheetDays = jest.fn(defaultUseTimesheetDaysImplementation);
const mockUseAllTimesheets = jest.fn();
const mockSearchStaff = jest.fn();
const mockAdminSearchStaff = jest.fn();

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
  mockUseTimesheets.mockReturnValue({
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
  });
  mockUseTimesheetDays.mockClear();
  mockUseTimesheetDays.mockImplementation(defaultUseTimesheetDaysImplementation);
  mockUseAllTimesheets.mockClear();
  mockSearchStaff.mockClear();
  mockSearchStaff.mockResolvedValue([]);
  mockAdminSearchStaff.mockClear();
  mockAdminSearchStaff.mockResolvedValue([]);
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
    expect(within(paidCell).getByText('9')).toHaveStyle({
      color: 'rgb(148, 24, 24)',
    });
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
    expect(
      await screen.findByText(/OT bank remaining: 39/),
    ).toBeInTheDocument();
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
    mockUseTimesheets.mockImplementation(() => ({
      timesheets,
      isLoading: false,
      error: null,
    }));
    await act(async () => render());
    const tabs = await screen.findAllByRole('tab');
    expect(tabs).toHaveLength(10);
    expect(tabs[0]).toHaveTextContent('2024-03-01 - 2024-03-07');
    expect(tabs[9]).toHaveTextContent('2024-12-01 - 2024-12-07');
  });

  it('locks day when leave approved', async () => {
    const lockedDays = [
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
    ];
    mockUseTimesheetDays.mockImplementation(() => ({
      days: lockedDays,
      isLoading: false,
      error: null,
    }));
    await act(async () => render());
    const rows = await screen.findAllByRole('row');
    const leaveRow = rows[1];
    expect(within(leaveRow).getByTestId('LockIcon')).toBeInTheDocument();
    const inputs = within(leaveRow).getAllByRole('spinbutton');
    const vacInput = inputs[4];
    expect(vacInput).toBeDisabled();
    expect(
      within(leaveRow).getByLabelText(
        "Leave request locked; hours can't be changed",
      ),
    ).toBeInTheDocument();
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
    mockAdminSearchStaff.mockResolvedValueOnce([
      { id: 2, firstName: 'Alice', lastName: 'Smith', email: '', access: [] },
    ]);
    const adminTimesheets = {
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
    };
    const emptyAdminTimesheets = { timesheets: [], isLoading: false, error: null };
    mockUseAllTimesheets.mockImplementation((id?: number) =>
      id === 2 ? adminTimesheets : emptyAdminTimesheets,
    );
    const user = userEvent.setup();
    await act(async () => render('/admin/timesheet'));
    const input = await screen.findByLabelText('Staff');
    await user.type(input, 'Ali');
    const option = await screen.findByText('Alice Smith');
    await user.click(option);
    const lastCall = mockUseAllTimesheets.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(2);
    await user.click(
      await screen.findByRole('button', {
        name: '2024-01-01 - 2024-01-07',
      }),
    );
    await screen.findByText('Reject');
  });
});

