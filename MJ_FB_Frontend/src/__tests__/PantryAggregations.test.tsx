import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PantryAggregations from '../pages/staff/PantryAggregations';

const mockGetPantryWeekly = jest.fn().mockResolvedValue([]);
const mockGetPantryMonthly = jest.fn().mockResolvedValue([]);
const mockGetPantryYearly = jest.fn().mockResolvedValue([]);
const mockGetPantryYears = jest.fn().mockResolvedValue([new Date().getFullYear()]);
const mockExportPantryAggregations = jest
  .fn()
  .mockResolvedValue({ blob: new Blob(), fileName: 'test.xlsx' });
const mockRebuildPantryAggregations = jest.fn().mockResolvedValue(undefined);

jest.mock('../api/pantryAggregations', () => ({
  getPantryWeekly: (...args: unknown[]) => mockGetPantryWeekly(...args),
  getPantryMonthly: (...args: unknown[]) => mockGetPantryMonthly(...args),
  getPantryYearly: (...args: unknown[]) => mockGetPantryYearly(...args),
  getPantryYears: (...args: unknown[]) => mockGetPantryYears(...args),
  exportPantryAggregations: (...args: unknown[]) => mockExportPantryAggregations(...args),
  rebuildPantryAggregations: (...args: unknown[]) => mockRebuildPantryAggregations(...args),
}));

describe('PantryAggregations page', () => {
  beforeAll(() => {
    // @ts-ignore
    global.URL.createObjectURL = jest.fn();
    // @ts-ignore
    global.URL.revokeObjectURL = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPantryWeekly.mockResolvedValue([]);
    mockGetPantryMonthly.mockResolvedValue([]);
    mockGetPantryYearly.mockResolvedValue([]);
    mockGetPantryYears.mockResolvedValue([new Date().getFullYear()]);
  });

  it('loads data for each tab', async () => {
    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryYears).toHaveBeenCalled());
    await waitFor(() => expect(mockGetPantryWeekly).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /monthly/i }));
    await waitFor(() => expect(mockGetPantryMonthly).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /yearly/i }));
    await waitFor(() => expect(mockGetPantryYearly).toHaveBeenCalled());
  });

  it('displays weekly aggregations in a table', async () => {
    mockGetPantryWeekly.mockResolvedValueOnce([{ week: 1, clients: 2 }]);

    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryWeekly).toHaveBeenCalled());

    expect(screen.getByTestId('responsive-table-table')).toBeInTheDocument();
    expect(screen.getByText('week')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('exports weekly data', async () => {
    const year = new Date().getFullYear();
    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryWeekly).toHaveBeenCalled());

    const exportBtn = await screen.findByRole('button', { name: 'Export Table' });
    fireEvent.click(exportBtn);

    await waitFor(() => expect(mockRebuildPantryAggregations).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockExportPantryAggregations).toHaveBeenCalledWith({
        period: 'weekly',
        year,
        month: 1,
        week: 1,
      }),
    );
  });
});
