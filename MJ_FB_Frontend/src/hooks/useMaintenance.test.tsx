import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useMaintenance from './useMaintenance';
import { getMaintenance } from '../api/maintenance';

jest.mock('../api/maintenance', () => ({
  getMaintenance: jest.fn(),
}));

describe('useMaintenance', () => {
  it('fetches and caches maintenance status', async () => {
    (getMaintenance as jest.Mock).mockResolvedValue({ maintenanceMode: true, notice: 'hi' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useMaintenance(), { wrapper });
    await waitFor(() => expect(result.current.maintenanceMode).toBe(true));
    expect(getMaintenance).toHaveBeenCalledTimes(1);
    rerender();
    await waitFor(() => expect(result.current.maintenanceMode).toBe(true));
    expect(getMaintenance).toHaveBeenCalledTimes(1);
  });
});
