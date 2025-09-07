import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeleteClient from '../client-management/DeleteClient';
import { deleteUser } from '../../../api/users';

jest.mock('../../../api/users', () => ({ deleteUser: jest.fn() }));

jest.mock('../../../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect({ name: 'John Doe', client_id: 1 })}>Select Client</button>
));

describe('DeleteClient', () => {
  it('deletes selected client', async () => {
    render(
      <MemoryRouter>
        <DeleteClient />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Select Client'));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(deleteUser).toHaveBeenCalledWith(1);
  });
});
