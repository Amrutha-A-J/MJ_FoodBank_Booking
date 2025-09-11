import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useSnackbar from './useSnackbar';

function TestComponent() {
  const { open, message, severity, showSnackbar, closeSnackbar } = useSnackbar();
  return (
    <div>
      <button onClick={() => showSnackbar('Hello', 'error')}>show</button>
      <button onClick={closeSnackbar}>close</button>
      <div data-testid="state">{JSON.stringify({ open, message, severity })}</div>
    </div>
  );
}

describe('useSnackbar', () => {
  it('shows and hides messages with severity', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    expect(screen.getByTestId('state')).toHaveTextContent(
      JSON.stringify({ open: false, message: '', severity: 'success' }),
    );
    await user.click(screen.getByText('show'));
    expect(screen.getByTestId('state')).toHaveTextContent(
      JSON.stringify({ open: true, message: 'Hello', severity: 'error' }),
    );
    await user.click(screen.getByText('close'));
    expect(screen.getByTestId('state')).toHaveTextContent(
      JSON.stringify({ open: false, message: 'Hello', severity: 'error' }),
    );
  });
});

