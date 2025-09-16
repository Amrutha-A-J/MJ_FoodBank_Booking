export default class UnauthorizedError extends Error {
  status: number;
  constructor(message = 'Invalid credentials') {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
  }
}
