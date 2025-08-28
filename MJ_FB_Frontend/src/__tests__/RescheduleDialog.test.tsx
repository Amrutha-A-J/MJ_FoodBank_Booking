import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RescheduleDialog from '../components/RescheduleDialog';

jest.mock('../api/bookings', () => ({
  getSlots: jest.fn(),
  rescheduleBookingByToken: jest.fn(),
}));

const { getSlots } = jest.requireMock('../api/bookings');

describe('RescheduleDialog', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:30:00'));
    window.matchMedia =
      window.matchMedia ||
      ((() => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
      })) as any);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    (getSlots as jest.Mock).mockReset();
  });

  it('disables past dates', () => {
    render(
      <RescheduleDialog
        open
        rescheduleToken=""
        onClose={() => {}}
        onRescheduled={() => {}}
      />,
    );
    const dateInput = screen.getByLabelText(/date/i);
    expect(dateInput).toHaveAttribute('min', '2024-01-01');
  });

  it('filters out past slots for today', async () => {
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 1 },
      { id: '2', startTime: '11:00:00', endTime: '11:30:00', available: 1 },
    ]);

    render(
      <RescheduleDialog
        open
        rescheduleToken=""
        onClose={() => {}}
        onRescheduled={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2024-01-01' },
    });

    await screen.findByText(/11:00 am/i);
    expect(screen.queryByText(/9:00 am/i)).toBeNull();
    expect(screen.getByText(/11:00 am/i)).toBeInTheDocument();
  });
});
