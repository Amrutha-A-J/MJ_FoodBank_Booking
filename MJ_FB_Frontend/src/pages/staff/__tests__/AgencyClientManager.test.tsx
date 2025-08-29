import { render, screen, fireEvent } from '@testing-library/react';
import AgencyClientManager from '../AgencyClientManager';

jest.mock('../../../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect({ id: 1, name: 'Test Agency' })}>
    {props.type === 'agency' ? 'Select Agency' : 'Select Client'}
  </button>
));

jest.mock('../../../api/agencies', () => ({
  addAgencyClient: jest.fn(),
  removeAgencyClient: jest.fn(),
  getAgencyClients: jest.fn().mockResolvedValue([]),
}));

describe('AgencyClientManager', () => {
  it('shows agency search before selection then shows client search', async () => {
    render(<AgencyClientManager />);

    expect(screen.getByText('Select Agency')).toBeInTheDocument();
    expect(screen.queryByText('Select Client')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Select Agency'));

    expect(await screen.findByText('Select Client')).toBeInTheDocument();
    expect(
      await screen.findByText('Clients for Test Agency'),
    ).toBeInTheDocument();
  });
});
