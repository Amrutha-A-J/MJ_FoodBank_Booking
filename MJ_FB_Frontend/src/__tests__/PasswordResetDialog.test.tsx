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

  it('disables submit button when identifier is blank', () => {
    render(<PasswordResetDialog open onClose={() => {}} />);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/email or client id/i), {
      target: { value: '   ' },
    });

    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/email or client id/i), {
      target: { value: 'user@example.com' },
    });

    expect(submitButton).toBeEnabled();
  });

  it('shows inline error when submitting an empty identifier', async () => {
    render(<PasswordResetDialog open onClose={() => {}} />);

    const form = screen.getByLabelText(/email or client id/i).closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    await waitFor(() =>
      expect(screen.getByText('Enter your email or client ID.')).toBeInTheDocument(),
    );

    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('submits email identifier', async () => {
    render(<PasswordResetDialog open onClose={() => {}} />);
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

  it('clears inline error when entering a valid identifier after an empty submission', async () => {
    render(<PasswordResetDialog open onClose={() => {}} />);

    const form = screen.getByLabelText(/email or client id/i).closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    await waitFor(() =>
      expect(screen.getByText('Enter your email or client ID.')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/email or client id/i), {
      target: { value: 'user@example.com' },
    });

    await waitFor(() =>
      expect(screen.queryByText('Enter your email or client ID.')).not.toBeInTheDocument(),
    );
  });

  it('submits numeric client identifier', async () => {
    render(<PasswordResetDialog open onClose={() => {}} />);
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

  it('trims whitespace around email identifier before submitting', async () => {
    render(<PasswordResetDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/email or client id/i), {
      target: { value: '  spaced@example.com  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith({
        email: 'spaced@example.com',
      }),
    );
  });

  it('trims whitespace around numeric identifier before submitting', async () => {
    render(<PasswordResetDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/email or client id/i), {
      target: { value: '  67890  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith({
        clientId: '67890',
      }),
    );
  });
});
