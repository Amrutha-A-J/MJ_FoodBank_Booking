import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MailLists from '../pages/donor-management/MailLists';
import { getMailLists, sendMailListEmails } from '../api/monetaryDonors';

jest.mock('../api/monetaryDonors');

describe('MailLists', () => {
  it('sends emails when button clicked', async () => {
    (getMailLists as jest.Mock).mockResolvedValue({
      '1-100': [],
      '101-500': [],
      '501+': [],
    });
    (sendMailListEmails as jest.Mock).mockResolvedValue(undefined);
    jest.useFakeTimers().setSystemTime(new Date('2024-07-05T00:00:00Z'));

    render(<MailLists />);
    expect(await screen.findByText('$1-100')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /send emails/i });
    await userEvent.click(button);

    expect(sendMailListEmails).toHaveBeenCalledWith(2024, 7);
    jest.useRealTimers();
  });
});
