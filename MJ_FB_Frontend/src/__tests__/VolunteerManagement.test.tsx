import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VolunteerManagement from '../components/VolunteerManagement';
import {
  getVolunteerRoles,
  getVolunteerBookingsByRole,
  updateVolunteerBookingStatus,
  searchVolunteers,
  getVolunteerBookingHistory,
  createVolunteer,
  updateVolunteerTrainedAreas,
  createVolunteerBookingForVolunteer,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
} from '../api/api';

jest.mock('../api/api', () => ({
  getVolunteerRoles: jest.fn(),
  getVolunteerBookingsByRole: jest.fn(),
  updateVolunteerBookingStatus: jest.fn(),
  searchVolunteers: jest.fn(),
  getVolunteerBookingHistory: jest.fn(),
  createVolunteer: jest.fn(),
  updateVolunteerTrainedAreas: jest.fn(),
  createVolunteerBookingForVolunteer: jest.fn(),
  createVolunteerShopperProfile: jest.fn(),
  removeVolunteerShopperProfile: jest.fn(),
}));

let mockVolunteer: any = { id: 1, name: 'Test Vol', trainedAreas: [], hasShopper: false };

jest.mock('../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect(mockVolunteer)}>Select Volunteer</button>
));

beforeEach(() => {
  jest.clearAllMocks();
  (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
  (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
  (createVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
  (removeVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
});

describe('VolunteerManagement shopper profile', () => {
  it('creates shopper profile for volunteer', async () => {
    mockVolunteer = { id: 1, name: 'Test Vol', trainedAreas: [], hasShopper: false };
    (searchVolunteers as jest.Mock)
      .mockResolvedValueOnce([mockVolunteer])
      .mockResolvedValueOnce([{ ...mockVolunteer, hasShopper: true }]);

    render(
      <MemoryRouter initialEntries={['/volunteers/search']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement token="t" />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    const toggle = await screen.findByLabelText(/shopper profile/i);
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);

    fireEvent.change(await screen.findByLabelText(/client id/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(createVolunteerShopperProfile).toHaveBeenCalledWith(
        't',
        1,
        '123',
        'pass',
        undefined,
        undefined,
      )
    );
    await waitFor(() => expect(screen.getByLabelText(/shopper profile/i)).toBeChecked());
  });

  it('removes shopper profile for volunteer', async () => {
    mockVolunteer = { id: 1, name: 'Test Vol', trainedAreas: [], hasShopper: true };
    (searchVolunteers as jest.Mock)
      .mockResolvedValueOnce([mockVolunteer])
      .mockResolvedValueOnce([{ ...mockVolunteer, hasShopper: false }]);

    render(
      <MemoryRouter initialEntries={['/volunteers/search']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement token="t" />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    const toggle = await screen.findByLabelText(/shopper profile/i);
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() =>
      expect(removeVolunteerShopperProfile).toHaveBeenCalledWith('t', 1)
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/shopper profile/i)).not.toBeChecked()
    );
  });
});

