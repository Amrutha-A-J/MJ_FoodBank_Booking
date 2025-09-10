import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PasswordSetup from '../PasswordSetup';
import { setPassword, getPasswordSetupInfo } from '../../../api/users';

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

  function setup() {
    render(
      <MemoryRouter initialEntries={["/set-password?token=tok"]}>
        <Routes>
          <Route path="/set-password" element={<PasswordSetup />} />
        </Routes>
      </MemoryRouter>,
    );
    return screen.getByLabelText(/password/i, { selector: 'input' });
  }

  it('updates checklist as user types', () => {
    const input = setup();
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

  it('shows validation errors', async () => {
    const input = setup();
    fireEvent.change(input, { target: { value: 'Abcdefgh' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => expect(setPassword).not.toHaveBeenCalled());
    expect(
      await screen.findByText(/password must include a symbol/i),
    ).toBeInTheDocument();
  });
});
