import { render, screen, fireEvent } from '@testing-library/react';
import OverlapBookingDialog from '../components/OverlapBookingDialog';

test('calls resolve with choice', () => {
  const attempted = {
    role_id: 1,
    role_name: 'Greeter',
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: '12:00:00',
  };
  const existing = {
    id: 2,
    role_id: 3,
    role_name: 'Sorter',
    date: '2024-01-01',
    start_time: '10:00:00',
    end_time: '13:00:00',
  };
  const onResolve = jest.fn();
  render(
    <OverlapBookingDialog
      open
      attempted={attempted}
      existing={existing}
      onClose={() => {}}
      onResolve={onResolve}
    />,
  );
  fireEvent.click(screen.getByText(/Replace with New Shift/i));
  expect(onResolve).toHaveBeenCalledWith('new');
});

test('formats ISO date strings', () => {
  const attempted = {
    role_id: 1,
    role_name: 'Greeter',
    date: '2024-01-01T06:00:00.000Z',
    start_time: '09:00:00',
    end_time: '12:00:00',
  };
  const existing = {
    id: 2,
    role_id: 3,
    role_name: 'Sorter',
    date: '2024-01-01',
    start_time: '10:00:00',
    end_time: '13:00:00',
  };
  render(
    <OverlapBookingDialog
      open
      attempted={attempted}
      existing={existing}
      onClose={() => {}}
      onResolve={() => {}}
    />,
  );
  expect(
    screen.getByText('2024-01-01 · 9:00 AM–12:00 PM'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('2024-01-01 · 10:00 AM–1:00 PM'),
  ).toBeInTheDocument();
});
