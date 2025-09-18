import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PrivacyNoticeModal from '../components/PrivacyNoticeModal';

jest.mock('../api/users', () => ({
  getUserProfile: jest.fn(),
  setUserConsent: jest.fn(),
}));

const { getUserProfile, setUserConsent } = jest.requireMock('../api/users');

describe('PrivacyNoticeModal', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    localStorage.clear();
    (getUserProfile as jest.Mock).mockResolvedValue({ consent: false });
    (setUserConsent as jest.Mock).mockResolvedValue(undefined);
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('shows passive consent copy with privacy policy link', async () => {
    render(<PrivacyNoticeModal />);

    expect(
      await screen.findByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element?.textContent === 'By using this app, you agree to our privacy policy.',
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toHaveAttribute('href', '/privacy');
  });

  it('persists dismissal exactly once', async () => {
    const view = render(<PrivacyNoticeModal />);

    const closeButton = await screen.findByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => expect(localStorage.getItem('privacy_consent')).toBe('true'));
    await waitFor(() => expect(setUserConsent).toHaveBeenCalledTimes(1));

    view.unmount();
    (getUserProfile as jest.Mock).mockClear();
    (setUserConsent as jest.Mock).mockClear();

    render(<PrivacyNoticeModal />);

    await waitFor(() => {
      expect(getUserProfile).not.toHaveBeenCalled();
      expect(setUserConsent).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
