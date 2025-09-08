import { render, screen } from '@testing-library/react';
import ResponsiveTable from '../components/ResponsiveTable';
import { useMediaQuery } from '@mui/material';

jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return { ...actual, useMediaQuery: jest.fn() };
});

const useMediaQueryMock = useMediaQuery as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
});

describe('ResponsiveTable', () => {
  const columns = [
    { field: 'name', header: 'Name' },
    { field: 'age', header: 'Age' },
  ];
  const rows = [{ id: 1, name: 'Alice', age: 30 }];

  it('renders a table on large screens', () => {
    useMediaQueryMock.mockReturnValue(false);
    render(
      <ResponsiveTable columns={columns} rows={rows} getRowKey={(r) => r.id} />,
    );
    expect(screen.getByTestId('responsive-table-table')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders cards on small screens', () => {
    useMediaQueryMock.mockReturnValue(true);
    render(
      <ResponsiveTable columns={columns} rows={rows} getRowKey={(r) => r.id} />,
    );
    expect(screen.queryByTestId('responsive-table-table')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('responsive-table-card')).toHaveLength(1);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
  });
});
