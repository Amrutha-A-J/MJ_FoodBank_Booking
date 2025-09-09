import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MailLists from '../pages/donor-management/MailLists';
import { getMailLists, sendMailListEmails } from '../api/monetaryDonors';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

jest.mock('../api/monetaryDonors', () => ({
  getMailLists: jest.fn(),
  sendMailListEmails: jest.fn(),
}));

describe('MailLists', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables send button and shows helper text when no donors', async () => {
    (getMailLists as jest.Mock).mockResolvedValue({
      '1-100': [],
      '101-500': [],
      '501+': [],
    });

    renderWithProviders(<MailLists />);

    const helper = await screen.findAllByText(/no donors/i);
    expect(helper).toHaveLength(3);
    const btn = screen.getByRole('button', { name: /send emails/i });
    expect(btn).toBeDisabled();
  });

  it('enables send button when at least one list has donors', async () => {
    (getMailLists as jest.Mock).mockResolvedValue({
      '1-100': [
        { id: 1, firstName: 'Alice', lastName: 'A', email: 'a@example.com', amount: 50 },
      ],
      '101-500': [],
      '501+': [],
    });

    renderWithProviders(<MailLists />);

    await screen.findByText('Alice A');
    const btn = screen.getByRole('button', { name: /send emails/i });
    expect(btn).toBeEnabled();

    await userEvent.click(btn);
    const now = new Date();
    now.setUTCMonth(now.getUTCMonth() - 1);
    expect(sendMailListEmails).toHaveBeenCalledWith({
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
    });
  });
});

