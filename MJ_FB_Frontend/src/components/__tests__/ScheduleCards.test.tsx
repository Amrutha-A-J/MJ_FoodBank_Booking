import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScheduleCards from "../ScheduleCards";

describe("ScheduleCards", () => {
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

    const grid = bookCell.parentElement?.parentElement as HTMLElement;
    expect(grid).toBeInTheDocument();

    const fillerBoxes = Array.from(grid.children).filter(
      (child) => child.childElementCount === 0
    );
    expect(fillerBoxes).toHaveLength(1);
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

    const cell = screen.getByText("Single");
    const grid = cell.parentElement?.parentElement as HTMLElement;
    expect(grid).toHaveStyle("grid-template-columns: repeat(1, 1fr)");
  });
});
