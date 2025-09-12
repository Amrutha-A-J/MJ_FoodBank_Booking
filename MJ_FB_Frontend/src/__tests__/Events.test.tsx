import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import Events from '../pages/events/Events';
import { getEvents, deleteEvent, updateEvent } from '../api/events';

jest.mock('../api/events', () => ({
  getEvents: jest.fn(),
  deleteEvent: jest.fn(),
  updateEvent: jest.fn(),
  createEvent: jest.fn(),
}));

jest.mock('@mui/x-date-pickers', () => {
  const TextField = require('@mui/material/TextField').default;
  const dayjs = require('dayjs');
  return {
    LocalizationProvider: ({ children }: any) => <>{children}</>,
    DatePicker: ({ label, value, onChange, slotProps }: any) => (
      <TextField
        label={label}
        value={value ? dayjs(value).format('YYYY-MM-DD') : ''}
        onChange={e => onChange(dayjs(e.target.value))}
        {...(slotProps?.textField || {})}
      />
    ),
  };
});

describe('Events page', () => {
  beforeEach(() => {
    (getEvents as jest.Mock).mockReset();
    (deleteEvent as jest.Mock).mockReset();
    (updateEvent as jest.Mock).mockReset();
  });
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
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/close/i));

    expect(deleteEventMock).not.toHaveBeenCalled();
  });

  it('edits an event', async () => {
    const getEventsMock = getEvents as jest.Mock;
    const updateEventMock = updateEvent as jest.Mock;
    getEventsMock.mockResolvedValue({
      today: [],
      upcoming: [
        {
          id: 1,
          title: 'Edit Me',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          createdBy: 1,
          createdByName: 'Alice Smith',
          details: '',
          category: 'harvest pantry',
          visibleToVolunteers: false,
          visibleToClients: false,
        },
      ],
      past: [],
    });
    updateEventMock.mockResolvedValue({});

    render(<Events />);

    await waitFor(() => expect(getEventsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText(/edit/i));
    const titleInput = await screen.findByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() =>
      expect(updateEventMock).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: 'Updated',
          category: 'harvest pantry',
          details: '',
        }),
      ),
    );
    await waitFor(() => expect(getEventsMock).toHaveBeenCalledTimes(2));
  });
});
