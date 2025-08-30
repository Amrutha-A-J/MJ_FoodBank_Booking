import React from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { queryClient } from '../queryClient';

const fetcher = jest.fn().mockResolvedValue('data');

function TestComponent() {
  const { data } = useQuery({ queryKey: ['test'], queryFn: fetcher });
  return <div>{data}</div>;
}

test('query cache persists across re-renders', async () => {
  const { findByText, rerender } = render(
    <QueryClientProvider client={queryClient}>
      <TestComponent />
    </QueryClientProvider>
  );

  await findByText('data');
  expect(fetcher).toHaveBeenCalledTimes(1);

  rerender(
    <QueryClientProvider client={queryClient}>
      <TestComponent />
    </QueryClientProvider>
  );

  await findByText('data');
  expect(fetcher).toHaveBeenCalledTimes(1);

  queryClient.clear();
});
