import {
  render,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
  act,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '../theme';
import type { ReactNode } from 'react';
import DonationLog from '../pages/donor-management/DonationLog';
import {
  getMonetaryDonors,
  getMonetaryDonations,
  importZeffyDonations,
  updateMonetaryDonation,
  deleteMonetaryDonation,
} from '../api/monetaryDonors';

jest.mock('../components/FeedbackSnackbar', () => ({
  __esModule: true,
  default: ({
    message,
    open,
  }: {
    message: string;
    open: boolean;
  }) => (open ? <div data-testid="feedback-snackbar">{message}</div> : null),
}));

jest.mock('../components/DonorQuickLinks', () => ({
  __esModule: true,
  default: () => <nav data-testid="donor-quick-links" />,
}));

jest.mock('../components/ResponsiveTable', () => ({
  __esModule: true,
  default: ({
    columns,
    rows,
  }: {
    columns: Array<{ field: string; render?: (row: any) => ReactNode }>;
    rows: any[];
  }) => (
    <table data-testid="responsive-table">
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id ?? index}>
            {columns.map(col => (
              <td key={col.field}>
                {col.render ? col.render(row) : row[col.field] ?? null}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

jest.mock('@mui/material/Dialog', () => ({
  __esModule: true,
  default: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
}));

jest.mock('@mui/material/TableContainer', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="table-container">{children}</div>
  ),
}));

jest.mock('../api/monetaryDonors', () => ({
  getMonetaryDonors: jest.fn(),
  getMonetaryDonations: jest.fn(),
  createMonetaryDonor: jest.fn(),
  createMonetaryDonation: jest.fn(),
  importZeffyDonations: jest.fn(),
  updateMonetaryDonation: jest.fn(),
  deleteMonetaryDonation: jest.fn(),
}));

describe('Donor Donation Log', () => {
  const fixedTime = new Date('2024-01-01T12:00:00Z');
  let dateNowSpy: jest.SpiedFunction<typeof Date.now>;

  function renderDonationLog() {
    return render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <DonationLog />
        </ThemeProvider>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedTime.getTime());
  });

  afterEach(() => {
    jest.clearAllMocks();
    dateNowSpy.mockRestore();
  });

  it('loads donations, supports editing/deleting, and imports new records', async () => {
    (getMonetaryDonors as jest.Mock)
      .mockResolvedValueOnce([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      ])
      .mockResolvedValueOnce([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      ]);
    (getMonetaryDonations as jest.Mock).mockImplementation(async () => [
      { id: 1, donorId: 1, amount: 50, date: '2024-01-10' },
    ]);
    (updateMonetaryDonation as jest.Mock).mockResolvedValue({});
    (deleteMonetaryDonation as jest.Mock).mockResolvedValue({});
    (importZeffyDonations as jest.Mock).mockResolvedValue({});

    renderDonationLog();

    expect(await screen.findByText('john@example.com')).toBeInTheDocument();
    expect(await screen.findByText('CA$50.00')).toBeInTheDocument();
    expect(screen.queryByText('CA$75.00')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Edit donation'));
    const amountField = screen.getByLabelText('Amount');
    fireEvent.change(amountField, { target: { value: '75' } });
    fireEvent.click(screen.getByText('Save'));

    await screen.findByText('Donation updated');
    expect(
      await screen.findByTestId('feedback-snackbar'),
    ).toHaveTextContent('Donation updated');
    expect(updateMonetaryDonation).toHaveBeenCalledWith(1, {
      donorId: 1,
      amount: 75,
      date: '2024-01-10',
    });

    fireEvent.click(screen.getByLabelText('Delete donation'));
    fireEvent.click(screen.getByText('Delete'));

    await screen.findByText('Donation deleted');
    expect(
      await screen.findByTestId('feedback-snackbar'),
    ).toHaveTextContent('Donation deleted');
    expect(deleteMonetaryDonation).toHaveBeenCalledWith(1);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = { name: 'donations.csv' } as File;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await screen.findByText('Donations imported');
    expect(
      await screen.findByTestId('feedback-snackbar'),
    ).toHaveTextContent('Donations imported');
    expect(importZeffyDonations).toHaveBeenCalledWith(file);
    expect(getMonetaryDonors).toHaveBeenCalledTimes(2);
    expect(getMonetaryDonations).toHaveBeenCalledTimes(4);
  });

  it('filters donations by search including donors without email addresses', async () => {
    const donors = [
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      { id: 3, firstName: 'No', lastName: 'Email', email: null },
    ];
    (getMonetaryDonors as jest.Mock).mockImplementation(() =>
      Promise.resolve(donors),
    );
    (getMonetaryDonations as jest.Mock).mockImplementation(async (donorId: number) => {
      if (donorId === 1)
        return [
          { id: 1, donorId: 1, amount: 50, date: '2024-01-10' },
          { id: 2, donorId: 1, amount: 75, date: '2024-02-05' },
        ];
      if (donorId === 2)
        return [{ id: 3, donorId: 2, amount: 100, date: '2024-01-15' }];
      return [{ id: 4, donorId: 3, amount: 30, date: '2024-01-12' }];
    });

    renderDonationLog();

    expect(await screen.findByText('john@example.com')).toBeInTheDocument();
    expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
    expect(await screen.findByText('No')).toBeInTheDocument();

    const searchField = await screen.findByLabelText('Search');

    const expectResults = async (
      query: string,
      visible: string[],
      hidden: string[],
    ) => {
      await act(async () => {
        fireEvent.change(searchField, { target: { value: query } });
      });
      expect(getMonetaryDonors).toHaveBeenLastCalledWith(query);
      for (const text of visible) {
        expect(await screen.findByText(text)).toBeInTheDocument();
      }
      for (const text of hidden) {
        const existing = screen.queryByText(text);
        if (existing) {
          await waitForElementToBeRemoved(existing);
        } else {
          expect(existing).toBeNull();
        }
      }
    };

    await expectResults('john', ['john@example.com'], ['jane@example.com', 'No']);
    await expectResults('Smith', ['jane@example.com'], ['john@example.com', 'No']);
    await expectResults('jane@example.com', ['jane@example.com'], ['john@example.com', 'No']);
    await expectResults('No', ['No'], ['john@example.com', 'jane@example.com']);

    await act(async () => {
      fireEvent.change(searchField, { target: { value: '' } });
    });
    expect(getMonetaryDonors).toHaveBeenLastCalledWith(undefined);
    await screen.findByText('john@example.com');
    await screen.findByText('jane@example.com');
    await screen.findByText('No');
  });
});
