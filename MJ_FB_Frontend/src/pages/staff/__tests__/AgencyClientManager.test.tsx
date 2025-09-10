import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgencyClientManager from '../AgencyClientManager';

jest.mock('../../../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect({ id: 1, name: 'Test Agency' })}>
    {props.type === 'agency' ? 'Select Agency' : 'Select Client'}
  </button>
));

jest.mock('../../../api/agencies', () => ({
  addAgencyClient: jest.fn(),
  removeAgencyClient: jest.fn(),
  getAgencyClients: jest.fn().mockResolvedValue([]),
}));

const mockBookingUI = jest.fn();
jest.mock('../../BookingUI', () => (props: any) => {
  mockBookingUI(props);
  return <div>BookingUI {props.shopperName}</div>;
});

describe('AgencyClientManager', () => {
  it('shows agency search before selection then shows client search', async () => {
    render(<AgencyClientManager />);

    expect(
      screen.getByRole('button', { name: 'Select Agency' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Select Client')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Select Agency' }));

    expect(await screen.findByText('Select Client')).toBeInTheDocument();
    expect(
      await screen.findByText('Clients for Test Agency'),
    ).toBeInTheDocument();
  });

  it('opens booking dialog for a client', async () => {
    const { getAgencyClients } = require('../../../api/agencies');
    (getAgencyClients as jest.Mock).mockResolvedValue([
      { client_id: 5, first_name: 'Client', last_name: 'One', email: 'c@example.com' },
    ]);

    render(<AgencyClientManager />);

    await userEvent.click(screen.getByRole('button', { name: 'Select Agency' }));
    await screen.findByText('Clients for Test Agency');
    expect(await screen.findByText('Client One')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Book'));
    expect(await screen.findByText('BookingUI Client One')).toBeInTheDocument();
    expect(mockBookingUI).toHaveBeenCalledWith(
      expect.objectContaining({ shopperName: 'Client One', userId: 5 }),
    );
  });

  it('removes a client after confirmation', async () => {
    const { getAgencyClients, removeAgencyClient } =
      require('../../../api/agencies');
    (getAgencyClients as jest.Mock)
      .mockResolvedValueOnce([
        { client_id: 5, first_name: 'Client', last_name: 'One' },
      ])
      .mockResolvedValueOnce([]);

    render(<AgencyClientManager />);

    await userEvent.click(screen.getByRole('button', { name: 'Select Agency' }));
    await screen.findByText('Client One');

    await userEvent.click(screen.getByLabelText('remove'));

    expect(
      await screen.findByText('Remove this client from the agency?'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(removeAgencyClient).toHaveBeenCalledWith(1, 5);
    await screen.findByText('No clients assigned.');
  });
});
