import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import LeaveManagement from '../LeaveManagement';

const mockMutate = jest.fn();

let restoreFormData: typeof FormData;
let restoreWindowFormData: typeof FormData;

beforeAll(() => {
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
    ],
  });
});

beforeEach(() => {
  jest.setSystemTime(new Date('2024-01-02T12:00:00Z'));
  mockMutate.mockImplementation((_variables, options) => {
    act(() => {
      options?.onSuccess?.();
    });
    return undefined;
  });

  restoreFormData = global.FormData;
  restoreWindowFormData = window.FormData;

  function createFormData(form?: HTMLFormElement) {
    const entries: Record<string, FormDataEntryValue> = {};
    if (form) {
      Array.from(form.elements).forEach(element => {
        const input =
          element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (input.name) {
          entries[input.name] = input.value;
        }
      });
    }
    return {
      append: (name: string, value: FormDataEntryValue) => {
        entries[name] = value;
      },
      get: (name: string) => entries[name] ?? null,
    } as unknown as FormData;
  }

  (global as any).FormData = createFormData as unknown as typeof FormData;
  (window as any).FormData = createFormData as unknown as typeof FormData;
});

afterEach(() => {
  mockMutate.mockReset();
  (global as any).FormData = restoreFormData;
  (window as any).FormData = restoreWindowFormData;
});

afterAll(() => {
  jest.useRealTimers();
});

jest.mock('../../../api/timesheets', () => ({
  useTimesheets: () => ({
    timesheets: [
      {
        id: 1,
        staff_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        approved_at: null,
      },
    ],
  }),
}));

jest.mock('../../../api/leaveRequests', () => ({
  useCreateLeaveRequest: () => ({ mutate: mockMutate }),
  useLeaveRequests: () => ({ requests: [], isLoading: false, error: null }),
}));

describe('LeaveManagement', () => {
  it('submits leave request', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter>
        <LeaveManagement />
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole('button', { name: /request vacation/i }),
    );

    const startDateField = (await screen.findByLabelText(
      /start date/i,
    )) as HTMLInputElement;
    const endDateField = (await screen.findByLabelText(
      /end date/i,
    )) as HTMLInputElement;
    const submitButton = await screen.findByRole('button', { name: /submit/i });

    await user.type(startDateField, '2024-01-01');
    await user.type(endDateField, '2024-01-02');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          type: 'paid',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});
