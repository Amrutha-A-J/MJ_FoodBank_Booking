import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MailLists from '../pages/donor-management/MailLists';
import { getMailLists, sendMailListEmails } from '../api/monetaryDonors';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../api/monetaryDonors', () => ({
  getMailLists: jest.fn(),
  sendMailListEmails: jest.fn(),
}));

describe('MailLists', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = mockFetch();
  });

  afterEach(() => {
    restoreFetch();
    jest.clearAllMocks();
  });

  it('calls sendMailListEmails when the send button is clicked', async () => {
    (getMailLists as jest.Mock).mockResolvedValue({
      '1-100': [
        { id: 1, firstName: 'Alice', lastName: 'A', email: 'a@example.com', amount: 50 },
      ],
      '101-500': [],
      '501-1000': [],
      '1001-10000': [],
      '10001-30000': [],
    });

    const now = new Date();
    now.setUTCMonth(now.getUTCMonth() - 1);
    const monthName = now.toLocaleString('en-CA', { month: 'long' });

    renderWithProviders(
      <MemoryRouter>
        <MailLists />
      </MemoryRouter>
    );

    const btn = await screen.findByRole('button', { name: /send emails for/i });
    await waitFor(() => expect(btn).toBeEnabled());
    expect(btn).toHaveTextContent(`Send emails for (${monthName})`);

    await userEvent.click(btn);
    await userEvent.click(await screen.findByRole('button', { name: /confirm/i }));
    expect(sendMailListEmails).toHaveBeenCalledWith({
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
    });
  });

  it('enables send when at least one list has donors', async () => {
    (getMailLists as jest.Mock).mockResolvedValue({
      '1-100': [],
      '101-500': [
        { id: 2, firstName: 'Bob', lastName: 'B', email: 'b@example.com', amount: 150 },
      ],
      '501-1000': [],
      '1001-10000': [],
      '10001-30000': [],
    });

    const now = new Date();
    now.setUTCMonth(now.getUTCMonth() - 1);
    const monthName = now.toLocaleString('en-CA', { month: 'long' });

    renderWithProviders(
      <MemoryRouter>
        <MailLists />
      </MemoryRouter>
    );

    const btn = await screen.findByRole('button', { name: /send emails for/i });
    await waitFor(() => expect(btn).toBeEnabled());
    expect(btn).toHaveTextContent(`Send emails for (${monthName})`);
    expect(
      screen.queryByText('No donors to email for last month')
    ).not.toBeInTheDocument();
  });
  it('disables send and shows helper text when there are no donors', async () => {
    (getMailLists as jest.Mock).mockResolvedValue({
      '1-100': [],
      '101-500': [],
      '501-1000': [],
      '1001-10000': [],
      '10001-30000': [],
    });

    const now = new Date();
    now.setUTCMonth(now.getUTCMonth() - 1);
    const monthName = now.toLocaleString('en-CA', { month: 'long' });

    renderWithProviders(
      <MemoryRouter>
        <MailLists />
      </MemoryRouter>
    );

    const btn = await screen.findByRole('button', { name: /send emails for/i });
    await waitFor(() => expect(btn).toBeDisabled());
    expect(btn).toHaveTextContent(`Send emails for (${monthName})`);
    expect(
      await screen.findByText('No donors to email for last month')
    ).toBeInTheDocument();
  });
});

