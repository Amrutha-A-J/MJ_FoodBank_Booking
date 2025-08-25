import { render, screen, waitFor } from '@testing-library/react';
import Events from '../pages/events/Events';
import { getEvents } from '../api/events';

jest.mock('../api/events', () => ({
  getEvents: jest.fn(),
}));

describe('Events page', () => {
  it('handles undefined API responses gracefully', async () => {
    const getEventsMock = getEvents as jest.Mock;
    getEventsMock.mockResolvedValue(undefined);

    render(<Events />);

    await waitFor(() => expect(getEventsMock).toHaveBeenCalled());
    expect(screen.getAllByText(/no events/i)).toHaveLength(3);
  });

  it('renders events in correct sections', async () => {
    const getEventsMock = getEvents as jest.Mock;
    getEventsMock.mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Today Event',
          date: new Date().toISOString(),
          createdBy: 1,
        },
      ],
      upcoming: [
        {
          id: 2,
          title: 'Future Event',
          date: new Date(Date.now() + 86400000).toISOString(),
          createdBy: 1,
        },
      ],
      past: [
        {
          id: 3,
          title: 'Past Event',
          date: new Date(Date.now() - 86400000).toISOString(),
          createdBy: 1,
        },
      ],
    });

    render(<Events />);

    await waitFor(() => expect(getEventsMock).toHaveBeenCalled());

    expect(screen.getByText(/Today Event/)).toBeInTheDocument();
    expect(screen.getByText(/Future Event/)).toBeInTheDocument();
    expect(screen.getByText(/Past Event/)).toBeInTheDocument();
  });
});
