export const APPRECIATION_MESSAGES = [
  'Thanks for all you do!',
  'Your support makes a difference!',
  'We appreciate your commitment!',
];

export function getRandomAppreciation(): string {
  const idx = Math.floor(Math.random() * APPRECIATION_MESSAGES.length);
  return APPRECIATION_MESSAGES[idx];
}
