const badgeCardMap = new Map<string, string>();

export function awardMilestoneBadge(email: string, badge: string): string {
  const cardUrl = `/cards/${badge}-thank-you-card.pdf`;
  badgeCardMap.set(email, cardUrl);
  return cardUrl;
}

export function getBadgeCardLink(email: string): string | undefined {
  return badgeCardMap.get(email);
}
