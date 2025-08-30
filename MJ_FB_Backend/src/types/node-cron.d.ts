declare module 'node-cron' {
  export interface ScheduledTask {
    start: () => void;
    stop: () => void;
  }
  export function schedule(
    expression: string,
    callback: () => void,
    options?: { timezone?: string },
  ): ScheduledTask;
}
