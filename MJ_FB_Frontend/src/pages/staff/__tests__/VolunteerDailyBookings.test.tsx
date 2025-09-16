import { renderWithProviders, screen } from '../../../../testUtils/renderWithProviders';
import { act, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerDailyBookings from '../VolunteerDailyBookings';
import {
  getVolunteerBookingsByDate,
  updateVolunteerBookingStatus,
} from '../../../api/volunteers';

type TimerConfig = {
  id: unknown;
  handler: Parameters<typeof setTimeout>[0];
  timeout: Parameters<typeof setTimeout>[1];
  args: any[];
};
const installTimerRefreshPolyfill = () => {
  const nodeGlobal = global as any;
  const originalSetTimeout: typeof setTimeout = nodeGlobal.setTimeout;
  const originalClearTimeout: typeof clearTimeout = nodeGlobal.clearTimeout;
  const originalWindowSetTimeout: typeof setTimeout | undefined =
    nodeGlobal.window?.setTimeout;

  const createHandle = (config: TimerConfig) => {
    const handle: any = {
      id: config.id,
      refresh() {
        originalClearTimeout.call(nodeGlobal, config.id as any);
        config.id = originalSetTimeout.call(
          nodeGlobal,
          config.handler as any,
          config.timeout as any,
          ...config.args,
        );
        handle.id = config.id;
        return handle;
      },
      ref: () => handle,
      unref: () => handle,
      hasRef: () => true,
      valueOf: () => config.id as any,
      toString: () => String(config.id),
    };
    if (typeof Symbol === 'function' && Symbol.toPrimitive) {
      handle[Symbol.toPrimitive] = () => config.id as any;
    }
    return handle;
  };

  const enhanceHandle = (handle: unknown, config: TimerConfig) => {
    if (handle && typeof handle === 'object') {
      const timer = handle as Record<PropertyKey, any>;
      if (typeof timer.refresh !== 'function') {
        timer.refresh = () => {
          originalClearTimeout.call(nodeGlobal, config.id as any);
          config.id = originalSetTimeout.call(
            nodeGlobal,
            config.handler as any,
            config.timeout as any,
            ...config.args,
          );
          timer.id = config.id;
          return timer;
        };
      }
      if (typeof timer.ref !== 'function') {
        timer.ref = () => timer;
      }
      if (typeof timer.unref !== 'function') {
        timer.unref = () => timer;
      }
      if (typeof timer.hasRef !== 'function') {
        timer.hasRef = () => true;
      }
      if (typeof timer.valueOf !== 'function') {
        timer.valueOf = () => config.id as any;
      }
      if (typeof timer.toString !== 'function') {
        timer.toString = () => String(config.id);
      }
      if (
        typeof Symbol === 'function' &&
        Symbol.toPrimitive &&
        typeof timer[Symbol.toPrimitive] !== 'function'
      ) {
        timer[Symbol.toPrimitive] = () => config.id as any;
      }
      timer.id = config.id;
      return timer;
    }

    return createHandle(config);
  };

  const patchedSetTimeout: typeof setTimeout = (handler, timeout, ...args) => {
    const id = originalSetTimeout.call(nodeGlobal, handler as any, timeout as any, ...args);
    const config: TimerConfig = { id, handler, timeout, args };
    return enhanceHandle(id, config) as any;
  };

  nodeGlobal.setTimeout = patchedSetTimeout as any;
  if (nodeGlobal.window) {
    nodeGlobal.window.setTimeout = patchedSetTimeout as any;
  }

  return () => {
    nodeGlobal.setTimeout = originalSetTimeout;
    if (nodeGlobal.window) {
      nodeGlobal.window.setTimeout = originalWindowSetTimeout ?? originalSetTimeout;
    }
  };
};

const flushTimersAndPromises = async () => {
  for (let i = 0; i < 10; i += 1) {
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      await Promise.resolve();
    });
    if (typeof (jest as any).getTimerCount === 'function') {
      if ((jest as any).getTimerCount() === 0) {
        break;
      }
    }
  }
};

const waitForElement = async <T>(query: () => T): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < 10; i += 1) {
    try {
      return query();
    } catch (error) {
      lastError = error;
      await flushTimersAndPromises();
    }
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(String(lastError));
};

let restoreTimers: (() => void) | undefined;

beforeAll(() => {
  jest.useFakeTimers();
  restoreTimers = installTimerRefreshPolyfill();
});

afterEach(() => {
  jest.clearAllTimers();
});

afterAll(() => {
  restoreTimers?.();
  jest.useRealTimers();
});

jest.mock('../../../api/volunteers', () => ({
  getVolunteerBookingsByDate: jest.fn(),
  updateVolunteerBookingStatus: jest.fn(),
}));

const sampleBookings = [
  {
    id: 1,
    status: 'approved',
    role_id: 1,
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: '10:00:00',
    role_name: 'Stocking',
    category_name: 'Pantry',
    volunteer_name: 'Alice',
  },
  {
    id: 2,
    status: 'approved',
    role_id: 1,
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: '10:00:00',
    role_name: 'Stocking',
    category_name: 'Pantry',
    volunteer_name: 'Bob',
  },
  {
    id: 3,
    status: 'approved',
    role_id: 2,
    date: '2024-01-01',
    start_time: '10:00:00',
    end_time: '11:00:00',
    role_name: 'Serving',
    category_name: 'Pantry',
    volunteer_name: 'Carol',
  },
  {
    id: 4,
    status: 'approved',
    role_id: 3,
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: '10:00:00',
    role_name: 'Sorting',
    category_name: 'Warehouse',
    volunteer_name: 'Dave',
  },
];

describe('VolunteerDailyBookings', () => {
  it('groups bookings by category, role, and shift', async () => {
    (getVolunteerBookingsByDate as jest.Mock).mockResolvedValue(sampleBookings);
    renderWithProviders(
      <MemoryRouter>
        <VolunteerDailyBookings />
      </MemoryRouter>,
    );

    await waitForElement(() => screen.getByText('Pantry'));
    expect(screen.getByText('Stocking')).toBeInTheDocument();
    expect(screen.getAllByText('9:00 AM – 10:00 AM')[0]).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Warehouse')).toBeInTheDocument();
  });

  it('updates status via API', async () => {
    (getVolunteerBookingsByDate as jest.Mock).mockResolvedValue([sampleBookings[0]]);
    (updateVolunteerBookingStatus as jest.Mock).mockResolvedValue(undefined);
    renderWithProviders(
      <MemoryRouter>
        <VolunteerDailyBookings />
      </MemoryRouter>,
    );

    await waitForElement(() => screen.getByText('Pantry'));

    const statusField = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusField);

    const listbox = await waitForElement(() => screen.getByRole('listbox'));
    const completedOption = within(listbox).getByRole('option', {
      name: 'Completed',
    });
    fireEvent.click(completedOption);
    await flushTimersAndPromises();

    expect(updateVolunteerBookingStatus).toHaveBeenCalledWith(1, 'completed');
  });
});

