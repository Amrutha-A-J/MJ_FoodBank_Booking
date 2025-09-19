import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddVolunteer from '../volunteer-management/AddVolunteer';
import { apiFetch, jsonApiFetch } from '../../../api/client';
import { getVolunteerRoles } from '../../../api/volunteers';

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
  jsonApiFetch: jest.fn(async (_url, init) => new Response(null, { status: 200 })),
  handleResponse: jest.fn(async () => undefined),
}));

beforeEach(() => {
  (apiFetch as jest.Mock).mockClear();
  (jsonApiFetch as jest.Mock).mockClear();
});

test('omits sendPasswordLink when creating volunteer without email', async () => {
  (getVolunteerRoles as jest.Mock).mockResolvedValue([
    {
      id: 1,
      category_id: 1,
      name: 'Role A',
      max_volunteers: 1,
      category_name: 'Cat',
      shifts: [],
    },
  ]);

  render(
    <MemoryRouter>
      <AddVolunteer />
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText(/first name/i), {
    target: { value: 'Jane' },
  });
  fireEvent.change(screen.getByLabelText(/last name/i), {
    target: { value: 'Doe' },
  });
  fireEvent.mouseDown(screen.getByLabelText(/roles/i));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Role A'));
  fireEvent.keyDown(listbox, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: /add volunteer/i }));

  await waitFor(() => expect(jsonApiFetch).toHaveBeenCalled());

  const body = (jsonApiFetch as jest.Mock).mock.calls[0][1].body;
  expect(body.sendPasswordLink).toBeUndefined();
  expect(body.password).toBeUndefined();
  expect(body.email).toBeUndefined();
});

test('requires password when set password selected', async () => {
  (getVolunteerRoles as jest.Mock).mockResolvedValue([
    {
      id: 1,
      category_id: 1,
      name: 'Role A',
      max_volunteers: 1,
      category_name: 'Cat',
      shifts: [],
    },
  ]);

  render(
    <MemoryRouter>
      <AddVolunteer />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByLabelText(/online access/i));
  fireEvent.click(screen.getByRole('button', { name: /set password/i }));
  fireEvent.change(screen.getByLabelText(/first name/i), {
    target: { value: 'Jane' },
  });
  fireEvent.change(screen.getByLabelText(/last name/i), {
    target: { value: 'Doe' },
  });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.mouseDown(screen.getByLabelText(/roles/i));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Role A'));
  fireEvent.keyDown(listbox, { key: 'Escape' });

  fireEvent.click(screen.getByRole('button', { name: /add volunteer/i }));

  expect(await screen.findByText('Password required')).toBeInTheDocument();
  expect(jsonApiFetch).not.toHaveBeenCalled();
});

test('requires at least one role', async () => {
  (getVolunteerRoles as jest.Mock).mockResolvedValue([
    {
      id: 1,
      category_id: 1,
      name: 'Role A',
      max_volunteers: 1,
      category_name: 'Cat',
      shifts: [],
    },
  ]);

  render(
    <MemoryRouter>
      <AddVolunteer />
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText(/first name/i), {
    target: { value: 'Jane' },
  });
  fireEvent.change(screen.getByLabelText(/last name/i), {
    target: { value: 'Doe' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add volunteer/i }));

  expect(await screen.findByText('At least one role required')).toBeInTheDocument();
  expect(jsonApiFetch).not.toHaveBeenCalled();
});

test('requires email when online access enabled', async () => {
  (getVolunteerRoles as jest.Mock).mockResolvedValue([
    {
      id: 1,
      category_id: 1,
      name: 'Role A',
      max_volunteers: 1,
      category_name: 'Cat',
      shifts: [],
    },
  ]);

  render(
    <MemoryRouter>
      <AddVolunteer />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByLabelText(/online access/i));
  fireEvent.change(screen.getByLabelText(/first name/i), {
    target: { value: 'Jane' },
  });
  fireEvent.change(screen.getByLabelText(/last name/i), {
    target: { value: 'Doe' },
  });

  fireEvent.mouseDown(screen.getByLabelText(/roles/i));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Role A'));
  fireEvent.keyDown(listbox, { key: 'Escape' });

  fireEvent.click(screen.getByRole('button', { name: /add volunteer/i }));

  expect(
    await screen.findByText('Email required for online access'),
  ).toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalled();
});
