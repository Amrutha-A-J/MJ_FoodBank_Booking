import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import EventForm from '../components/EventForm';
import { createEvent } from '../api/events';
import { searchStaff } from '../api/staff';

jest.mock('../api/events', () => ({
  createEvent: jest.fn(),
}));

jest.mock('../api/staff', () => ({
  searchStaff: jest.fn(),
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
    (searchStaff as jest.Mock).mockResolvedValue([]);
  });

  it('submits without staff selection', async () => {
    render(<EventForm open onClose={() => {}} onCreated={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: 'harvest pantry' } });
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2024-01-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2024-01-02' } });

    fireEvent.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalled());
    expect((createEvent as jest.Mock).mock.calls[0][0].staffIds).toEqual([]);
  });

  it('submits with selected staff', async () => {
    (searchStaff as jest.Mock).mockResolvedValue([{ id: 1, name: 'Alice' }]);
    render(<EventForm open onClose={() => {}} onCreated={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: 'harvest pantry' } });
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2024-01-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2024-01-02' } });

    const staffInput = screen.getByLabelText(/Staff Involved/i);
    fireEvent.change(staffInput, { target: { value: 'Ali' } });
    await waitFor(() => expect(searchStaff).toHaveBeenCalledWith('Ali'));
    const option = await screen.findByText('Alice');
    fireEvent.click(option);

    fireEvent.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalled());
    expect((createEvent as jest.Mock).mock.calls[0][0].staffIds).toEqual([1]);
  });
});
