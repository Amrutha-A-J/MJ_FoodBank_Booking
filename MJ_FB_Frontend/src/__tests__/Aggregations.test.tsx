import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Aggregations from '../pages/warehouse-management/Aggregations';
import '../../tests/mockUrl';

const mockGetWarehouseOverall = jest.fn().mockResolvedValue([]);
const mockGetWarehouseOverallYears = jest
  .fn()
  .mockResolvedValue([new Date().getFullYear()]);
const mockExportWarehouseOverall = jest.fn().mockResolvedValue(new Blob());
const mockPostManualWarehouseOverall = jest.fn().mockResolvedValue(undefined);
const mockGetWarehouseDonationHistory = jest.fn().mockResolvedValue([
  { year: 2023, donations: 1000, petFood: 200, total: 1200 },
]);
const mockExportWarehouseDonationHistory = jest.fn().mockResolvedValue(new Blob());
jest.mock('../api/warehouseOverall', () => ({
  getWarehouseOverall: (...args: unknown[]) => mockGetWarehouseOverall(...args),
  getWarehouseOverallYears: (...args: unknown[]) =>
    mockGetWarehouseOverallYears(...args),
  exportWarehouseOverall: (...args: unknown[]) =>
    mockExportWarehouseOverall(...args),
  postManualWarehouseOverall: (...args: unknown[]) =>
    mockPostManualWarehouseOverall(...args),
  getWarehouseDonationHistory: (...args: unknown[]) =>
    mockGetWarehouseDonationHistory(...args),
  exportWarehouseDonationHistory: (...args: unknown[]) =>
    mockExportWarehouseDonationHistory(...args),
}));

const mockGetDonorAggregations = jest.fn().mockResolvedValue([]);
const mockPostManualDonorAggregation = jest.fn().mockResolvedValue(undefined);
const mockGetDonors = jest.fn().mockResolvedValue([
  {
    id: 42,
    name: 'Jane Doe',
    email: null,
    phone: '306-555-0100',
    isPetFood: false,
  },
]);
jest.mock('../api/donations', () => ({
  getDonorAggregations: (...args: unknown[]) => mockGetDonorAggregations(...args),
  postManualDonorAggregation: (...args: unknown[]) =>
    mockPostManualDonorAggregation(...args),
}));
jest.mock('../api/donors', () => ({
  getDonors: (...args: unknown[]) => mockGetDonors(...args),
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
    mockGetDonors.mockResolvedValue([
      {
        id: 42,
        name: 'Jane Doe',
        email: null,
        phone: '306-555-0100',
        isPetFood: false,
      },
    ]);
    mockGetWarehouseDonationHistory.mockResolvedValue([
      { year: 2023, donations: 1000, petFood: 200, total: 1200 },
    ]);
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

  it('loads donation history when the tab is selected', async () => {
    render(<Aggregations />);

    fireEvent.click(screen.getByRole('tab', { name: /historical donations/i }));

    await waitFor(() => expect(mockGetWarehouseDonationHistory).toHaveBeenCalledTimes(1));

    expect(screen.getByRole('cell', { name: '2023' })).toBeInTheDocument();
    expect(screen.getAllByText(/1,200 lbs/i)).not.toHaveLength(0);
  });

  it('exports donation history data', async () => {
    render(<Aggregations />);

    fireEvent.click(screen.getByRole('tab', { name: /historical donations/i }));

    await waitFor(() => expect(mockGetWarehouseDonationHistory).toHaveBeenCalled());

    const exportBtn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);

    await waitFor(() =>
      expect(mockExportWarehouseDonationHistory).toHaveBeenCalledTimes(1),
    );
  });

  it('shows an error when donation history fails to load', async () => {
    mockGetWarehouseDonationHistory.mockRejectedValueOnce(new Error('fail'));

    render(<Aggregations />);

    fireEvent.click(screen.getByRole('tab', { name: /historical donations/i }));

    await waitFor(() => expect(mockGetWarehouseDonationHistory).toHaveBeenCalled());

    expect(
      await screen.findByText(/failed to load donation history/i),
    ).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/pet food/i), { target: { value: '5' } });
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
        petFood: 5,
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

    await waitFor(() => expect(mockGetDonors).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/month/i), { target: { value: '5' } });
    const donorInput = screen.getByRole('combobox', { name: /donor/i });
    fireEvent.change(donorInput, { target: { value: '42' } });

    await waitFor(() => expect(mockGetDonors).toHaveBeenCalledWith('42'));

    const option = await screen.findByRole('option', {
      name: /jane doe \(306-555-0100\)/i,
    });
    fireEvent.click(option);
    fireEvent.change(screen.getByLabelText(/total/i), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockPostManualDonorAggregation).toHaveBeenCalledWith({
        year,
        month: 5,
        donorId: 42,
        total: 100,
      }),
    );
    await waitFor(() => expect(mockGetDonorAggregations).toHaveBeenCalledTimes(2));
  });

  it('searches donors by ID when inserting donor aggregate', async () => {
    render(<Aggregations />);

    await waitFor(() => expect(mockGetDonorAggregations).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: /insert aggregate/i }));

    const donorInput = screen.getByRole('combobox', { name: /donor/i });
    fireEvent.change(donorInput, { target: { value: '007' } });

    await waitFor(() => expect(mockGetDonors).toHaveBeenCalledWith('007'));
  });
});

