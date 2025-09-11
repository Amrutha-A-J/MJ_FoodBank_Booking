import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useVolunteerRoles from './useVolunteerRoles';
import { getRoles } from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  getRoles: jest.fn(),
}));

describe('useVolunteerRoles', () => {
  it('fetches and caches roles', async () => {
    (getRoles as jest.Mock).mockResolvedValue([
      { categoryId: 1, categoryName: 'Cat', roleId: 1, roleName: 'Role1' },
    ]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useVolunteerRoles(), { wrapper });
    await waitFor(() => expect(result.current.roles).toHaveLength(1));
    expect(getRoles).toHaveBeenCalledTimes(1);
    rerender();
    await waitFor(() => expect(result.current.roles).toHaveLength(1));
    expect(getRoles).toHaveBeenCalledTimes(1);
  });
});
