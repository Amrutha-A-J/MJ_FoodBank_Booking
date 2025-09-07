import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EntitySearch from '../components/EntitySearch';

describe('EntitySearch', () => {
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

    await waitFor(() => expect(searchFn).toHaveBeenCalled());

    const button = await screen.findByRole('button', { name: /Client 1 \(1\)/ });
    fireEvent.click(button);

    expect((input as HTMLInputElement).value).toBe('');
  });
});
