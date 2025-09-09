import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VolunteerManagement from '../volunteer-management/VolunteerManagement';
import {
  getVolunteerRoles,
  searchVolunteers,
  getVolunteerBookingHistory,
} from '../../api/volunteers';

const mockVolunteer = {
  id: 2,
  name: 'Shopper Vol',
  trainedAreas: [],
  hasShopper: true,
  hasPassword: true,
  clientId: 123,
};

jest.mock('../../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  searchVolunteers: jest.fn(),
  getVolunteerBookingHistory: jest.fn(),
}));

jest.mock('../../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect(mockVolunteer)}>
    Select Volunteer
  </button>
));

jest.mock('../../components/dashboard/Dashboard', () => () => <div>Dashboard</div>);

describe('VolunteerManagement shopper profile', () => {
  beforeEach(() => {
    (searchVolunteers as jest.Mock).mockResolvedValue([mockVolunteer]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
  });

  it('shows caption for volunteers with shopper profiles', async () => {
    render(
      <MemoryRouter initialEntries={['/volunteers/search']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));

    expect(await screen.findByText('Shopper Vol')).toBeInTheDocument();
    await screen.findByText('Volunteer has an online account');
    expect(
      await screen.findByText(/shopper profile attached to it\. Client ID: 123/),
    ).toBeInTheDocument();
  });
});
