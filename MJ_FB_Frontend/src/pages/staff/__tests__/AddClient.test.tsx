import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddClient from '../client-management/AddClient';
import { addUser } from '../../../api/users';

jest.mock('../../../api/users', () => ({
  ...jest.requireActual('../../../api/users'),
  addUser: jest.fn(),
}));

it('requires email when online access enabled', async () => {
  render(
    <MemoryRouter>
      <AddClient />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByLabelText(/online access/i));
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
  fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: '123' } });

  fireEvent.click(screen.getByRole('button', { name: /add client/i }));

  expect(await screen.findByText('First name, last name, client ID and email required')).toBeInTheDocument();
  expect(addUser).not.toHaveBeenCalled();
});

it('requires password when set password selected', async () => {
  render(
    <MemoryRouter>
      <AddClient />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByLabelText(/online access/i));
  fireEvent.click(screen.getByRole('button', { name: /set password/i }));
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
  fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: '123' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });

  fireEvent.click(screen.getByRole('button', { name: /add client/i }));

  expect(await screen.findByText('Password required')).toBeInTheDocument();
  expect(addUser).not.toHaveBeenCalled();
});
