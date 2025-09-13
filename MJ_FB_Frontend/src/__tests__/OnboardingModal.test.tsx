import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingModal from '../components/OnboardingModal';

describe('OnboardingModal', () => {
  beforeEach(() => localStorage.clear());

  it('shows and stores flag on close', () => {
    render(<OnboardingModal storageKey="test" title="T" body="B" />);
    expect(screen.getByText('T')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(localStorage.getItem('test')).toBe('true');
  });
});
