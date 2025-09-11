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
  const shuffle = () => {
    const arr = [...ENCOURAGEMENT_MESSAGES];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  let order = localStorage.getItem('encouragementOrder');
  let messages: string[];

  if (!order) {
    const shuffled = shuffle();
    order = JSON.stringify(shuffled);
    localStorage.setItem('encouragementOrder', order);
    localStorage.setItem('encouragementIndex', '0');
    messages = shuffled;
  } else {
    try {
      messages = JSON.parse(order);
    } catch {
      const shuffled = shuffle();
      order = JSON.stringify(shuffled);
      localStorage.setItem('encouragementOrder', order);
      localStorage.setItem('encouragementIndex', '0');
      messages = shuffled;
    }
  }

  const idx = Number(localStorage.getItem('encouragementIndex') ?? '0');
  const msg = messages[idx % messages.length];
  localStorage.setItem('encouragementIndex', String((idx + 1) % messages.length));
  return msg;
}
