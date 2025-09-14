import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Exports from '../pages/warehouse-management/Exports';
import { getWarehouseOverallYears } from '../api/warehouseOverall';

jest.mock('../api/warehouseOverall', () => ({
  getWarehouseOverallYears: jest.fn(),
  rebuildWarehouseOverall: jest.fn(),
  exportWarehouseOverall: jest.fn(),
}));
jest.mock('../api/donations', () => ({
  exportDonorAggregations: jest.fn(),
}));

describe('Exports page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads years from server and shows them in dropdown', async () => {
    (getWarehouseOverallYears as jest.Mock).mockResolvedValue([2022, 2021]);
    render(
      <MemoryRouter>
        <Exports />
      </MemoryRouter>
    );

    await waitFor(() => expect(getWarehouseOverallYears).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('combobox'));
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('2022');
    expect(options[1]).toHaveTextContent('2021');
  });

  it('disables exports when no years are available', async () => {
    (getWarehouseOverallYears as jest.Mock).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Exports />
      </MemoryRouter>
    );

    await waitFor(() => expect(getWarehouseOverallYears).toHaveBeenCalled());

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: /Export Donor Aggregations/i })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Export Warehouse Overall Stats/i })
    ).toBeDisabled();
    expect(screen.getByText(/No years available/i)).toBeInTheDocument();
  });
});
