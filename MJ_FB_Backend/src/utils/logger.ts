// Simple logger utility wrapping console methods. In a real-world scenario
// this could be replaced with a more robust library like winston, but using
// console ensures no external dependencies are required.

type LogFn = (message: string, ...meta: any[]) => void;

interface Logger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
}

const logger: Logger = {
  info: (msg, ...meta) => console.info(msg, ...meta),
  warn: (msg, ...meta) => console.warn(msg, ...meta),
  error: (msg, ...meta) => console.error(msg, ...meta),
  debug: (msg, ...meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(msg, ...meta);
    }
  },
};

export default logger;

