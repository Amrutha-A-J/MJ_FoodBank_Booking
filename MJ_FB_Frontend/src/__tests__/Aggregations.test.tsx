import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Aggregations from '../pages/warehouse-management/Aggregations';

const mockGetWarehouseOverall = jest.fn().mockResolvedValue([]);
jest.mock('../api/warehouseOverall', () => ({
  getWarehouseOverall: (...args: unknown[]) => mockGetWarehouseOverall(...args),
  rebuildWarehouseOverall: jest.fn(),
  exportWarehouseOverall: jest.fn(),
}));

const mockGetDonorAggregations = jest.fn().mockResolvedValue([]);
jest.mock('../api/donations', () => ({
  getDonorAggregations: (...args: unknown[]) => mockGetDonorAggregations(...args),
}));

describe('Aggregations page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads donor data on mount and when returning to Donor tab', async () => {
    render(<Aggregations />);

    await waitFor(() => expect(mockGetDonorAggregations).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('tab', { name: /yearly overall aggregations/i }));
    fireEvent.click(screen.getByRole('tab', { name: /donor aggregations/i }));

    await waitFor(() => expect(mockGetDonorAggregations).toHaveBeenCalledTimes(2));
  });
});

