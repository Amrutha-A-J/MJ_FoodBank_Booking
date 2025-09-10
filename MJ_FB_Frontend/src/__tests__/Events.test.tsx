import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Events from '../pages/events/Events';
import { getEvents, deleteEvent } from '../api/events';

jest.mock('../api/events', () => ({
  getEvents: jest.fn(),
  deleteEvent: jest.fn(),
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
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          createdBy: 1,
          createdByName: 'Alice Smith',
          details: 'Details today',
        },
      ],
      upcoming: [
        {
          id: 2,
          title: 'Future Event',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
          createdBy: 1,
          createdByName: 'Alice Smith',
          details: 'Future details',
        },
      ],
      past: [
        {
          id: 3,
          title: 'Past Event',
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date(Date.now() - 86400000).toISOString(),
          createdBy: 1,
          createdByName: 'Alice Smith',
          details: 'Past details',
        },
      ],
    });

    render(<Events />);

    await waitFor(() => expect(getEventsMock).toHaveBeenCalled());

    expect(screen.getByText(/Today Event/)).toBeInTheDocument();
    expect(screen.getByText(/Future Event/)).toBeInTheDocument();
    expect(screen.getByText(/Past Event/)).toBeInTheDocument();
    expect(screen.getAllByText(/Created by Alice Smith/)).toHaveLength(3);
    expect(screen.getByText(/Details today/)).toBeInTheDocument();
  });

  it('deletes an event after confirmation', async () => {
    const getEventsMock = getEvents as jest.Mock;
    const deleteEventMock = deleteEvent as jest.Mock;
    getEventsMock.mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Delete Me',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          createdBy: 1,
          createdByName: 'Alice Smith',
        },
      ],
      upcoming: [],
      past: [],
    });
    deleteEventMock.mockResolvedValue({ message: 'Deleted' });

    render(<Events />);

    await waitFor(() => expect(getEventsMock).toHaveBeenCalled());

    const delButton = screen.getByLabelText(/delete/i);
    fireEvent.click(delButton);

    expect(screen.getByText(/Delete Delete Me/)).toBeInTheDocument();
    expect(deleteEventMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(deleteEventMock).toHaveBeenCalledWith(1));
  });

  it('cancels deletion when dialog is closed', async () => {
    const getEventsMock = getEvents as jest.Mock;
    const deleteEventMock = deleteEvent as jest.Mock;
    getEventsMock.mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Delete Me',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          createdBy: 1,
          createdByName: 'Alice Smith',
        },
      ],
      upcoming: [],
      past: [],
    });
    deleteEventMock.mockResolvedValue({ message: 'Deleted' });

    render(<Events />);

    await waitFor(() => expect(getEventsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText(/delete/i));
    fireEvent.click(screen.getByLabelText(/close/i));

    expect(deleteEventMock).not.toHaveBeenCalled();
  });
});
