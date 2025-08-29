import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    const user = { id: 2, name: 'Client C', client_id: 2 };
    return <div>{renderResult(user, () => onSelect(user))}</div>;
  },
);

describe('AgencyClientManager', () => {
  it('shows modal when client already associated with another agency', async () => {
    const { addAgencyClient } = require('../api/agencies');
    (addAgencyClient as jest.Mock).mockRejectedValue({
      message: 'Client already associated with Other Agency',
      details: { agencyName: 'Other Agency' },
    });

    render(<AgencyClientManager />);
    fireEvent.click(screen.getByText('select agency'));
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /This client is already associated with Other Agency/i,
        ),
      ).toBeInTheDocument(),
    );
  });
});
