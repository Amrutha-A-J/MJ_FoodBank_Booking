import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddVolunteer from '../volunteer-management/AddVolunteer';
import { apiFetch } from '../../../api/client';

jest.mock('../../../api/volunteers', () => {
  const actual = jest.requireActual('../../../api/volunteers');
  return {
    ...actual,
    getVolunteerRoles: jest.fn().mockResolvedValue([]),
  };
});

jest.mock('../../../api/client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(async (_url, init) => new Response(null, { status: 200 })),
  handleResponse: jest.fn(async () => undefined),
}));

beforeEach(() => {
  (apiFetch as jest.Mock).mockClear();
});

test('omits sendPasswordLink when creating volunteer without email', async () => {
  render(
    <MemoryRouter>
      <AddVolunteer />
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
  fireEvent.click(screen.getByRole('button', { name: /add volunteer/i }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalled());

  const body = JSON.parse((apiFetch as jest.Mock).mock.calls[0][1].body);
  expect(body).not.toHaveProperty('sendPasswordLink');
  expect(body).not.toHaveProperty('password');
  expect(body).not.toHaveProperty('email');
});

test('requires password when set password selected', async () => {
  render(
    <MemoryRouter>
      <AddVolunteer />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByLabelText(/online access/i));
  fireEvent.click(screen.getByRole('button', { name: /set password/i }));
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'jane@example.com' },
  });

  fireEvent.click(screen.getByRole('button', { name: /add volunteer/i }));

  expect(await screen.findByText('Password required')).toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalled();
});
