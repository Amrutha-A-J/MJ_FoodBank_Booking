import { screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import useMediaQuery from "@mui/material/useMediaQuery";
import VolunteerSchedule from "../pages/volunteer-management/VolunteerSchedule";
import { renderWithProviders } from "../../testUtils/renderWithProviders";
import {
  getVolunteerRolesForVolunteer,
  getMyVolunteerBookings,
  getVolunteerBookingsByRoles,
  requestVolunteerBooking,
  createRecurringVolunteerBooking,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
  rescheduleVolunteerBookingByToken,
  resolveVolunteerBookingConflict,
} from "../api/volunteers";
import { getHolidays } from "../api/bookings";
import { formatTime } from "../utils/time";

jest.mock("@mui/material/useMediaQuery");
const useMediaQueryMock = useMediaQuery as jest.MockedFunction<
  typeof useMediaQuery
>;
const actualUseMediaQuery =
  jest.requireActual("@mui/material/useMediaQuery").default;
useMediaQueryMock.mockImplementation(actualUseMediaQuery);

jest.mock("../api/volunteers", () => ({
  getVolunteerRolesForVolunteer: jest.fn(),
  getMyVolunteerBookings: jest.fn(),
  getVolunteerBookingsByRoles: jest.fn(),
  requestVolunteerBooking: jest.fn(),
  createRecurringVolunteerBooking: jest.fn(),
  cancelVolunteerBooking: jest.fn(),
  cancelRecurringVolunteerBooking: jest.fn(),
  rescheduleVolunteerBookingByToken: jest.fn(),
  resolveVolunteerBookingConflict: jest.fn(),
}));

jest.mock("../api/bookings", () => ({ getHolidays: jest.fn() }));

describe("VolunteerSchedule", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-29T19:00:00Z"));
    (getVolunteerBookingsByRoles as jest.Mock).mockResolvedValue([]);
    useMediaQueryMock.mockImplementation(actualUseMediaQuery);
  });

  afterEach(() => {
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
      name: "Previous",
    });
    expect(prev).toBeDisabled();

    expect(await screen.findByText(/No bookings\.?/)).toBeInTheDocument();
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
    (getVolunteerBookingsByRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: "approved",
        role_id: 1,
        date: "2024-01-29",
        start_time: "18:00:00",
        end_time: "20:00:00",
        role_name: "Greeter",
        volunteer_id: null,
      },
    ]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockImplementation((date: string) => {
      if (date === "2024-01-29") {
        return Promise.resolve([
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
        ]);
      }
      if (date === "2024-02-02") {
        return Promise.resolve([
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
      }
      return Promise.resolve([]);
    });

    renderWithProviders(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByText('Front'));

    await screen.findByRole('heading', { level: 4, name: 'Greeter' });
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    const myCell = within(rows[1]).getAllByRole('button')[0];
    await act(async () => {
      fireEvent.click(myCell);
    });
    const rescheduleBtn = await screen.findByRole('button', {
      name: /reschedule/i,
    });
    await act(async () => {
      fireEvent.click(rescheduleBtn);
    });

    const dateInputs = await screen.findAllByLabelText(/date/i);
    await act(async () => {
      fireEvent.change(dateInputs[0], {
        target: { value: '2024-02-02' },
      });
    });
    await waitFor(() =>
      expect(getVolunteerRolesForVolunteer).toHaveBeenCalledWith('2024-02-02'),
    );
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

    jest.setSystemTime(new Date("2024-01-29T14:00:00Z"));
    useMediaQueryMock.mockReturnValue(true);

    try {
      renderWithProviders(<VolunteerSchedule />);

      fireEvent.mouseDown(screen.getByLabelText("Department"));
      fireEvent.click(await screen.findByText("Front"));

      fireEvent.click(await screen.findByRole("button", { name: "Today" }));

      expect(
        await screen.findByRole("heading", { name: "Greeter" }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText("9:00 AM - 12:00 PM"),
      ).toBeInTheDocument();
      expect(screen.queryByRole("table")).toBeNull();
    } finally {
      useMediaQueryMock.mockImplementation(actualUseMediaQuery);
    }
  });

  it('books a slot via cell click', async () => {
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

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    const firstRow = rows[1];
    const firstSlotCell = within(firstRow).getAllByRole('cell')[1];
    await act(async () => {
      fireEvent.click(within(firstSlotCell).getAllByRole('button')[0]);
    });

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
