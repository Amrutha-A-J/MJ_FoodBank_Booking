import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { login, staffExists, createStaff } from '../../../api/users';

jest.mock('../../../api/users', () => {
  const actual = jest.requireActual('../../../api/users');
  return {
    ...actual,
    login: jest.fn(),
    staffExists: jest.fn(),
    createStaff: jest.fn(),
  };
});

const mockedLogin = login as jest.MockedFunction<typeof login>;
const mockedStaffExists = staffExists as jest.MockedFunction<typeof staffExists>;
const mockedCreateStaff = createStaff as jest.MockedFunction<typeof createStaff>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedStaffExists.mockResolvedValue(true);
});

describe('Login error handling', () => {
  it('shows account not found message', async () => {
    mockedLogin.mockRejectedValue({ status: 404, message: 'Account not found' });
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>,
    );
    const idField = await screen.findByLabelText(/client id or email/i);
    fireEvent.change(idField, { target: { value: 'missing@example.com' } });
    fireEvent.change(await screen.findByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getByText(/don’t have an account/i)).toBeInTheDocument();
    });
  });

  it('disables button while submitting and refocuses identifier on error', async () => {
    mockedLogin.mockRejectedValue({ status: 401, message: 'Incorrect' });
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>,
    );
    const idField = await screen.findByLabelText(/client id or email/i);
    const button = screen.getByRole('button', { name: /login/i });
    expect(idField).toHaveFocus();
    fireEvent.change(idField, { target: { value: 'user@example.com' } });
    fireEvent.change(await screen.findByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'secret' },
    });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(idField).toHaveFocus();
  });
});

describe('First staff setup', () => {
  it('shows setup form when no staff exists', async () => {
    mockedStaffExists.mockResolvedValue(false);
    const onLogin = jest.fn();
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /set up the first staff account/i })).toBeInTheDocument();
  });

  it('creates the first staff member and then shows the login form', async () => {
    mockedStaffExists.mockResolvedValue(false);
    mockedCreateStaff.mockResolvedValue();
    const onLogin = jest.fn();
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText(/first name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() => {
      expect(mockedCreateStaff).toHaveBeenCalledWith('Jane', 'Doe', ['admin'], 'jane@example.com');
    });

    expect(await screen.findByLabelText(/client id or email/i)).toBeInTheDocument();
  });
});
