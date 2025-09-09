import {
  renderWithProviders,
  fireEvent,
  screen,
} from '../../../testUtils/renderWithProviders';
import FeedbackPrompt from '../FeedbackPrompt';
import { logEvent } from '../../analytics';

jest.mock('../../analytics', () => ({ logEvent: jest.fn() }));

describe('FeedbackPrompt', () => {
  it('submits feedback and shows thank you message', () => {
    renderWithProviders(<FeedbackPrompt open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Share your feedback/i), {
      target: { value: 'Great' },
    });
    fireEvent.click(screen.getByText(/Submit/i));
    expect(screen.getByText(/Thanks for your feedback!/i)).toBeInTheDocument();
    expect((logEvent as jest.Mock)).toHaveBeenCalledWith('feedback_submit');
  });
});
