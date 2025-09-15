import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Aggregations from '../pages/warehouse-management/Aggregations';
import '../../tests/mockUrl';

const mockGetWarehouseOverall = jest.fn().mockResolvedValue([]);
const mockGetWarehouseOverallYears = jest
  .fn()
  .mockResolvedValue([new Date().getFullYear()]);
const mockExportWarehouseOverall = jest.fn().mockResolvedValue(new Blob());
const mockPostManualWarehouseOverall = jest.fn().mockResolvedValue(undefined);
jest.mock('../api/warehouseOverall', () => ({
  getWarehouseOverall: (...args: unknown[]) => mockGetWarehouseOverall(...args),
  getWarehouseOverallYears: (...args: unknown[]) =>
    mockGetWarehouseOverallYears(...args),
  exportWarehouseOverall: (...args: unknown[]) =>
    mockExportWarehouseOverall(...args),
  postManualWarehouseOverall: (...args: unknown[]) =>
    mockPostManualWarehouseOverall(...args),
}));

const mockGetDonorAggregations = jest.fn().mockResolvedValue([]);
const mockPostManualDonorAggregation = jest.fn().mockResolvedValue(undefined);
jest.mock('../api/donations', () => ({
  getDonorAggregations: (...args: unknown[]) => mockGetDonorAggregations(...args),
  postManualDonorAggregation: (...args: unknown[]) =>
    mockPostManualDonorAggregation(...args),
}));

describe('Aggregations page', () => {
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

  it('inserts manual aggregate through modal', async () => {
    const year = new Date().getFullYear();
    render(<Aggregations />);

    await waitFor(() => expect(mockGetWarehouseOverall).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /yearly overall aggregations/i }));

    fireEvent.click(await screen.findByRole('button', { name: /insert aggregate/i }));

    fireEvent.change(screen.getByLabelText(/month/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/total donations/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/surplus/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/pig pound/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/outgoing donations/i), {
      target: { value: '4' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockPostManualWarehouseOverall).toHaveBeenCalledWith({
        year,
        month: 5,
        donations: 1,
        surplus: 2,
        pigPound: 3,
        outgoingDonations: 4,
      }),
    );
  await waitFor(() => expect(mockGetWarehouseOverall).toHaveBeenCalledTimes(2));
  });

  it('inserts manual donor aggregate through modal', async () => {
    const year = new Date().getFullYear();
    render(<Aggregations />);

    await waitFor(() => expect(mockGetDonorAggregations).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: /insert aggregate/i }));

    fireEvent.change(screen.getByLabelText(/month/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/donor email/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/total/i), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockPostManualDonorAggregation).toHaveBeenCalledWith({
        year,
        month: 5,
        donorEmail: 'alice@example.com',
        total: 100,
      }),
    );
    await waitFor(() => expect(mockGetDonorAggregations).toHaveBeenCalledTimes(2));
  });
});

