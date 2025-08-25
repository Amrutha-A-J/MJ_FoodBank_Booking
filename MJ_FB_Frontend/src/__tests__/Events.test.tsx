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
});
