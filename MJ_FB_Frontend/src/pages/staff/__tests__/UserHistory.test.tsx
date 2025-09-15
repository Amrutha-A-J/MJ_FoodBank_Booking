import { screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientManagement from '../ClientManagement';
import * as usersApi from '../../../api/users';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';

(global as any).clearImmediate = (global as any).clearImmediate || ((id: number) => clearTimeout(id));
(global as any).performance = (global as any).performance || ({} as any);
(global as any).performance.markResourceTiming = (global as any).performance.markResourceTiming || (() => {});
const originalFetch = global.fetch;
(global as any).fetch = jest.fn();

jest.mock('../../../api/users', () => ({
  ...jest.requireActual('../../../api/users'),
  searchUsers: jest.fn(),
}));

describe('UserHistory search add shortcut', () => {
  beforeEach(() => {
    (usersApi.searchUsers as jest.Mock).mockResolvedValue([]);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('shows add button and navigates with id prefilled', async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/pantry/client-management']}>
        <ClientManagement />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('entity-search-input'), {
      target: { value: '123' },
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const addBtn = await screen.findByRole('button', { name: 'Add Client 123' });
    fireEvent.click(addBtn);
    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }));

    expect(await screen.findByRole('button', { name: /add client/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/client id/i)).toHaveValue('123');
  });
});
