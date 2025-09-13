import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import {
  setImmediate as _setImmediate,
  clearImmediate as _clearImmediate,
  setTimeout as _setTimeout,
  clearTimeout as _clearTimeout,
} from 'timers';
import DonationLog from '../pages/donor-management/DonationLog';
import {
  getMonetaryDonors,
  getMonetaryDonations,
  importZeffyDonations,
  updateMonetaryDonation,
  deleteMonetaryDonation,
} from '../api/monetaryDonors';

function formatMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

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
  const originalSetImmediate = (global as any).setImmediate;
  const originalClearImmediate = (global as any).clearImmediate;
  const originalSetTimeout = (global as any).setTimeout;
  const originalClearTimeout = (global as any).clearTimeout;
  beforeEach(() => {
    (global as any).setImmediate = _setImmediate;
    (global as any).clearImmediate = _clearImmediate;
    (global as any).setTimeout = _setTimeout;
    (global as any).clearTimeout = _clearTimeout;
  });

  afterEach(() => {
    (global as any).setImmediate = originalSetImmediate;
    (global as any).clearImmediate = originalClearImmediate;
    (global as any).setTimeout = originalSetTimeout;
    (global as any).clearTimeout = originalClearTimeout;
    jest.clearAllMocks();
  });

  it('loads donations for the current month', async () => {
    const currentMonth = formatMonth();
    const nextMonth = formatMonth(
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    );
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    ]);
    (getMonetaryDonations as jest.Mock).mockImplementation(async () => [
      { id: 1, donorId: 1, amount: 50, date: `${currentMonth}-10` },
      { id: 2, donorId: 1, amount: 75, date: `${nextMonth}-05` },
    ]);

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    expect(await screen.findByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.queryByText('$75.00')).not.toBeInTheDocument();
  });

  it('edits and deletes a donation', async () => {
    const currentMonth = formatMonth();
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    ]);
    (getMonetaryDonations as jest.Mock).mockResolvedValue([
      { id: 1, donorId: 1, amount: 50, date: `${currentMonth}-10` },
    ]);
    (updateMonetaryDonation as jest.Mock).mockResolvedValue({});
    (deleteMonetaryDonation as jest.Mock).mockResolvedValue({});

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    await screen.findByText('$50.00');

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Edit donation'));
    });
    const amountField = screen.getByLabelText('Amount');
    await act(async () => {
      fireEvent.change(amountField, { target: { value: '75' } });
      fireEvent.click(screen.getByText('Save'));
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(updateMonetaryDonation).toHaveBeenCalledWith(1, {
        donorId: 1,
        amount: 75,
        date: `${currentMonth}-10`,
      }),
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Delete donation'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
      await Promise.resolve();
    });

    await waitFor(() => expect(deleteMonetaryDonation).toHaveBeenCalledWith(1));
  });

  it('filters donations by search', async () => {
    const currentMonth = formatMonth();
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
    ]);
    (getMonetaryDonations as jest.Mock).mockImplementation(async (donorId: number) => {
      if (donorId === 1) return [{ id: 1, donorId: 1, amount: 50, date: `${currentMonth}-10` }];
      if (donorId === 2) return [{ id: 2, donorId: 2, amount: 100, date: `${currentMonth}-15` }];
      return [];
    });

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    expect(await screen.findByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();

    const searchField = screen.getByLabelText('Search');

    await act(async () => {
      fireEvent.change(searchField, { target: { value: 'john' } });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('john'),
    );
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.change(searchField, { target: { value: 'Smith' } });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('Smith'),
    );
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.change(searchField, { target: { value: 'jane@example.com' } });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('jane@example.com'),
    );
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.change(searchField, { target: { value: '' } });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith(undefined),
    );
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('handles donors without emails in display and search', async () => {
    const currentMonth = formatMonth();
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'No', lastName: 'Email', email: null },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
    ]);
    (getMonetaryDonations as jest.Mock).mockImplementation(async (donorId: number) =>
      donorId === 1
        ? [{ id: 1, donorId: 1, amount: 50, date: `${currentMonth}-10` }]
        : [{ id: 2, donorId: 2, amount: 100, date: `${currentMonth}-15` }],
    );

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getAllByText('Email')[1]).toBeInTheDocument();

    const searchField = screen.getByLabelText('Search');
    await act(async () => {
      fireEvent.change(searchField, { target: { value: 'No' } });
      await Promise.resolve();
    });
    await waitFor(() => expect(getMonetaryDonors).toHaveBeenLastCalledWith('No'));
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(searchField, { target: { value: 'jane@example.com' } });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('jane@example.com'),
    );
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText('No')).not.toBeInTheDocument();
  });

  it('imports donations and reloads list', async () => {
    const currentMonth = formatMonth();
    (getMonetaryDonors as jest.Mock)
      .mockResolvedValueOnce([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      ])
      .mockResolvedValueOnce([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      ]);
    (getMonetaryDonations as jest.Mock).mockResolvedValue([
      { id: 1, donorId: 1, amount: 50, date: `${currentMonth}-10` },
    ]);
    (importZeffyDonations as jest.Mock).mockResolvedValue({});

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = { name: 'donations.csv' } as File;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      await Promise.resolve();
    });

    await screen.findByText('Donations imported');
    await waitFor(() => expect(importZeffyDonations).toHaveBeenCalled());
    await waitFor(() => expect(getMonetaryDonors).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(getMonetaryDonations.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
  });
});

