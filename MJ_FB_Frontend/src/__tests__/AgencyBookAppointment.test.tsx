import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';
import AgencyBookAppointment from '../pages/agency/AgencyBookAppointment';

jest.mock('../api/agencies', () => ({
  searchAgencyClients: jest.fn(),
}));

const mockBookingUI = jest.fn();
jest.mock('../pages/BookingUI', () => (props: any) => mockBookingUI(props));

describe('AgencyBookAppointment', () => {
  afterEach(() => {
    mockBookingUI.mockReset();
  });

  it('shows loading indicator while BookingUI loads', async () => {
    const { searchAgencyClients } = require('../api/agencies');
    (searchAgencyClients as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Alice', email: 'a@example.com' },
    ]);
    mockBookingUI.mockImplementation(({ shopperName, userId }: any) => (
      <div>BookingUI {shopperName} {userId}</div>
    ));

    render(<AgencyBookAppointment />);

    fireEvent.change(screen.getByLabelText(/Search Clients/i), {
      target: { value: 'Alice' },
    });
    await screen.findByText('Alice');
    fireEvent.click(screen.getByText('Alice'));

    expect(await screen.findByText(/Loading availability/i)).toBeInTheDocument();
  });

  it('renders BookingUI when a client is selected', async () => {
    const { searchAgencyClients } = require('../api/agencies');
    (searchAgencyClients as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Alice', email: 'a@example.com' },
    ]);
    mockBookingUI.mockImplementation(({ shopperName, userId, onLoadingChange }: any) => {
      useEffect(() => {
        onLoadingChange(false);
      }, [onLoadingChange]);
      return <div>BookingUI {shopperName} {userId}</div>;
    });

    render(<AgencyBookAppointment />);

    fireEvent.change(screen.getByLabelText(/Search Clients/i), {
      target: { value: 'Alice' },
    });
    await screen.findByText('Alice');
    fireEvent.click(screen.getByText('Alice'));

    await screen.findByText(/BookingUI Alice 1/);
    expect(screen.queryByText(/Loading availability/i)).toBeNull();
  });
});
