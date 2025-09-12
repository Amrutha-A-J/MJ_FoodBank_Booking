import ErrorBoundary from '../components/ErrorBoundary';
import { renderWithProviders, screen } from '../../testUtils/renderWithProviders';

function ProblemChild(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders fallback with reload button after an error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
