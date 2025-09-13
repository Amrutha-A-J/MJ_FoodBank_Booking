import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManageVolunteerShiftDialog from '../components/ManageVolunteerShiftDialog';
import type { VolunteerBookingDetail } from '../types';

jest.mock('../api/volunteers', () => ({
  getRoleShifts: jest.fn(),
  getVolunteerBookingsByRole: jest.fn(),
  rescheduleVolunteerBookingByToken: jest.fn(),
  updateVolunteerBookingStatus: jest.fn(),
}));

const {
  getRoleShifts,
  getVolunteerBookingsByRole,
  rescheduleVolunteerBookingByToken,
  updateVolunteerBookingStatus,
} = jest.requireMock('../api/volunteers');

const originalMatchMedia = window.matchMedia;

describe('ManageVolunteerShiftDialog', () => {
  const booking: VolunteerBookingDetail = {
    id: 1,
    role_id: 1,
    volunteer_id: 2,
    volunteer_name: 'Vol',
    role_name: 'Pantry',
    date: '2024-02-01',
    start_time: '09:00:00',
    end_time: '12:00:00',
    status: 'approved',
    reschedule_token: 'abc',
    note: 'bring gloves',
  };

  beforeAll(() => {
    window.matchMedia =
      window.matchMedia ||
      ((query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }));
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    (getRoleShifts as jest.Mock).mockReset();
    (getVolunteerBookingsByRole as jest.Mock).mockReset();
    (rescheduleVolunteerBookingByToken as jest.Mock).mockReset();
    (updateVolunteerBookingStatus as jest.Mock).mockReset();
  });

  it('marks shift completed', async () => {
    const onUpdated = jest.fn();
    render(
      <ManageVolunteerShiftDialog open booking={booking} onClose={() => {}} onUpdated={onUpdated} />,
    );

    fireEvent.mouseDown(screen.getByLabelText(/status/i));
    fireEvent.click(await screen.findByRole('option', { name: /completed/i }));
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() =>
      expect(updateVolunteerBookingStatus).toHaveBeenCalledWith(1, 'completed'),
    );
    expect(onUpdated).toHaveBeenCalledWith('Status updated', 'success');
  });

  it('reschedules shift', async () => {
    (getRoleShifts as jest.Mock).mockResolvedValue([
      { shiftId: 10, startTime: '09:00:00', endTime: '12:00:00', maxVolunteers: 2 },
    ]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([]);

    const onUpdated = jest.fn();
    render(
      <ManageVolunteerShiftDialog open booking={booking} onClose={() => {}} onUpdated={onUpdated} />,
    );

    fireEvent.mouseDown(screen.getByLabelText(/status/i));
    fireEvent.click(await screen.findByRole('option', { name: /reschedule/i }));

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2024-02-02' },
    });

    fireEvent.mouseDown(await screen.findByLabelText('Shift'));
    fireEvent.click(await screen.findByRole('option', { name: /9:00/i }));

    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() =>
      expect(rescheduleVolunteerBookingByToken).toHaveBeenCalledWith('abc', 10, '2024-02-02'),
    );
    expect(onUpdated).toHaveBeenCalledWith('Booking rescheduled', 'success');
  });

  it('does not show unavailable shifts', async () => {
    (getRoleShifts as jest.Mock).mockResolvedValue([
      { shiftId: 10, startTime: '09:00:00', endTime: '12:00:00', maxVolunteers: 1 },
      { shiftId: 11, startTime: '12:00:00', endTime: '15:00:00', maxVolunteers: 2 },
    ]);
    (getVolunteerBookingsByRole as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 2,
          role_id: 10,
          volunteer_id: 3,
          date: '2024-02-02',
          start_time: '09:00:00',
          end_time: '12:00:00',
          status: 'approved',
        },
      ])
      .mockResolvedValueOnce([]);

    render(
      <ManageVolunteerShiftDialog open booking={booking} onClose={() => {}} onUpdated={() => {}} />,
    );

    fireEvent.mouseDown(screen.getByLabelText(/status/i));
    fireEvent.click(await screen.findByRole('option', { name: /reschedule/i }));

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2024-02-02' },
    });

    fireEvent.mouseDown(await screen.findByLabelText('Shift'));

    expect(screen.queryByRole('option', { name: /9:00/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /12:00/i })).toBeInTheDocument();
  });

  it('renders nothing when booking is null', () => {
    const { container } = render(
      <ManageVolunteerShiftDialog open booking={null} onClose={() => {}} onUpdated={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows note when provided', () => {
    render(<ManageVolunteerShiftDialog open booking={booking} onClose={() => {}} onUpdated={() => {}} />);
    expect(screen.getByText('Note: bring gloves')).toBeInTheDocument();
  });

  it('hides note when not provided', () => {
    const noNote = { ...booking, note: undefined };
    render(<ManageVolunteerShiftDialog open booking={noNote} onClose={() => {}} onUpdated={() => {}} />);
    expect(screen.queryByText(/Note:/)).toBeNull();
  });
});

