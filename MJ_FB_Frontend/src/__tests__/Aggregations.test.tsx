import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Aggregations from '../pages/warehouse-management/Aggregations';

const mockGetWarehouseOverall = jest.fn().mockResolvedValue([]);
const mockGetWarehouseOverallYears = jest
  .fn()
  .mockResolvedValue([new Date().getFullYear()]);
const mockExportWarehouseOverall = jest.fn().mockResolvedValue(new Blob());
jest.mock('../api/warehouseOverall', () => ({
  getWarehouseOverall: (...args: unknown[]) => mockGetWarehouseOverall(...args),
  getWarehouseOverallYears: (...args: unknown[]) =>
    mockGetWarehouseOverallYears(...args),
  exportWarehouseOverall: (...args: unknown[]) =>
    mockExportWarehouseOverall(...args),
}));

const mockGetDonorAggregations = jest.fn().mockResolvedValue([]);
jest.mock('../api/donations', () => ({
  getDonorAggregations: (...args: unknown[]) => mockGetDonorAggregations(...args),
}));

describe('Aggregations page', () => {
  beforeAll(() => {
    // @ts-ignore
    global.URL.createObjectURL = jest.fn();
    // @ts-ignore
    global.URL.revokeObjectURL = jest.fn();
  });

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

  it('exports yearly overall data', async () => {
    const year = new Date().getFullYear();
    render(<Aggregations />);

    await waitFor(() => expect(mockGetWarehouseOverall).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /yearly overall aggregations/i }));

    const exportBtn = await screen.findByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);

    await waitFor(() => expect(mockExportWarehouseOverall).toHaveBeenCalledWith(year));
  });
});

