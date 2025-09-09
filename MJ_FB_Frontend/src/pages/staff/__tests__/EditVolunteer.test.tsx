import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditVolunteer from '../volunteer-management/EditVolunteer';
import {
  getVolunteerRoles,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  getVolunteerById,
} from '../../../api/volunteers';

jest.mock('../../../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  updateVolunteerTrainedAreas: jest.fn(),
  createVolunteerShopperProfile: jest.fn(),
  removeVolunteerShopperProfile: jest.fn(),
  getVolunteerById: jest.fn(),
}));

const mockVolunteer: any = {
  id: 1,
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  email: undefined,
  phone: undefined,
  trainedAreas: [],
  hasShopper: false,
  hasPassword: false,
  clientId: null,
};

jest.mock('../../../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect(mockVolunteer)}>Select Volunteer</button>
));

describe('EditVolunteer shopper profile', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (createVolunteerShopperProfile as jest.Mock).mockReset();
    (removeVolunteerShopperProfile as jest.Mock).mockReset();
    (getVolunteerById as jest.Mock).mockReset();
  });

  it('creates shopper profile', async () => {
    mockVolunteer.id = 1;
    mockVolunteer.name = 'John Doe';
    mockVolunteer.hasShopper = false;
    mockVolunteer.clientId = null;

    (createVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
    (getVolunteerById as jest.Mock).mockResolvedValue({
      ...mockVolunteer,
      hasShopper: true,
      clientId: 123,
    });

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    fireEvent.click(screen.getByRole('checkbox', { name: /shopper profile/i }));
    fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-1234' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(createVolunteerShopperProfile).toHaveBeenCalledWith(
        1,
        '123',
        'test@example.com',
        '555-1234',
      ),
    );
    expect(getVolunteerById).toHaveBeenCalledWith(1);
  });

  it('removes shopper profile', async () => {
    mockVolunteer.id = 2;
    mockVolunteer.name = 'Jane Doe';
    mockVolunteer.hasShopper = true;
    mockVolunteer.clientId = 456;

    (removeVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
    (getVolunteerById as jest.Mock).mockResolvedValue({
      ...mockVolunteer,
      hasShopper: false,
      clientId: null,
    });

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    fireEvent.click(screen.getByRole('checkbox', { name: /shopper profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() =>
      expect(removeVolunteerShopperProfile).toHaveBeenCalledWith(2),
    );
    expect(getVolunteerById).toHaveBeenCalledWith(2);
  });
});
