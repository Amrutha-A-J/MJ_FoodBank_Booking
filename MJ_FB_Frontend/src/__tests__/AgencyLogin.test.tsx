import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgencyLogin from '../pages/agency/Login';
import { loginAgency, resendPasswordSetup } from '../api/users';

jest.mock('../api/users', () => ({
  loginAgency: jest.fn(),
  resendPasswordSetup: jest.fn(),
}));

describe('AgencyLogin component', () => {
  it('shows friendly message on unauthorized error', async () => {
    const apiErr = Object.assign(new Error('backend'), { status: 401 });
    (loginAgency as jest.Mock).mockRejectedValue(apiErr);
    const onLogin = jest.fn();
    render(
      <MemoryRouter>
        <AgencyLogin onLogin={onLogin} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(
      await screen.findByText('Incorrect email or password')
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
