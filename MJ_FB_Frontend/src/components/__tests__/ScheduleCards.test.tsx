import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as mui from "@mui/material";
import ScheduleCards from "../ScheduleCards";

jest.mock("@mui/material", () => {
  const actual = jest.requireActual("@mui/material");
  return {
    ...actual,
    useMediaQuery: jest.fn(),
  };
});

describe("ScheduleCards", () => {
  const useMediaQueryMock = mui.useMediaQuery as jest.Mock;

  beforeEach(() => {
    useMediaQueryMock.mockReturnValue(false);
  });

  afterEach(() => {
    useMediaQueryMock.mockReset();
  });

  it("shows an empty state when there are no rows", () => {
    render(<ScheduleCards maxSlots={4} rows={[]} />);

    expect(screen.getByText("No bookings")).toBeInTheDocument();
  });

  it("renders cards with filler boxes up to max slots and handles clicks", async () => {
    const onClick = jest.fn();

    render(
      <ScheduleCards
        maxSlots={4}
        rows={[
          {
            time: "9:00 AM",
            cells: [
              { content: "Available", colSpan: 2 },
              { content: "Book", onClick },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText("9:00 AM")).toBeInTheDocument();

    const bookCell = screen.getByText("Book");
    await userEvent.click(bookCell);
    expect(onClick).toHaveBeenCalledTimes(1);

    const grid = screen.getByTestId("schedule-cells-0");

    const fillerBoxes = Array.from(grid.children).filter(
      (child) => child.childElementCount === 0
    );
    expect(fillerBoxes).toHaveLength(1);
  });

  it("renders stacked cells on small screens without filler boxes", async () => {
    const onClick = jest.fn();
    useMediaQueryMock.mockReturnValue(true);

    render(
      <ScheduleCards
        maxSlots={3}
        rows={[
          {
            time: "9:30 AM",
            cells: [
              { content: "First", backgroundColor: "rgb(0, 0, 0)" },
              { content: "Second", onClick },
            ],
          },
        ]}
      />
    );

    const grid = screen.getByTestId("schedule-cells-0");
    expect(grid).toHaveStyle("display: flex");
    expect(grid.childElementCount).toBe(2);

    const firstCell = screen.getByText("First");
    expect(firstCell).toHaveStyle("background-color: rgb(0, 0, 0)");

    const secondCell = screen.getByText("Second");
    await userEvent.click(secondCell);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("falls back to a single column when max slots is less than one", () => {
    render(
      <ScheduleCards
        maxSlots={0}
        rows={[
          {
            time: "10:00 AM",
            cells: [{ content: "Single" }],
          },
        ]}
      />
    );

    const grid = screen.getByTestId("schedule-cells-0");
    expect(grid).toHaveStyle("grid-template-columns: repeat(1, 1fr)");
  });
});
