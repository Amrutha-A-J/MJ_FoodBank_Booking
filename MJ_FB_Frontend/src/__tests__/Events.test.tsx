import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Events from '../pages/events/Events';
import { getEvents, deleteEvent, updateEvent } from '../api/events';

jest.mock('../api/events', () => ({
  getEvents: jest.fn(),
  deleteEvent: jest.fn(),
  updateEvent: jest.fn(),
}));

jest.mock('@mui/x-date-pickers', () => {
  const TextField = require('@mui/material/TextField').default;
  return {
    LocalizationProvider: ({ children }: any) => <>{children}</>,
    DatePicker: ({ label, value, onChange, slotProps }: any) => (
      <TextField
        label={label}
        value={value ? new Date(value).toISOString().slice(0, 10) : ''}
        onChange={e => onChange(new Date(e.target.value).toISOString())}
        {...(slotProps?.textField || {})}
      />
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Events page', () => {
  it('handles undefined API responses gracefully', async () => {
    const getEventsMock = getEvents as jest.Mock;
    getEventsMock.mockResolvedValue(undefined);

    render(<Events />);

    await waitFor(() => expect(getEventsMock).toHaveBeenCalled());
    expect(screen.getAllByText(/no events/i)).toHaveLength(3);
  });

  it('renders events in correct sections and order', async () => {
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
          priority: 1,
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
          priority: 0,
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
          priority: 0,
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
          priority: 0,
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
          priority: 0,
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

    it('reorders events when priority buttons are used', async () => {
    const getEventsMock = getEvents as jest.Mock;
    const updateEventMock = updateEvent as jest.Mock;
    getEventsMock
      .mockResolvedValueOnce({
        today: [
          {
            id: 1,
            title: 'Low',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            createdBy: 1,
            createdByName: 'Alice Smith',
            priority: 0,
          },
        ],
        upcoming: [],
        past: [],
      })
      .mockResolvedValueOnce({
        today: [
          {
            id: 1,
            title: 'Low',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            createdBy: 1,
            createdByName: 'Alice Smith',
            priority: 1,
          },
        ],
        upcoming: [],
        past: [],
      });
    updateEventMock.mockResolvedValue({ id: 1, priority: 1 });

    render(<Events />);

    await waitFor(() => expect(getEventsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText(/move up/i));

    await waitFor(() => expect(updateEventMock).toHaveBeenCalledWith(1, { priority: 1 }));
    await waitFor(() => expect(getEventsMock).toHaveBeenCalledTimes(2));
    });

    it('edits an event', async () => {
      const getEventsMock = getEvents as jest.Mock;
      const updateEventMock = updateEvent as jest.Mock;
      const event = {
        id: 1,
        title: 'Old',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        createdBy: 1,
        createdByName: 'Alice Smith',
        priority: 0,
      };
      getEventsMock
        .mockResolvedValueOnce({ today: [event], upcoming: [], past: [] })
        .mockResolvedValueOnce({ today: [{ ...event, title: 'New' }], upcoming: [], past: [] });
      updateEventMock.mockResolvedValue({});

      render(<Events />);

      await waitFor(() => expect(getEventsMock).toHaveBeenCalled());

      fireEvent.click(screen.getByLabelText(/edit/i));
      fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New' } });
      fireEvent.click(screen.getByRole('button', { name: /Save/i }));

      await waitFor(() => expect(updateEventMock).toHaveBeenCalled());
      expect(updateEventMock).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'New' }));
      await waitFor(() => expect(getEventsMock).toHaveBeenCalledTimes(2));
    });
  });
