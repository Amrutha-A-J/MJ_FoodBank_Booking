import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientList from '../ClientList';
import { removeAgencyClient } from '../../../api/agencies';

jest.mock('../../../hooks/useAuth', () => ({ useAuth: jest.fn() }));

jest.mock('../../../api/agencies', () => ({
  getMyAgencyClients: jest
    .fn()
    .mockResolvedValue([{ id: 1, name: 'Client One', email: 'c@example.com' }]),
  addAgencyClient: jest.fn(),
  removeAgencyClient: jest.fn(),
}));

describe('ClientList', () => {
  it('confirms before removing client', async () => {
    const user = userEvent.setup();
    render(<ClientList />);

    expect(await screen.findByText('Client One')).toBeInTheDocument();

    await user.click(screen.getByLabelText('remove'));
    expect(screen.getByText('Remove Client One?')).toBeInTheDocument();
    expect(removeAgencyClient).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(removeAgencyClient).toHaveBeenCalledWith('me', 1);
  });
});
