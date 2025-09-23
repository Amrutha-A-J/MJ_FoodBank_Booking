import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import Maintenance from '../Maintenance';

jest.mock('../../../api/maintenance', () => ({
  getMaintenanceSettings: jest.fn().mockResolvedValue({ maintenanceMode: false, upcomingNotice: '' }),
  updateMaintenanceSettings: jest.fn().mockResolvedValue(undefined),
  clearMaintenanceStats: jest.fn().mockResolvedValue(undefined),
  vacuumDatabase: jest.fn().mockResolvedValue({ message: 'Vacuum started' }),
  vacuumTable: jest.fn().mockResolvedValue({ message: 'Table vacuum started' }),
  getVacuumDeadRows: jest.fn(),
  getVacuumDeadRowTables: jest
    .fn()
    .mockImplementation(response => response.deadRows?.map((item: any) => item.table) ?? []),
  purgeOldRecords: jest.fn().mockResolvedValue({
    success: true,
    cutoff: '2023-12-31',
    purged: [
      { table: 'bookings', months: ['2023-01', '2023-02'] },
      { table: 'client_visits', months: ['2023-01'] },
    ],
  }),
}));

jest.mock('@mui/x-date-pickers', () => {
  const TextField = require('@mui/material/TextField').default;
  const { default: dayjs } = require('../../../utils/date');
  return {
    LocalizationProvider: ({ children }: any) => <>{children}</>,
    DatePicker: ({ label, value, onChange, slotProps }: any) => (
      <TextField
        label={label}
        value={value ? value.format('YYYY-MM-DD') : ''}
        onChange={e => onChange(e.target.value ? dayjs(e.target.value) : null)}
        {...(slotProps?.textField || {})}
      />
    ),
  };
});

import {
  getMaintenanceSettings,
  updateMaintenanceSettings,
  clearMaintenanceStats,
  vacuumDatabase,
  vacuumTable,
  getVacuumDeadRows,
  purgeOldRecords,
} from '../../../api/maintenance';

const getVacuumDeadRowsMock = getVacuumDeadRows as jest.Mock;

describe('Maintenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getVacuumDeadRowsMock.mockImplementation((table?: string) => {
      if (table === 'orders') {
        return Promise.resolve({
          deadRows: [{ table: 'orders', deadRows: 5 }],
        });
      }
      return Promise.resolve({
        deadRows: [
          { table: 'users', deadRows: 10 },
          { table: 'orders', deadRows: 5 },
        ],
      });
    });
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders and handles actions', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Maintenance />
      </ThemeProvider>
    );

    await waitFor(() => expect(getMaintenanceSettings).toHaveBeenCalled());
    const switchEl = screen.getByRole('switch', { name: /maintenance mode/i });
    fireEvent.click(switchEl);
    fireEvent.change(screen.getByLabelText(/upcoming notice/i), { target: { value: 'Soon' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateMaintenanceSettings).toHaveBeenCalledWith({
        maintenanceMode: true,
        upcomingNotice: 'Soon',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear Maintenance Stats' }));
    await waitFor(() => expect(clearMaintenanceStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /vacuum/i }));

    await waitFor(() => expect(getVacuumDeadRows).toHaveBeenCalledTimes(1));

    const deadRowsResults = await screen.findByTestId('dead-rows-results');
    await waitFor(() => {
      expect(within(deadRowsResults).getByText('users')).toBeInTheDocument();
      expect(within(deadRowsResults).getByText('10 dead rows')).toBeInTheDocument();
      expect(within(deadRowsResults).getByText('orders')).toBeInTheDocument();
      expect(within(deadRowsResults).getByText('5 dead rows')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /vacuum database/i }));
    await waitFor(() => expect(vacuumDatabase).toHaveBeenCalled());

    const vacuumTableButton = screen.getByRole('button', { name: /vacuum table/i });
    expect(vacuumTableButton).toBeDisabled();

    const tableSelect = await screen.findByRole('combobox', { name: /table name/i });
    const nativeInput = tableSelect.parentElement?.querySelector('input');
    expect(nativeInput).toBeTruthy();
    fireEvent.change(nativeInput as HTMLInputElement, { target: { value: 'users' } });

    expect(screen.getByRole('button', { name: /vacuum table/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /vacuum table/i }));
    await waitFor(() => expect(vacuumTable).toHaveBeenCalledWith('users'));

    const deadRowsSelect = screen.getByRole('combobox', { name: /table filter/i });
    const deadRowsInput = deadRowsSelect.parentElement?.querySelector('input');
    expect(deadRowsInput).toBeTruthy();
    fireEvent.change(deadRowsInput as HTMLInputElement, { target: { value: 'orders' } });
    fireEvent.click(screen.getByRole('button', { name: /check dead rows/i }));
    await waitFor(() => expect(getVacuumDeadRows).toHaveBeenCalledWith('orders'));

    await waitFor(() => {
      expect(within(deadRowsResults).getByText('orders')).toBeInTheDocument();
      expect(within(deadRowsResults).getByText('5 dead rows')).toBeInTheDocument();
      expect(within(deadRowsResults).queryByText('users')).not.toBeInTheDocument();
      expect(within(deadRowsResults).queryByText('10 dead rows')).not.toBeInTheDocument();
    });

    fireEvent.change(deadRowsInput as HTMLInputElement, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /check dead rows/i }));
    await waitFor(() => {
      expect(getVacuumDeadRows).toHaveBeenCalledTimes(3);
      expect(getVacuumDeadRows).toHaveBeenNthCalledWith(3, undefined);
    });

    await waitFor(() => {
      expect(within(deadRowsResults).getByText('users')).toBeInTheDocument();
      expect(within(deadRowsResults).getByText('10 dead rows')).toBeInTheDocument();
      expect(within(deadRowsResults).getByText('orders')).toBeInTheDocument();
      expect(within(deadRowsResults).getByText('5 dead rows')).toBeInTheDocument();
    });
  });

  it('validates purge inputs before confirming', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Maintenance />
      </ThemeProvider>,
    );

    await waitFor(() => expect(getMaintenanceSettings).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /delete older records/i }));

    fireEvent.click(screen.getByRole('button', { name: /delete older records/i }));

    expect(await screen.findByText(/select at least one data set/i)).toBeInTheDocument();
    expect(screen.getByText(/select a cutoff date/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Pantry bookings/i));
    fireEvent.change(screen.getByLabelText(/cutoff date/i), { target: { value: '2024-01-15' } });

    fireEvent.click(screen.getByRole('button', { name: /delete older records/i }));

    expect(await screen.findByText(/pick a date before january 1, 2024/i)).toBeInTheDocument();
  });

  it('submits purge request after confirmation and shows success', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Maintenance />
      </ThemeProvider>,
    );

    await waitFor(() => expect(getMaintenanceSettings).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /delete older records/i }));
    fireEvent.click(screen.getByLabelText(/Pantry bookings/i));
    fireEvent.click(screen.getByLabelText(/Pantry visits/i));
    fireEvent.change(screen.getByLabelText(/cutoff date/i), { target: { value: '2023-12-31' } });

    fireEvent.click(screen.getByRole('button', { name: /delete older records/i }));

    const confirmButton = await screen.findByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmButton);

    await waitFor(() =>
      expect(purgeOldRecords).toHaveBeenCalledWith({
        tables: ['bookings', 'client_visits'],
        before: '2023-12-31',
      }),
    );

    expect(await screen.findByText(/Deleted records before 2023-12-31/i)).toBeInTheDocument();
  });

  it('surfaces purge errors from the backend', async () => {
    (purgeOldRecords as jest.Mock).mockRejectedValueOnce(new Error('Failed to purge'));

    render(
      <ThemeProvider theme={theme}>
        <Maintenance />
      </ThemeProvider>,
    );

    await waitFor(() => expect(getMaintenanceSettings).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /delete older records/i }));
    fireEvent.click(screen.getByLabelText(/Pantry bookings/i));
    fireEvent.change(screen.getByLabelText(/cutoff date/i), { target: { value: '2023-11-30' } });
    fireEvent.click(screen.getByRole('button', { name: /delete older records/i }));

    fireEvent.click(await screen.findByRole('button', { name: /confirm delete/i }));

    expect(await screen.findByText('Failed to purge')).toBeInTheDocument();
  });
});
