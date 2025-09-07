import {
  buildCancelRescheduleLinks,
  buildCalendarLinks,
} from '../src/utils/emailUtils';
import config from '../src/config';
import logger from '../src/utils/logger';
import { shutdownQueue } from '../src/utils/emailQueue';

describe('buildCancelRescheduleLinks', () => {
  afterEach(() => {
    shutdownQueue();
  });
  it('returns cancel and reschedule links', () => {
    const token = 'tok';
    const links = buildCancelRescheduleLinks(token);
    expect(links).toEqual({
      cancelLink: `http://localhost:5173/cancel/${token}`,
      rescheduleLink: `http://localhost:5173/reschedule/${token}`,
    });
  });

  it('returns placeholder links when no frontend origin is configured', () => {
    const original = config.frontendOrigins;
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    config.frontendOrigins = [];

    const links = buildCancelRescheduleLinks('tok');
    expect(links).toEqual({ cancelLink: '#', rescheduleLink: '#' });
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
    config.frontendOrigins = original;
  });

  it('builds calendar links using Regina timezone', () => {
    const {
      googleCalendarLink,
      outlookCalendarLink,
      appleCalendarLink,
    } = buildCalendarLinks('2024-09-11', '09:30:00', '10:00:00');
    expect(googleCalendarLink).toContain(
      'dates=20240911T153000Z/20240911T160000Z',
    );
    expect(outlookCalendarLink).toContain(
      `startdt=${encodeURIComponent('2024-09-11T15:30:00.000Z')}`,
    );
    const [, base64] = appleCalendarLink.split(',');
    expect(Buffer.from(base64, 'base64').toString()).toContain(
      'BEGIN:VCALENDAR',
    );
  });
});
