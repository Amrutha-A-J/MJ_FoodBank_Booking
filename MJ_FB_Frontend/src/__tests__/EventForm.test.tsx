import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import EventForm from '../components/EventForm';
import { createEvent } from '../api/events';

jest.mock('../api/events', () => ({
  createEvent: jest.fn(),
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
  });

  it('submits event data', async () => {
    render(<EventForm open onClose={() => {}} onCreated={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: 'harvest pantry' } });
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2024-01-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2024-01-02' } });

    fireEvent.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalled());
    expect(createEvent).toHaveBeenCalledWith({
      title: 'Test',
      details: '',
      category: 'harvest pantry',
      startDate: '2024-01-01',
      endDate: '2024-01-02',
      visibleToVolunteers: false,
      visibleToClients: false,
    });
  });
});

