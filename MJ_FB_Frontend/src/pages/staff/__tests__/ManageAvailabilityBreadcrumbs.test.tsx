import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import ManageAvailability from '../ManageAvailability';
import { useAuth } from '../../../hooks/useAuth';
import { getAllSlots } from '../../../api/slots';
import { getBreaks, getRecurringBlockedSlots, getBlockedSlots } from '../../../api/bookings';

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../api/bookings', () => ({
  getHolidays: jest.fn().mockResolvedValue([]),
  addHoliday: jest.fn(),
  removeHoliday: jest.fn(),
  addBlockedSlot: jest.fn(),
  addRecurringBlockedSlot: jest.fn(),
  removeBlockedSlot: jest.fn(),
  removeRecurringBlockedSlot: jest.fn(),
  getBlockedSlots: jest.fn().mockResolvedValue([]),
  addBreak: jest.fn(),
  removeBreak: jest.fn(),
  getBreaks: jest.fn().mockResolvedValue([]),
  getRecurringBlockedSlots: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../api/slots', () => ({
  getAllSlots: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../components/FeedbackSnackbar', () => () => null);

jest.mock('../../../components/ConfirmDialog', () => () => null);

type MockTab = { label: string; content: ReactNode };

jest.mock('../../../components/StyledTabs', () => ({
  __esModule: true,
  default: ({ tabs }: { tabs: MockTab[] }) => (
    <div data-testid="styled-tabs">
      {tabs.map((tab, index) => (
        <div key={index} data-testid={`tab-${index}`}>
          {tab.content}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../../../components/Page', () => ({
  __esModule: true,
  default: ({
    title,
    header,
    children,
  }: {
    title: string;
    header?: ReactNode;
    children: ReactNode;
  }) => (
    <div data-testid="page-wrapper">
      <div data-testid="page-title">{title}</div>
      {header ? <div data-testid="page-header">{header}</div> : null}
      <div data-testid="page-content">{children}</div>
    </div>
  ),
}));

const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;
const getAllSlotsMock = getAllSlots as jest.MockedFunction<typeof getAllSlots>;
const getBreaksMock = getBreaks as jest.MockedFunction<typeof getBreaks>;
const getRecurringBlockedSlotsMock = getRecurringBlockedSlots as jest.MockedFunction<
  typeof getRecurringBlockedSlots
>;
const getBlockedSlotsMock = getBlockedSlots as jest.MockedFunction<typeof getBlockedSlots>;

describe('ManageAvailability breadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({ access: [] } as any);
  });

  it('shows pantry quick links for staff with pantry access', async () => {
    useAuthMock.mockReturnValue({ access: ['pantry'] } as any);

    render(
      <MemoryRouter>
        <ManageAvailability />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getAllSlotsMock).toHaveBeenCalled();
      expect(getBreaksMock).toHaveBeenCalled();
      expect(getRecurringBlockedSlotsMock).toHaveBeenCalled();
      expect(getBlockedSlotsMock).toHaveBeenCalled();
    });

    expect(screen.getByRole('link', { name: /pantry schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /record a visit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /search client/i })).toBeInTheDocument();
  });

  it('hides pantry quick links when staff lacks pantry access', async () => {
    useAuthMock.mockReturnValue({ access: ['warehouse'] } as any);

    render(
      <MemoryRouter>
        <ManageAvailability />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getAllSlotsMock).toHaveBeenCalled();
    });

    expect(screen.queryByRole('link', { name: /pantry schedule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /record a visit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /search client/i })).not.toBeInTheDocument();
  });
});
