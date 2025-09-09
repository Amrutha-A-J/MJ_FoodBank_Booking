import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingModal from '../components/OnboardingModal';
import i18n from '../i18n';

describe('OnboardingModal', () => {
  beforeEach(() => localStorage.clear());

  it('shows and stores flag on close', () => {
    render(<OnboardingModal storageKey="test" title="T" body="B" />);
    expect(screen.getByText('T')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('onboarding.close') }));
    expect(localStorage.getItem('test')).toBe('true');
  });
});
