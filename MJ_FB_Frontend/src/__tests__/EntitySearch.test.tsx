import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EntitySearch from '../components/EntitySearch';

describe('EntitySearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears query after selection when clearOnSelect is true', async () => {
    const searchFn = jest
      .fn()
      .mockResolvedValue([{ id: 1, name: 'Client 1', client_id: 1, hasPassword: false }]);
    render(
      <EntitySearch
        type="user"
        placeholder="Search clients"
        onSelect={() => {}}
        searchFn={searchFn}
        clearOnSelect
      />,
    );

    const input = screen.getByLabelText(/search/i);
    fireEvent.change(input, { target: { value: 'Cli' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(searchFn).toHaveBeenCalled());

    const button = await screen.findByRole('button', { name: /Client 1 \(1\)/ });
    fireEvent.click(button);

    expect((input as HTMLInputElement).value).toBe('');
  });

  it('hides "No search results." when the query is cleared', async () => {
    const searchFn = jest.fn().mockResolvedValue([]);
    render(
      <EntitySearch
        type="user"
        placeholder="Search clients"
        onSelect={() => {}}
        searchFn={searchFn}
      />,
    );

    const input = screen.getByLabelText(/search/i);
    fireEvent.change(input, { target: { value: 'abc' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(searchFn).toHaveBeenCalled());
    await screen.findByText('No search results.');

    fireEvent.change(input, { target: { value: '   ' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(screen.queryByText('No search results.')).not.toBeInTheDocument(),
    );
  });

  it('hides "No search results." after selecting a result', async () => {
    const searchFn = jest
      .fn()
      .mockResolvedValue([{ id: 1, name: 'Client 1', client_id: 1, hasPassword: false }]);
    render(
      <EntitySearch
        type="user"
        placeholder="Search clients"
        onSelect={() => {}}
        searchFn={searchFn}
      />,
    );

    const input = screen.getByLabelText(/search/i);
    fireEvent.change(input, { target: { value: 'Cli' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(searchFn).toHaveBeenCalled());

    const button = await screen.findByRole('button', { name: /Client 1 \(1\)/ });
    fireEvent.click(button);

    expect(screen.queryByText('No search results.')).not.toBeInTheDocument();
  });
});
