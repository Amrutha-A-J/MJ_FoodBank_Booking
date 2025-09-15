import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import EventForm from '../components/EventForm';
import { createEvent, updateEvent } from '../api/events';

jest.mock('../api/events', () => ({
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
}));

jest.mock('@mui/x-date-pickers', () => {
  const TextField = require('@mui/material/TextField').default;
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

describe('EventForm', () => {
    beforeEach(() => {
      (createEvent as jest.Mock).mockResolvedValue({});
      (updateEvent as jest.Mock).mockResolvedValue({});
    });

  it('submits event data', async () => {
      render(<EventForm open onClose={() => {}} onSaved={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test' } });
    fireEvent.mouseDown(screen.getByLabelText(/Category/i));
    fireEvent.click(await screen.findByRole('option', { name: /harvest pantry/i }));
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2024-01-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2024-01-02' } });

    fireEvent.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() =>
      expect(createEvent).toHaveBeenCalledWith({
        title: 'Test',
        details: '',
        category: 'harvest pantry',
        startDate: expect.any(String),
        endDate: expect.any(String),
        visibleToVolunteers: false,
        visibleToClients: false,
      }),
    );
  });

  it('updates event data when editing', async () => {
    const event = {
      id: 1,
      title: 'Old',
      startDate: '2024-01-01',
      endDate: '2024-01-02',
      category: 'harvest pantry',
      createdBy: 1,
      createdByName: 'Alice',
      priority: 0,
    } as any;
    render(<EventForm open onClose={() => {}} onSaved={() => {}} event={event} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() =>
      expect(updateEvent).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: 'New' }),
      ),
    );
  });
});

