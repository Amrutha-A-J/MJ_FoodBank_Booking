import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import Aggregations from '../pages/warehouse-management/Aggregations';
import '../../tests/mockUrl';

const currentYear = new Date().getFullYear();
const descendingYears = Array.from({ length: 7 }, (_, i) => currentYear - i);
const mockGetWarehouseOverall = jest.fn().mockResolvedValue([]);
const mockGetWarehouseOverallYears = jest.fn();
const mockExportWarehouseOverall = jest.fn().mockResolvedValue(new Blob());
const mockPostManualWarehouseOverall = jest.fn().mockResolvedValue(undefined);
const mockGetWarehouseMonthlyHistory = jest.fn();
const mockExportWarehouseMonthlyHistory = jest.fn().mockResolvedValue(new Blob());
jest.mock('../api/warehouseOverall', () => ({
  getWarehouseOverall: (...args: unknown[]) => mockGetWarehouseOverall(...args),
  getWarehouseOverallYears: (...args: unknown[]) =>
    mockGetWarehouseOverallYears(...args),
  exportWarehouseOverall: (...args: unknown[]) =>
    mockExportWarehouseOverall(...args),
  postManualWarehouseOverall: (...args: unknown[]) =>
    mockPostManualWarehouseOverall(...args),
  getWarehouseMonthlyHistory: (...args: unknown[]) =>
    mockGetWarehouseMonthlyHistory(...args),
  exportWarehouseMonthlyHistory: (...args: unknown[]) =>
    mockExportWarehouseMonthlyHistory(...args),
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
  const originalMatchMedia = window.matchMedia;
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    anchorClick = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function () {
        const event = new MouseEvent('click', { cancelable: true });
        event.preventDefault();
      });
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
    anchorClick.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWarehouseOverallYears.mockResolvedValue(descendingYears);
    mockGetDonors.mockResolvedValue([
      {
        id: 42,
        name: 'Jane Doe',
        email: null,
        phone: '306-555-0100',
        isPetFood: false,
      },
    ]);
    mockGetWarehouseMonthlyHistory.mockResolvedValue({
      years: [2024, 2023],
      entries: [
        { year: 2024, month: 1, total: 100 },
        { year: 2023, month: 1, donations: 40, petFood: 10 },
        { year: 2024, month: 2, total: 60 },
      ],
    });
  });

  it('loads donor data on mount and when returning to Donor tab', async () => {
    render(<Aggregations />);

    await waitFor(() => expect(mockGetDonorAggregations).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('tab', { name: /yearly overall aggregations/i }));
    fireEvent.click(screen.getByRole('tab', { name: /donor aggregations/i }));

    await waitFor(() => expect(mockGetDonorAggregations).toHaveBeenCalledTimes(2));
  });

  it('exports yearly overall data', async () => {
    render(<Aggregations />);

    await waitFor(() => expect(mockGetWarehouseOverall).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /yearly overall aggregations/i }));

    const exportBtn = await screen.findByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);

    await waitFor(() =>
      expect(mockExportWarehouseOverall).toHaveBeenCalledWith(currentYear),
    );
  });

  it('reveals older years when toggled', async () => {
    mockGetWarehouseOverallYears.mockResolvedValueOnce(descendingYears);

    render(<Aggregations />);

    await waitFor(() => expect(mockGetWarehouseOverallYears).toHaveBeenCalled());

    const [toggleButton] = await screen.findAllByRole('button', { name: /show older years/i });
    const [donorYearSelect] = await screen.findAllByLabelText(/year/i);
    fireEvent.mouseDown(donorYearSelect);

    const hiddenYear = String(descendingYears[5]);
    expect(screen.getByRole('option', { name: String(descendingYears[0]) })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: hiddenYear })).not.toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });

    fireEvent.click(toggleButton);

    fireEvent.mouseDown(donorYearSelect);

    expect(screen.getByRole('option', { name: hiddenYear })).toBeInTheDocument();
  });

  it('shows an error when historical donations fail to load', async () => {
    mockGetWarehouseMonthlyHistory.mockRejectedValueOnce(new Error('fail'));

    render(<Aggregations />);

    fireEvent.click(screen.getByRole('tab', { name: /historical donations/i }));

    await waitFor(() => expect(mockGetWarehouseMonthlyHistory).toHaveBeenCalled());

    expect(
      await screen.findByText(/failed to load monthly history/i),
    ).toBeInTheDocument();
  });

  it('loads and exports historical donations', async () => {
    render(<Aggregations />);

    fireEvent.click(screen.getByRole('tab', { name: /historical donations/i }));

    await waitFor(() => expect(mockGetWarehouseMonthlyHistory).toHaveBeenCalled());

    const monthCells = await screen.findAllByText(/january/i);
    expect(monthCells.length).toBeGreaterThan(0);
    expect(await screen.findByText('100 lbs')).toBeInTheDocument();

    const exportButton = await screen.findByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => expect(mockExportWarehouseMonthlyHistory).toHaveBeenCalled());
  });

  it('inserts manual aggregate through modal', async () => {
    const year = new Date().getFullYear();
    render(<Aggregations />);

    await waitFor(() => expect(mockGetWarehouseOverall).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /yearly overall aggregations/i }));

    fireEvent.click(await screen.findByRole('button', { name: /insert aggregate/i }));

    const dialog = await screen.findByRole('dialog', { name: /^insert aggregate$/i });
    const dialogUtils = within(dialog);

    fireEvent.change(dialogUtils.getByLabelText(/month/i), { target: { value: '5' } });
    fireEvent.change(dialogUtils.getByLabelText(/total donations/i), { target: { value: '1' } });
    fireEvent.change(dialogUtils.getByLabelText(/surplus/i), { target: { value: '2' } });
    fireEvent.change(dialogUtils.getByLabelText(/pig pound/i), { target: { value: '3' } });
    fireEvent.change(dialogUtils.getByLabelText(/pet food/i), { target: { value: '5' } });
    fireEvent.change(dialogUtils.getByLabelText(/outgoing donations/i), {
      target: { value: '4' },
    });

    fireEvent.click(dialogUtils.getByRole('button', { name: /save/i }));

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

    const dialog = await screen.findByRole('dialog', { name: /^insert aggregate$/i });
    const dialogUtils = within(dialog);

    fireEvent.change(dialogUtils.getByLabelText(/month/i), { target: { value: '5' } });
    const donorInput = dialogUtils.getByRole('combobox', { name: /donor/i });
    fireEvent.change(donorInput, { target: { value: '42' } });

    await waitFor(() => expect(mockGetDonors).toHaveBeenCalledWith('42'));

    const option = await screen.findByRole('option', {
      name: /jane doe \(306-555-0100\)/i,
    });
    fireEvent.click(option);
    fireEvent.change(dialogUtils.getByLabelText(/total/i), { target: { value: '100' } });

    fireEvent.click(dialogUtils.getByRole('button', { name: /save/i }));

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

    const dialog = await screen.findByRole('dialog', { name: /^insert aggregate$/i });
    const donorInput = within(dialog).getByRole('combobox', { name: /donor/i });
    fireEvent.change(donorInput, { target: { value: '007' } });

    await waitFor(() => expect(mockGetDonors).toHaveBeenCalledWith('007'));
  });
});

