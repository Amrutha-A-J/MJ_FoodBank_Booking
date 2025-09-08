import useMediaQuery from '@mui/material/useMediaQuery';
import ResponsiveTable, { type Column } from '../ResponsiveTable';
import { renderWithProviders, screen } from '../../../testUtils/renderWithProviders';

jest.mock('@mui/material/useMediaQuery');

interface Row {
  id: number;
  name?: string;
}

describe('ResponsiveTable', () => {
  const mockedUseMediaQuery = useMediaQuery as jest.Mock;

  beforeEach(() => {
    mockedUseMediaQuery.mockReturnValue(false);
  });

  it('renders values and handles missing fields', () => {
    const columns: Column<Row>[] = [{ field: 'name', header: 'Name' }];
    const rows: Row[] = [
      { id: 1, name: 'Alice' },
      { id: 2 },
    ];

    renderWithProviders(
      <ResponsiveTable columns={columns} rows={rows} getRowKey={r => r.id} />,
    );

    const cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Alice');
    expect(cells[1]).toHaveTextContent('');
  });

  it('renders cards on small screens without undefined text', () => {
    mockedUseMediaQuery.mockReturnValue(true);
    const columns: Column<Row>[] = [{ field: 'name', header: 'Name' }];
    const rows: Row[] = [{ id: 1 }];

    renderWithProviders(
      <ResponsiveTable columns={columns} rows={rows} getRowKey={r => r.id} />,
    );

    const card = screen.getByTestId('responsive-table-card');
    expect(card).toHaveTextContent('Name');
    expect(card).not.toHaveTextContent('undefined');
  });
});

