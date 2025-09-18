import { MemoryRouter } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import DonationLog from '../pages/warehouse-management/DonationLog';
import {
  getDonors,
  createDonor,
} from '../api/donors';
import {
  getDonationsByMonth,
  createDonation,
  updateDonation,
  deleteDonation,
} from '../api/donations';

jest.mock('../components/WarehouseQuickLinks', () => () => <div />);

jest.mock('../api/donors', () => ({
  getDonors: jest.fn(),
  createDonor: jest.fn(),
}));

jest.mock('../api/donations', () => ({
  getDonationsByMonth: jest.fn(),
  createDonation: jest.fn(),
  updateDonation: jest.fn(),
  deleteDonation: jest.fn(),
}));

describe('Warehouse Donation Log', () => {
  let dateNowSpy: jest.SpyInstance<number, []>;
  beforeEach(() => {
    dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2024-05-15T12:00:00Z').getTime());
    (getDonors as jest.Mock).mockResolvedValue([
      {
        id: 1,
        firstName: 'No',
        lastName: 'Email',
        email: null,
        phone: null,
      },
      {
        id: 2,
        firstName: 'Jane',
        lastName: 'Donor',
        email: 'jane@example.com',
        phone: '306-555-0199',
      },
    ]);
    (getDonationsByMonth as jest.Mock).mockResolvedValue([
      {
        id: 10,
        date: '2024-05-03',
        donorId: 1,
        donor: {
          firstName: 'No',
          lastName: 'Email',
          email: null,
          phone: null,
        },
        weight: 120,
      },
    ]);
    (createDonation as jest.Mock).mockResolvedValue({});
    (updateDonation as jest.Mock).mockResolvedValue({});
    (deleteDonation as jest.Mock).mockResolvedValue({});
    (createDonor as jest.Mock).mockResolvedValue({
      id: 3,
      firstName: 'Added',
      lastName: 'Donor',
      email: null,
      phone: '306-555-0123',
    });
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    jest.clearAllMocks();
  });

  function renderLog() {
    return renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );
  }

  it('lists donations with donor fallback contact info', async () => {
    renderLog();

    expect(await screen.findByText('No Email (ID: 1)')).toBeInTheDocument();
    expect(screen.getByText('120 lbs')).toBeInTheDocument();
  });

  it('records a donation by selecting a donor with an ID search', async () => {
    renderLog();

    await screen.findByText('Record Donation');
    const monthInput = screen.getByLabelText(/month/i) as HTMLInputElement;
    const expectedDate = `${monthInput.value}-01`;
    fireEvent.click(screen.getByRole('button', { name: /record donation/i }));

    const donorInput = screen.getByLabelText(/donor \(search by name or id\)/i);
    fireEvent.change(donorInput, { target: { value: '2' } });

    await waitFor(() => expect(getDonors).toHaveBeenCalledWith('2'));

    const option = await screen.findByText('Jane Donor (ID: 2) • 306-555-0199');
    fireEvent.click(option);

    const weightInput = screen.getByLabelText(/weight \(lbs\)/i);
    fireEvent.change(weightInput, { target: { value: '75' } });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(createDonation).toHaveBeenCalledWith({
        date: expectedDate,
        donorId: 2,
        weight: 75,
      }),
    );
    await waitFor(() => expect(getDonationsByMonth).toHaveBeenCalledTimes(2));
  });

  it('edits a donation and updates the existing record', async () => {
    renderLog();

    await screen.findByLabelText('Edit donation');
    fireEvent.click(screen.getByLabelText('Edit donation'));

    const weightInput = screen.getByLabelText(/weight \(lbs\)/i);
    fireEvent.change(weightInput, { target: { value: '180' } });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(updateDonation).toHaveBeenCalledWith(10, {
        date: '2024-05-03',
        donorId: 1,
        weight: 180,
      }),
    );
  });

  it('adds a donor with optional phone details', async () => {
    renderLog();

    fireEvent.click(screen.getByRole('button', { name: /add donor/i }));

    const firstName = screen.getByLabelText(/first name/i);
    const lastName = screen.getByLabelText(/last name/i);
    const phone = screen.getByLabelText(/phone/i);

    await userEvent.type(firstName, ' Added ');
    await userEvent.type(lastName, ' Donor ');
    await userEvent.type(phone, ' 306-555-0123 ');

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(createDonor).toHaveBeenCalledWith({
        firstName: 'Added',
        lastName: 'Donor',
        email: null,
        phone: '306-555-0123',
      }),
    );
  });
});
