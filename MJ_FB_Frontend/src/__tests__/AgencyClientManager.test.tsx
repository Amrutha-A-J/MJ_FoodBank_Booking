import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgencyClientManager from '../pages/staff/AgencyClientManager';

jest.mock('../api/agencies', () => ({
  addAgencyClient: jest.fn(),
  removeAgencyClient: jest.fn(),
  getAgencyClients: jest.fn().mockResolvedValue([]),
}));

jest.mock('../components/EntitySearch', () =>
  function MockEntitySearch({ type, onSelect, renderResult }: any) {
    if (type === 'agency') {
      return <button onClick={() => onSelect({ id: 1, name: 'Agency A' })}>select agency</button>;
    }
    const user = { id: 2, name: 'Client C', client_id: 2, hasPassword: false };
    return <div>{renderResult(user, () => onSelect(user))}</div>;
  },
);

const mockBookingUI = jest.fn();
jest.mock('../pages/BookingUI', () => (props: any) => {
  mockBookingUI(props);
  return <div>BookingUI {props.shopperName}</div>;
});

describe('AgencyClientManager', () => {
  it('shows modal when client already associated with another agency', async () => {
    const { addAgencyClient } = require('../api/agencies');
    (addAgencyClient as jest.Mock).mockRejectedValue({
      message: 'Client already associated with Other Agency',
      details: { agencyName: 'Other Agency' },
    });

    const user = userEvent.setup();
    render(<AgencyClientManager />);
    await user.click(screen.getByText('select agency'));
    await waitFor(() => screen.getByRole('button', { name: /add/i }));
    await user.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /This client is already associated with Other Agency/i,
        ),
      ).toBeInTheDocument(),
    );
  });

  it('opens booking dialog for a client', async () => {
    const { getAgencyClients } = require('../api/agencies');
    (getAgencyClients as jest.Mock).mockResolvedValue([
      {
        client_id: 5,
        first_name: 'Client',
        last_name: 'One',
        email: 'c@example.com',
      },
    ]);
    const user = userEvent.setup();
    render(<AgencyClientManager />);
    await user.click(screen.getByText('select agency'));
    await screen.findByText('Clients for Agency A');
    await user.click(screen.getByText('Book'));
    expect(await screen.findByText('BookingUI Client One')).toBeInTheDocument();
    expect(mockBookingUI).toHaveBeenCalledWith(
      expect.objectContaining({ shopperName: 'Client One', userId: 5 }),
    );
  });
});
