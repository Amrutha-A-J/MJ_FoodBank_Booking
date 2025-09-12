import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventForm from '../components/EventForm';
import { createEvent, updateEvent } from '../api/events';

jest.mock('../api/events', () => ({
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
}));

describe('EventForm', () => {
  it('updates event data', async () => {
    (updateEvent as jest.Mock).mockResolvedValue({});
    render(
      <EventForm
        open
        onClose={() => {}}
        onSaved={() => {}}
        event={{
          id: 1,
          title: 'Old',
          details: '',
          category: 'harvest pantry',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          createdBy: 1,
          createdByName: '',
          visibleToVolunteers: false,
          visibleToClients: false,
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(updateEvent).toHaveBeenCalled());
  });
});
