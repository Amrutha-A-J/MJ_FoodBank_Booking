import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddClient from '../client-management/AddClient';
import { apiFetch, jsonApiFetch } from '../../../api/client';

jest.mock('../../../api/client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(async (_url, init) => new Response(null, { status: 200 })),
  jsonApiFetch: jest.fn(async (_url, init) => new Response(null, { status: 200 })),
  handleResponse: jest.fn(async () => undefined),
}));

beforeEach(() => {
  (apiFetch as jest.Mock).mockClear();
  (jsonApiFetch as jest.Mock).mockClear();
});

test('requires email when online access enabled', async () => {
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

  expect(
    await screen.findByText('First name, last name, client ID and email required'),
  ).toBeInTheDocument();
  expect(jsonApiFetch).not.toHaveBeenCalled();
});

test('requires password when set password selected', async () => {
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
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'jane@example.com' },
  });

  fireEvent.click(screen.getByRole('button', { name: /add client/i }));

  expect(await screen.findByText('Password required')).toBeInTheDocument();
  expect(jsonApiFetch).not.toHaveBeenCalled();
});

test('includes sendPasswordLink and email when sending link', async () => {
  render(
    <MemoryRouter>
      <AddClient />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByLabelText(/online access/i));
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
  fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: '123' } });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'jane@example.com' },
  });

  fireEvent.click(screen.getByRole('button', { name: /add client/i }));

  await waitFor(() => expect(jsonApiFetch).toHaveBeenCalled());
  const body = (jsonApiFetch as jest.Mock).mock.calls[0][1].body;
  expect(body).toMatchObject({
    clientId: 123,
    role: 'shopper',
    onlineAccess: true,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    sendPasswordLink: true,
  });
  expect(body.password).toBeUndefined();
});

test('includes password and omits sendPasswordLink when setting password', async () => {
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
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
    target: { value: 'P@ssword1' },
  });

  fireEvent.click(screen.getByRole('button', { name: /add client/i }));

  await waitFor(() => expect(jsonApiFetch).toHaveBeenCalled());
  const body = (jsonApiFetch as jest.Mock).mock.calls[0][1].body;
  expect(body).toMatchObject({
    clientId: 123,
    role: 'shopper',
    onlineAccess: true,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'P@ssword1',
  });
  expect(body.sendPasswordLink).toBeUndefined();
});
