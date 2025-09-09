import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MailLists from '../pages/donor-management/MailLists';
import { getMailLists, sendMailListEmails } from '../api/monetaryDonors';
import { renderWithProviders } from '../testUtils/renderWithProviders';

jest.mock('../api/monetaryDonors', () => ({
  getMailLists: jest.fn(),
  sendMailListEmails: jest.fn(),
}));

describe('MailLists', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-07-05T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calls sendMailListEmails when the send button is clicked', async () => {
    (getMailLists as jest.Mock).mockResolvedValue({
      '1-100': [
        { id: 1, firstName: 'Alice', lastName: 'A', email: 'a@example.com', amount: 50 },
      ],
      '101-500': [],
      '501+': [],
    });

    renderWithProviders(<MailLists />);

    const btn = await screen.findByRole('button', { name: /send emails/i });
    expect(btn).toBeEnabled();

    await userEvent.click(btn);
    expect(sendMailListEmails).toHaveBeenCalledWith(2024, 6);
  });
});

