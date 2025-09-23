import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PasswordSetup from '../PasswordSetup';
import {
  setPassword,
  getPasswordSetupInfo,
  type PasswordSetupInfo,
} from '../../../api/users';

function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

jest.mock('../../../api/users', () => ({
  ...jest.requireActual('../../../api/users'),
  setPassword: jest.fn(),
  getPasswordSetupInfo: jest.fn(),
}));

describe('PasswordSetup checklist', () => {
  beforeEach(() => {
    (getPasswordSetupInfo as jest.Mock).mockResolvedValue({});
    (setPassword as jest.Mock).mockResolvedValue('/login');
  });

  async function setup() {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/set-password?token=tok"]}>
          <Routes>
            <Route path="/set-password" element={<PasswordSetup />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    return screen.getByLabelText(/password/i, { selector: 'input' });
  }

  it('updates checklist as user types', async () => {
    const input = await setup();
    expect(screen.getByTestId('min_length-close')).toBeInTheDocument();
    expect(screen.getByTestId('uppercase-close')).toBeInTheDocument();
    expect(screen.getByTestId('lowercase-close')).toBeInTheDocument();
    expect(screen.getByTestId('symbol-close')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Abcdefg' } });
    expect(screen.getByTestId('min_length-close')).toBeInTheDocument();
    expect(screen.getByTestId('uppercase-check')).toBeInTheDocument();
    expect(screen.getByTestId('lowercase-check')).toBeInTheDocument();
    expect(screen.getByTestId('symbol-close')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Abcdefg@' } });
    expect(screen.getByTestId('min_length-check')).toBeInTheDocument();
    expect(screen.getByTestId('symbol-check')).toBeInTheDocument();
  });

  it('keeps focus on the password field while typing', async () => {
    const input = await setup();

    const user = userEvent.setup();

    await user.click(input);
    expect(document.activeElement).toBe(input);

    await user.type(input, 'A');
    expect(document.activeElement).toBe(input);

    await user.type(input, 'b');
    expect(document.activeElement).toBe(input);
  });

  it('keeps focus when account info loads mid-entry', async () => {
    const pending = createDeferred<PasswordSetupInfo>();
    (getPasswordSetupInfo as jest.Mock).mockReturnValue(pending.promise);

    const input = await setup();
    const user = userEvent.setup();

    await user.click(input);
    await user.type(input, 'A');
    expect(document.activeElement).toBe(input);

    await act(async () => {
      pending.resolve({ clientId: '12345', email: 'user@example.com' });
      await pending.promise;
    });

    expect(await screen.findByText(/client id: 12345/i)).toBeInTheDocument();
    expect(await screen.findByText(/email: user@example.com/i)).toBeInTheDocument();
    expect(document.activeElement).toBe(input);

    await user.type(input, 'b');
    expect(document.activeElement).toBe(input);
  });

  it('shows validation errors', async () => {
    const input = await setup();
    fireEvent.change(input, { target: { value: 'Abcdefgh' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => expect(setPassword).not.toHaveBeenCalled());
    expect(
      await screen.findByText(/password must include a symbol/i),
    ).toBeInTheDocument();
  });
});
