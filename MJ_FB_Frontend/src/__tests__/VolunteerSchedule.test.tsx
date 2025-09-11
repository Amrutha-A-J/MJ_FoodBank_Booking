import { screen, fireEvent, waitFor } from "@testing-library/react";
import * as mui from "@mui/material";
import VolunteerSchedule from "../pages/volunteer-management/VolunteerSchedule";
import i18n from "../i18n";
import { renderWithProviders } from "../../testUtils/renderWithProviders";
import {
  getVolunteerRolesForVolunteer,
  getMyVolunteerBookings,
  requestVolunteerBooking,
  createRecurringVolunteerBooking,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
  rescheduleVolunteerBookingByToken,
  resolveVolunteerBookingConflict,
  getVolunteerBookingsByRoles,
} from "../api/volunteers";
import { getHolidays } from "../api/bookings";
import { formatTime } from "../utils/time";

class EventSourceMock {
  constructor(public url: string) {}
  onmessage: ((event: { data: string }) => void) | null = null;
  close() {}
}

beforeEach(() => {
  (global as any).EventSource = EventSourceMock as any;
});

afterEach(() => {
  delete (global as any).EventSource;
});

jest.mock("../api/volunteers", () => ({
  getVolunteerRolesForVolunteer: jest.fn(),
  getMyVolunteerBookings: jest.fn(),
  requestVolunteerBooking: jest.fn(),
  createRecurringVolunteerBooking: jest.fn(),
  cancelVolunteerBooking: jest.fn(),
  cancelRecurringVolunteerBooking: jest.fn(),
  rescheduleVolunteerBookingByToken: jest.fn(),
  resolveVolunteerBookingConflict: jest.fn(),
  getVolunteerBookingsByRoles: jest.fn(),
}));

jest.mock("../api/bookings", () => ({ getHolidays: jest.fn() }));

describe("VolunteerSchedule", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-29T19:00:00Z"));
    (getVolunteerBookingsByRoles as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.useFakeTimers();
    jest.setSystemTime(new Date());
    jest.useRealTimers();
  });

  it('renders a table for each role in the selected department', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '14:00:00',
        end_time: '16:00:00',
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: 'available',
        date: '2024-01-29',
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
      {
        id: 2,
        role_id: 2,
        name: 'Cleaner',
        start_time: '16:00:00',
        end_time: '18:00:00',
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: 'available',
        date: '2024-01-29',
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);

    renderWithProviders(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByText('Front'));

    expect(await screen.findByText('Greeter')).toBeInTheDocument();
    expect(await screen.findByText('Cleaner')).toBeInTheDocument();
  });

  it("disables past days and hides past slots", async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: "Greeter",
        start_time: "9:00:00",
        end_time: "12:00:00",
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: "available",
        date: "2024-01-29",
        category_id: 1,
        category_name: "Front",
        is_wednesday_slot: false,
      },
    ]);

    renderWithProviders(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByText('Front'));

    expect(await screen.findByText('Greeter')).toBeInTheDocument();

    const prev = await screen.findByRole("button", {
      name: i18n.t("previous"),
    });
    expect(prev).toBeDisabled();

    expect(await screen.findByText(i18n.t("no_bookings"))).toBeInTheDocument();
  });

  it("shows only available slots in reschedule dialog", async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        status: "approved",
        date: "2024-01-29",
        start_time: "18:00:00",
        end_time: "20:00:00",
        role_name: "Greeter",
      },
    ]);
    (getVolunteerRolesForVolunteer as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 1,
          role_id: 1,
          name: "Greeter",
          start_time: "18:00:00",
          end_time: "20:00:00",
          max_volunteers: 1,
          booked: 1,
          available: 0,
          status: "open",
          date: "2024-01-29",
          category_id: 1,
          category_name: "Front",
          is_wednesday_slot: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          role_id: 1,
          name: "Greeter",
          start_time: "09:00:00",
          end_time: "12:00:00",
          max_volunteers: 1,
          booked: 1,
          available: 0,
          status: "open",
          date: "2024-02-02",
          category_id: 1,
          category_name: "Front",
          is_wednesday_slot: false,
        },
        {
          id: 3,
          role_id: 1,
          name: "Greeter",
          start_time: "12:00:00",
          end_time: "15:00:00",
          max_volunteers: 1,
          booked: 0,
          available: 1,
          status: "open",
          date: "2024-02-02",
          category_id: 1,
          category_name: "Front",
          is_wednesday_slot: false,
        },
      ]);

    renderWithProviders(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByText('Front'));

    fireEvent.click(await screen.findByText("My Booking"));
    fireEvent.click(await screen.findByRole("button", { name: /reschedule/i }));

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2024-02-02" },
    });

    fireEvent.mouseDown(await screen.findByLabelText(/role/i));

    expect(
      screen.queryByText(
        `Greeter ${formatTime("09:00:00")}–${formatTime("12:00:00")}`,
      ),
    ).toBeNull();
    expect(
      await screen.findByText(
        `Greeter ${formatTime("12:00:00")}–${formatTime("15:00:00")}`,
      ),
    ).toBeInTheDocument();
  });

  it("renders cards on small screens", async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: "Greeter",
        start_time: "9:00:00",
        end_time: "12:00:00",
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: "available",
        date: "2024-01-29",
        category_id: 1,
        category_name: "Front",
        is_wednesday_slot: false,
      },
    ]);

    const mq = jest.spyOn(mui, "useMediaQuery").mockReturnValue(true);
    renderWithProviders(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByText('Front'));

    expect(await screen.findByText(i18n.t("no_bookings"))).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    mq.mockRestore();
  });

  it('books a slot via Sign Up button', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '18:00:00',
        end_time: '20:00:00',
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: 'open',
        date: '2024-01-29',
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);
    (requestVolunteerBooking as jest.Mock).mockResolvedValue({});

    renderWithProviders(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByText('Front'));

    fireEvent.click(await screen.findByRole('button', { name: /sign up/i }));

    await waitFor(() => expect(requestVolunteerBooking).toHaveBeenCalled());
  });

  it('jumps to today when Today is clicked', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '9:00:00',
        end_time: '12:00:00',
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: 'available',
        date: '2024-01-29',
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);

    renderWithProviders(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByText('Front'));

    const nextBtn = await screen.findByRole('button', { name: 'Next' });
    fireEvent.click(nextBtn);

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 3 }),
      ).toHaveTextContent('2024-01-30'),
    );

    const todayBtn = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayBtn);

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 3 }),
      ).toHaveTextContent('2024-01-29'),
    );
  });

  it('shows closed message and title on weekends', async () => {
    jest.setSystemTime(new Date('2024-02-03T19:00:00Z'));
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<VolunteerSchedule />);

    expect(
      await screen.findByText('Moose Jaw food bank is closed for Saturday'),
    ).toBeInTheDocument();
    expect(document.title).toBe(
      'MJ Foodbank - Volunteer Schedule - Closed for Saturday',
    );
  });

  it('shows closed message and title on holidays', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([
      { date: '2024-01-29', reason: 'Family Day' },
    ]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<VolunteerSchedule />);

    expect(
      await screen.findByText('Moose Jaw food bank is closed for Family Day'),
    ).toBeInTheDocument();
    expect(document.title).toBe(
      'MJ Foodbank - Volunteer Schedule - Closed for Family Day',
    );
  });
});
