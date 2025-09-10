import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientManagement from '../ClientManagement';
import { getNewClients, deleteNewClient } from '../../../api/users';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';

(global as any).clearImmediate = (global as any).clearImmediate || ((id: number) => clearTimeout(id));
(global as any).performance = (global as any).performance || ({} as any);
(global as any).performance.markResourceTiming = (global as any).performance.markResourceTiming || (() => {});
(global as any).fetch = jest.fn();

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
    renderWithProviders(
      <MemoryRouter>
        <ClientManagement />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('tab', { name: /new clients/i }));

    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    const deleteBtn = await screen.findByLabelText('delete');
    fireEvent.click(deleteBtn);
    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(deleteNewClient).toHaveBeenCalledWith(1);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });
});

