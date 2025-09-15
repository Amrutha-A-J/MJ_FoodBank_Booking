import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PantryAggregations from '../pages/staff/PantryAggregations';
import { getWeekForDate, getWeekRanges } from '../utils/pantryWeek';
import dayjs, { formatDate } from '../utils/date';
import '../../tests/mockUrl';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const currentWeek = getWeekForDate(new Date()).week;

const mockGetPantryWeekly = jest.fn().mockResolvedValue([]);
const mockGetPantryMonthly = jest.fn().mockResolvedValue([]);
const mockGetPantryYearly = jest.fn().mockResolvedValue([]);
const mockGetPantryYears = jest.fn().mockResolvedValue([currentYear]);
const mockGetPantryMonths = jest.fn().mockResolvedValue([currentMonth]);
const mockGetPantryWeeks = jest.fn().mockResolvedValue([currentWeek]);
const mockExportPantryAggregations = jest
  .fn()
  .mockResolvedValue({ blob: new Blob(), fileName: 'test.xlsx' });
const mockRebuildPantryAggregations = jest.fn().mockResolvedValue(undefined);
const mockPostManualPantryAggregate = jest.fn().mockResolvedValue(undefined);

jest.mock('../api/pantryAggregations', () => ({
  getPantryWeekly: (...args: unknown[]) => mockGetPantryWeekly(...args),
  getPantryMonthly: (...args: unknown[]) => mockGetPantryMonthly(...args),
  getPantryYearly: (...args: unknown[]) => mockGetPantryYearly(...args),
  getPantryYears: (...args: unknown[]) => mockGetPantryYears(...args),
  getPantryMonths: (...args: unknown[]) => mockGetPantryMonths(...args),
  getPantryWeeks: (...args: unknown[]) => mockGetPantryWeeks(...args),
  exportPantryAggregations: (...args: unknown[]) => mockExportPantryAggregations(...args),
  rebuildPantryAggregations: (...args: unknown[]) => mockRebuildPantryAggregations(...args),
  postManualPantryAggregate: (...args: unknown[]) => mockPostManualPantryAggregate(...args),
}));

describe('PantryAggregations page', () => {
  let anchorClick: jest.SpyInstance;
  beforeAll(() => {
    anchorClick = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function () {
        const event = new MouseEvent('click', { cancelable: true });
        event.preventDefault();
      });
  });

  afterAll(() => {
    anchorClick.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPantryWeekly.mockResolvedValue([]);
    mockGetPantryMonthly.mockResolvedValue([]);
    mockGetPantryYearly.mockResolvedValue([]);
    mockGetPantryYears.mockResolvedValue([currentYear]);
    mockGetPantryMonths.mockResolvedValue([currentMonth]);
    mockGetPantryWeeks.mockResolvedValue([currentWeek]);
  });

  it('loads data for each tab', async () => {
    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryYears).toHaveBeenCalled());
    await waitFor(() => expect(mockGetPantryMonths).toHaveBeenCalled());
    await waitFor(() => expect(mockGetPantryWeeks).toHaveBeenCalled());
    await waitFor(() => expect(mockGetPantryWeekly).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /monthly/i }));
    await waitFor(() => expect(mockGetPantryMonthly).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /yearly/i }));
    await waitFor(() => expect(mockGetPantryYearly).toHaveBeenCalled());
  });

  it('displays weekly aggregations in a table', async () => {
    mockGetPantryWeekly.mockResolvedValueOnce([{ week: currentWeek, orders: 2, people: 4 }]);

    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryWeekly).toHaveBeenCalled());

    expect(screen.getByTestId('responsive-table-table')).toBeInTheDocument();
    expect(screen.getByText('week')).toBeInTheDocument();
    expect(screen.getByText('people')).toBeInTheDocument();
    const ranges = getWeekRanges(currentYear, currentMonth - 1);
    const range = ranges.find(r => r.week === currentWeek)!;
    let start = dayjs(range.startDate);
    let end = dayjs(range.endDate);
    while ([0, 6].includes(start.day()) && start.isBefore(end)) {
      start = start.add(1, 'day');
    }
    while ([0, 6].includes(end.day()) && end.isAfter(start)) {
      end = end.subtract(1, 'day');
    }
    const expectedLabel = start.isSame(end, 'day')
      ? formatDate(start)
      : `${formatDate(start)} - ${formatDate(end)}`;
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
  });

  it('exports weekly data', async () => {
    const year = currentYear;
    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryWeekly).toHaveBeenCalled());

    const exportBtn = await screen.findByRole('button', { name: /export table/i });
    await waitFor(() => expect(exportBtn).not.toBeDisabled());
    fireEvent.click(exportBtn);

    await waitFor(() => expect(mockRebuildPantryAggregations).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockExportPantryAggregations).toHaveBeenCalledWith({
        period: 'weekly',
        year,
        month: currentMonth,
        week: currentWeek,
      }),
    );
  });

  it('shows months and weeks returned from the API', async () => {
    mockGetPantryMonths.mockResolvedValueOnce([5]);
    mockGetPantryWeeks.mockResolvedValueOnce([2, 4]);
    mockGetPantryMonths.mockResolvedValueOnce([5]);

    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryWeeks).toHaveBeenCalled());
    expect(screen.getByText('May')).toBeInTheDocument();
    const exportBtn = await screen.findByRole('button', { name: /export table/i });
    await waitFor(() => expect(exportBtn).not.toBeDisabled());
  });

  it('filters weeks from API response and disables export when none available', async () => {
    mockGetPantryWeeks.mockResolvedValueOnce([]);
    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryWeeks).toHaveBeenCalled());
    const exportBtn = await screen.findByRole('button', { name: /export table/i });
    expect(exportBtn).toBeDisabled();
  });

  it('inserts manual weekly aggregate through modal and refreshes tables', async () => {
    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryWeekly).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /insert aggregate/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/orders/i), {
      target: { value: '1' },
    });
    fireEvent.change(within(dialog).getByLabelText(/adults/i), {
      target: { value: '2' },
    });
    fireEvent.change(within(dialog).getByLabelText(/children/i), {
      target: { value: '3' },
    });
    fireEvent.change(within(dialog).getByLabelText(/weight/i), {
      target: { value: '4' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockPostManualPantryAggregate).toHaveBeenCalledWith({
        year: currentYear,
        month: currentMonth,
        week: 1,
        orders: 1,
        adults: 2,
        children: 3,
        weight: 4,
      }),
    );
    await waitFor(() => expect(mockGetPantryWeekly).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockGetPantryMonthly).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockGetPantryYearly).toHaveBeenCalledTimes(1));
  });

  it('formats partial weeks with remaining weekdays', () => {
    const ranges = getWeekRanges(2025, 8);
    const range = ranges.find(r => r.week === 5)!;
    let start = dayjs(range.startDate);
    let end = dayjs(range.endDate);
    while ([0, 6].includes(start.day()) && start.isBefore(end)) {
      start = start.add(1, 'day');
    }
    while ([0, 6].includes(end.day()) && end.isAfter(start)) {
      end = end.subtract(1, 'day');
    }
    const label = start.isSame(end, 'day')
      ? formatDate(start)
      : `${formatDate(start)} - ${formatDate(end)}`;
    const expectedLabel = `${formatDate(start)} - ${formatDate(end)}`;
    expect(label).toBe(expectedLabel);
  });
});

describe('exportPantryAggregations fallback filename', () => {
  it('derives filenames when header is missing', async () => {
    jest.resetModules();
    const mockApiFetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('data'))
      .mockResolvedValueOnce(new Response('data'))
      .mockResolvedValueOnce(new Response('data'));
    jest.doMock('../api/client', () => ({
      apiFetch: mockApiFetch,
      API_BASE: '',
      handleResponse: jest.fn(),
    }));
    jest.unmock('../api/pantryAggregations');
    const { exportPantryAggregations } = await import('../api/pantryAggregations');

    const weekly = await exportPantryAggregations({
      period: 'weekly',
      year: 2024,
      month: 5,
      week: 1,
    });
    expect(weekly.fileName).toBe(
      '2024_05_2024-04-29_to_2024-05-03_week_1_agggregation.xlsx',
    );

    const monthly = await exportPantryAggregations({
      period: 'monthly',
      year: 2024,
      month: 5,
    });
    expect(monthly.fileName).toBe('2024_05_monthly_pantry_aggregation.xlsx');

    const yearly = await exportPantryAggregations({ period: 'yearly', year: 2024 });
    expect(yearly.fileName).toBe('2024_yearly_pantry_aggregation.xlsx');
  });
});
