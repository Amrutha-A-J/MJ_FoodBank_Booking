import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { login } from '../../../api/users';
import i18n from '../../../i18n';

jest.mock('../../../api/users', () => ({
  ...jest.requireActual('../../../api/users'),
  login: jest.fn(),
}));

describe('Login error handling', () => {
  it('shows account not found message', async () => {
    (login as jest.Mock).mockRejectedValue({ status: 404, message: 'Account not found' });
    const onLogin = jest.fn().mockResolvedValue('/');
    localStorage.setItem('clientLoginNoticeCount', '3');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/client id or email/i), { target: { value: 'missing@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getByText(/don’t have an account/i)).toBeInTheDocument();
    });
  });

  it('announces notice dialog title', () => {
    localStorage.removeItem('clientLoginNoticeCount');
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>,
    );
    const title = screen.getByRole('heading', { name: i18n.t('login_notice_title') });
    expect(title).toHaveAttribute('id', 'login-notice-title');
    expect(screen.getByRole('dialog', { name: i18n.t('login_notice_title') })).toHaveAttribute(
      'aria-labelledby',
      'login-notice-title',
    );
  });
});
