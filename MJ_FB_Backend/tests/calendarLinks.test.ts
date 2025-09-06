import { buildGoogleCalendarLink, buildIcsFile, buildCalendarLinks } from '../src/utils/calendarLinks';

describe('calendar link utilities', () => {
  it('builds a Google Calendar link with encoded parameters', () => {
    const url = buildGoogleCalendarLink({
      title: 'Food & Fun',
      start: new Date('2024-09-01T10:00:00Z'),
      end: new Date('2024-09-01T11:00:00Z'),
      description: 'Bring snacks & drinks',
      location: '123 Main St',
    });

    expect(url).toBe(
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Food%20%26%20Fun&dates=20240901T100000Z/20240901T110000Z&details=Bring%20snacks%20%26%20drinks&location=123%20Main%20St'
    );
  });

  it('creates an ICS file string with event details', () => {
    const ics = buildIcsFile({
      title: 'Food & Fun',
      start: new Date('2024-09-01T10:00:00Z'),
      end: new Date('2024-09-01T11:00:00Z'),
      description: 'Bring snacks & drinks',
      location: '123 Main St',
      uid: 'abc123',
      sequence: 0,
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('METHOD:REQUEST');
    expect(ics).toContain('UID:abc123');
    expect(ics).toContain('SEQUENCE:0');
    expect(ics).toContain('SUMMARY:Food & Fun');
    expect(ics).toContain('DTSTART:20240901T100000Z');
    expect(ics).toContain('DTEND:20240901T110000Z');
    expect(ics).toContain('DESCRIPTION:Bring snacks & drinks');
    expect(ics).toContain('LOCATION:123 Main St');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('creates a cancellation ICS referencing the same UID', () => {
    const ics = buildIcsFile({
      title: 'Food & Fun',
      start: new Date('2024-09-01T10:00:00Z'),
      end: new Date('2024-09-01T11:00:00Z'),
      uid: 'abc123',
      method: 'CANCEL',
      sequence: 0,
    });

    expect(ics).toContain('METHOD:CANCEL');
    expect(ics).toContain('UID:abc123');
    expect(ics).toContain('SEQUENCE:0');
  });

  it('builds links from a booking object', () => {
    const links = buildCalendarLinks({
      date: '2024-09-01',
      start_time: '09:00:00',
      end_time: '10:00:00',
    });

    expect(links.google).toContain('text=Moose%20Jaw%20Food%20Bank%20Booking');
    expect(links.ics).toContain('SUMMARY:Moose Jaw Food Bank Booking');
  });
});
