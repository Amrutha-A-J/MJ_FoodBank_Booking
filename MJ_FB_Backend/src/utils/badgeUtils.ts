import { enqueueEmail } from './emailQueue';

const badgeCardMap = new Map<string, string>();

export function awardMilestoneBadge(email: string, badge: string): string {
  const cardUrl = `/cards/${badge}-thank-you-card.pdf`;
  const body = `Thanks for helping us reach the ${badge} milestone.\nDownload your card: ${cardUrl}`;
  enqueueEmail({ to: email, templateId: 1, params: { body, cardUrl } });
  badgeCardMap.set(email, cardUrl);
  return cardUrl;
}

export function getBadgeCardLink(email: string): string | undefined {
  return badgeCardMap.get(email);
}
