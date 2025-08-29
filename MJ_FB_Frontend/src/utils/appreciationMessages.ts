export const APPRECIATION_MESSAGES = [
  'Thanks for all you do!',
  'Your support makes a difference!',
  'We appreciate your commitment!',
];

export const ENCOURAGEMENT_MESSAGES = [
  'Keep up the great work!',
  "You're making a difference!",
  'Your dedication matters!',
];

export function getRandomAppreciation(): string {
  const idx = Math.floor(Math.random() * APPRECIATION_MESSAGES.length);
  return APPRECIATION_MESSAGES[idx];
}

export function getNextEncouragement(): string {
  let order = localStorage.getItem('encouragementOrder');
  if (!order) {
    const shuffled = [...ENCOURAGEMENT_MESSAGES];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    order = JSON.stringify(shuffled);
    localStorage.setItem('encouragementOrder', order);
    localStorage.setItem('encouragementIndex', '0');
  }
  const messages: string[] = JSON.parse(order);
  const idx = Number(localStorage.getItem('encouragementIndex') ?? '0');
  const msg = messages[idx % messages.length];
  localStorage.setItem('encouragementIndex', String((idx + 1) % messages.length));
  return msg;
}
