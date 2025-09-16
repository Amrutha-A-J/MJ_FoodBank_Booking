import { renderWithProviders, screen } from '../../../../testUtils/renderWithProviders';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import VolunteerDailyBookings from '../VolunteerDailyBookings';
import {
  getVolunteerBookingsByDate,
  updateVolunteerBookingStatus,
} from '../../../api/volunteers';

const realSetTimeout = global.setTimeout.bind(global);
const realClearTimeout = global.clearTimeout.bind(global);
const realSetImmediate =
  (global as any).setImmediate?.bind(global) ||
  ((fn: (...args: any[]) => void, ...args: any[]) => {
    realSetTimeout(fn, 0, ...args);
  });
const realWindowSetTimeout = (global as any).window?.setTimeout?.bind((global as any).window);
const realWindowClearTimeout = (global as any).window?.clearTimeout?.bind((global as any).window);
let usingFakeTimers = false;

const advanceTimers = (ms: number) => {
  if (usingFakeTimers) {
    jest.advanceTimersByTime(ms);
  }
};

type TimerConfig = {
  id: unknown;
  handler: Parameters<typeof setTimeout>[0];
  timeout: Parameters<typeof setTimeout>[1];
  args: any[];
};

let timerConfigs: WeakMap<object, TimerConfig> = new WeakMap();

const applyFakeTimersWithRefresh = () => {
  jest.useFakeTimers('modern');
  timerConfigs = new WeakMap();
  usingFakeTimers = true;

  const nodeGlobal = global as any;
  const domWindow = nodeGlobal.window as any;
  const fakeSetTimeout: typeof setTimeout = nodeGlobal.setTimeout.bind(nodeGlobal);
  const fakeClearTimeout: typeof clearTimeout = nodeGlobal.clearTimeout.bind(nodeGlobal);

  const attachRefresh = (handle: any, config: TimerConfig) => {
    const refresh = () => {
      fakeClearTimeout(config.id as any);
      const newId = fakeSetTimeout(
        config.handler as any,
        config.timeout as any,
        ...config.args,
      );
      config.id = newId;
      return handle;
    };

    handle.refresh = refresh;
    if (typeof handle.ref !== 'function') {
      handle.ref = () => handle;
    }
    if (typeof handle.unref !== 'function') {
      handle.unref = () => handle;
    }
    if (typeof handle.hasRef !== 'function') {
      handle.hasRef = () => true;
    }
    if (typeof handle[Symbol.toPrimitive] !== 'function') {
      handle[Symbol.toPrimitive] = () => config.id as any;
    }
    if (typeof handle.valueOf !== 'function') {
      handle.valueOf = () => config.id as any;
    }
    if (typeof handle.toString !== 'function') {
      handle.toString = () => String(config.id);
    }

    timerConfigs.set(handle, config);
    return handle;
  };

  const patchedSetTimeout: typeof setTimeout = (
    handler,
    timeout,
    ...args
  ) => {
    const id = fakeSetTimeout(handler as any, timeout as any, ...args) as unknown;
    const config: TimerConfig = { id, handler, timeout, args };
    if (typeof id === 'number') {
      return attachRefresh({}, config);
    }
    if (typeof id === 'object' && id !== null) {
      return attachRefresh(id as any, config);
    }
    return id as any;
  };

  nodeGlobal.setTimeout = patchedSetTimeout;
  nodeGlobal.setImmediate = realSetImmediate;
  if (domWindow) {
    domWindow.setTimeout = patchedSetTimeout;
    domWindow.setImmediate = realSetImmediate;
  }
};

beforeAll(() => {
  applyFakeTimersWithRefresh();
});

afterEach(() => {
  applyFakeTimersWithRefresh();
});

afterAll(() => {
  jest.useRealTimers();
  usingFakeTimers = false;
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

    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    usingFakeTimers = false;
    (global as any).setTimeout = realSetTimeout;
    (global as any).clearTimeout = realClearTimeout;
    (global as any).setImmediate = realSetImmediate;
    if ((global as any).window) {
      (global as any).window.setTimeout = realWindowSetTimeout ?? realSetTimeout;
      (global as any).window.clearTimeout = realWindowClearTimeout ?? realClearTimeout;
      (global as any).window.setImmediate = realSetImmediate;
    }

    expect(await screen.findByText('Pantry')).toBeInTheDocument();
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

    jest.useRealTimers();
    usingFakeTimers = false;
    (global as any).setTimeout = realSetTimeout;
    (global as any).clearTimeout = realClearTimeout;
    (global as any).setImmediate = realSetImmediate;
    if ((global as any).window) {
      (global as any).window.setTimeout = realWindowSetTimeout ?? realSetTimeout;
      (global as any).window.clearTimeout = realWindowClearTimeout ?? realClearTimeout;
      (global as any).window.setImmediate = realSetImmediate;
    }

    const user = userEvent.setup({ advanceTimers });
    await user.click(await screen.findByLabelText('Status'));
    await user.click(
      await screen.findByRole('option', { name: 'Completed' }),
    );

    applyFakeTimersWithRefresh();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    usingFakeTimers = false;
    (global as any).setTimeout = realSetTimeout;
    (global as any).clearTimeout = realClearTimeout;
    (global as any).setImmediate = realSetImmediate;
    if ((global as any).window) {
      (global as any).window.setTimeout = realWindowSetTimeout ?? realSetTimeout;
      (global as any).window.clearTimeout = realWindowClearTimeout ?? realClearTimeout;
      (global as any).window.setImmediate = realSetImmediate;
    }

    expect(updateVolunteerBookingStatus).toHaveBeenCalledWith(1, 'completed');
  });
});

