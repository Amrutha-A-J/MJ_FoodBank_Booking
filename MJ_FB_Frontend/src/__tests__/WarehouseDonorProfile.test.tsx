import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import DonorProfile from '../pages/warehouse-management/DonorProfile';
import {
  getDonor,
  getDonorDonations,
  updateDonor,
} from '../api/donors';

jest.mock('../components/WarehouseQuickLinks', () => () => <div />);

jest.mock('../api/donors', () => ({
  getDonor: jest.fn(),
  getDonorDonations: jest.fn(),
  updateDonor: jest.fn(),
}));

describe('Warehouse Donor Profile', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderProfile() {
    return renderWithProviders(
      <MemoryRouter initialEntries={["/warehouse-management/donors/42"]}>
        <Routes>
          <Route path="/warehouse-management/donors/:id" element={<DonorProfile />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('shows fallback contact information when email or phone are missing', async () => {
    (getDonor as jest.Mock).mockResolvedValue({
      id: 42,
      name: 'No Contact',
      email: null,
      phone: null,
      totalLbs: 540,
      lastDonationISO: null,
      isPetFood: false,
    });
    (getDonorDonations as jest.Mock).mockResolvedValue([
      { id: 1, date: '2024-04-01', weight: 120 },
    ]);

    renderProfile();

    expect(await screen.findByText('No Contact')).toBeInTheDocument();
    expect(screen.getByText('Email: Email not provided')).toBeInTheDocument();
    expect(screen.getByText('Phone: Phone not provided')).toBeInTheDocument();
    expect(screen.getByText('Pet food donor: No')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '120' })).toBeInTheDocument();
  });

  it('validates edit form fields and saves trimmed phone numbers', async () => {
    (getDonor as jest.Mock)
      .mockResolvedValueOnce({
        id: 42,
        name: 'Alice Donor',
        email: 'alice@example.com',
        phone: null,
        totalLbs: 800,
        lastDonationISO: '2024-04-10T12:00:00Z',
        isPetFood: false,
      })
      .mockResolvedValueOnce({
        id: 42,
        name: 'Alicia Donor',
        email: null,
        phone: '306-555-0100',
        totalLbs: 800,
        lastDonationISO: '2024-04-10T12:00:00Z',
        isPetFood: true,
      });
    (getDonorDonations as jest.Mock).mockResolvedValue([]);
    (updateDonor as jest.Mock).mockResolvedValue({});

    renderProfile();

    const editButton = await screen.findByRole('button', { name: /edit/i });
    await userEvent.click(editButton);

    const nameField = screen.getByLabelText(/^name/i);
    const email = screen.getByLabelText(/email \(optional\)/i);
    const phone = screen.getByLabelText(/phone \(optional\)/i);
    const petFood = screen.getByLabelText(/pet food donor/i);
    const save = screen.getByRole('button', { name: /save donor/i });

    await userEvent.clear(nameField);
    await userEvent.click(save);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(updateDonor).not.toHaveBeenCalled();

    await userEvent.type(nameField, ' Alicia Donor ');
    await userEvent.clear(email);
    await userEvent.type(email, 'invalid');
    await userEvent.click(save);

    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    expect(updateDonor).not.toHaveBeenCalled();

    await userEvent.clear(email);
    await userEvent.type(email, '   ');
    await userEvent.type(phone, ' 306-555-0100 ');
    await userEvent.click(petFood);
    await userEvent.click(save);

    await waitFor(() =>
      expect(updateDonor).toHaveBeenCalledWith(42, {
        name: 'Alicia Donor',
        email: null,
        phone: '306-555-0100',
        isPetFood: true,
      }),
    );

    await waitFor(() => expect(getDonor).toHaveBeenCalledTimes(2));
  });
});
