import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PasswordResetDialog from '../components/PasswordResetDialog';
import { requestPasswordReset } from '../api/users';

jest.mock('../api/users');

describe('PasswordResetDialog', () => {
  beforeEach(() => {
    (requestPasswordReset as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('submits email identifier', async () => {
    render(<PasswordResetDialog open onClose={() => {}} type="user" />);
    fireEvent.change(screen.getByLabelText(/email or client id/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith({
        email: 'user@example.com',
      }),
    );
  });

  it('submits numeric client identifier', async () => {
    render(<PasswordResetDialog open onClose={() => {}} type="user" />);
    fireEvent.change(screen.getByLabelText(/email or client id/i), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith({
        clientId: '12345',
      }),
    );
  });
});
