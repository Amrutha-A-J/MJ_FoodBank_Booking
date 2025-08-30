import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientManagement from '../ClientManagement';
import { getNewClients, deleteNewClient } from '../../../api/users';

jest.mock('../../../api/users', () => ({
  ...jest.requireActual('../../../api/users'),
  getNewClients: jest.fn(),
  deleteNewClient: jest.fn(),
}));

const mockClients = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123',
    created_at: '2024-01-01',
  },
];

describe('ClientManagement New Clients tab', () => {
  beforeEach(() => {
    (getNewClients as jest.Mock).mockResolvedValue(mockClients);
    (deleteNewClient as jest.Mock).mockResolvedValue(undefined);
  });

  it('displays new clients and handles deletion', async () => {
    render(
      <MemoryRouter>
        <ClientManagement />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('tab', { name: /new clients/i }));

    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    const deleteBtn = await screen.findByLabelText('delete');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deleteNewClient).toHaveBeenCalledWith(1);
    });
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });
});

