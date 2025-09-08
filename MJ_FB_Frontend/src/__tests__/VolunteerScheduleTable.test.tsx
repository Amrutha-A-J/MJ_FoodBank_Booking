import { render, screen } from "@testing-library/react";
import VolunteerScheduleTable from "../components/VolunteerScheduleTable";
import ScheduleCards from "../components/ScheduleCards";
import i18n from "../i18n";

describe("Schedule views", () => {
  it("handles maxSlots=0 gracefully in table view", () => {
    render(<VolunteerScheduleTable maxSlots={0} rows={[]} />);
    expect(screen.getByText("Slot 1")).toBeInTheDocument();
    expect(screen.getByText(i18n.t("no_bookings"))).toBeInTheDocument();
  });

  it("handles maxSlots=0 gracefully in card view", () => {
    render(<ScheduleCards maxSlots={0} rows={[]} />);
    expect(screen.getByText(i18n.t("no_bookings"))).toBeInTheDocument();
  });
});
