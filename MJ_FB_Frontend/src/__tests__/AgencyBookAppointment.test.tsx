import { render, screen, fireEvent } from '@testing-library/react';
import AgencyBookAppointment from '../pages/agency/AgencyBookAppointment';

jest.mock('../api/agencies', () => ({
  getMyAgencyClients: jest.fn(),
}));

jest.mock('../pages/BookingUI', () => ({ shopperName, userId }: any) => (
  <div>BookingUI {shopperName} {userId}</div>
));

describe('AgencyBookAppointment', () => {
  it('renders BookingUI when a client is selected', async () => {
    const { getMyAgencyClients } = require('../api/agencies');
    (getMyAgencyClients as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Alice', email: 'a@example.com' },
    ]);

    render(<AgencyBookAppointment />);

    fireEvent.change(screen.getByLabelText(/Search Clients/i), {
      target: { value: 'Alice' },
    });
    await screen.findByText('Alice');
    fireEvent.click(screen.getByText('Alice'));

    await screen.findByText(/BookingUI Alice 1/);
    expect(screen.queryByRole('button', { name: 'Alice' })).toBeNull();
  });
});
