import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PantryAggregations from '../pages/staff/PantryAggregations';

const mockGetPantryWeekly = jest.fn().mockResolvedValue([]);
const mockGetPantryMonthly = jest.fn().mockResolvedValue([]);
const mockGetPantryYearly = jest.fn().mockResolvedValue([]);
const mockGetPantryYears = jest.fn().mockResolvedValue([new Date().getFullYear()]);

jest.mock('../api/pantryAggregations', () => ({
  getPantryWeekly: (...args: unknown[]) => mockGetPantryWeekly(...args),
  getPantryMonthly: (...args: unknown[]) => mockGetPantryMonthly(...args),
  getPantryYearly: (...args: unknown[]) => mockGetPantryYearly(...args),
  getPantryYears: (...args: unknown[]) => mockGetPantryYears(...args),
  exportPantryAggregations: jest.fn(),
  rebuildPantryAggregations: jest.fn(),
}));

describe('PantryAggregations page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads data for each tab when selected', async () => {
    render(
      <MemoryRouter>
        <PantryAggregations />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryWeekly).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('tab', { name: /monthly/i }));
    await waitFor(() => expect(mockGetPantryMonthly).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('tab', { name: /yearly/i }));
    await waitFor(() => expect(mockGetPantryYearly).toHaveBeenCalledTimes(1));
  });
});

