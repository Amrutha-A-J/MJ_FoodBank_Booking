import { formatReginaDate, reginaStartOfDayISO } from '../src/utils/dateUtils';

describe('formatReginaDate', () => {
  it('interprets YYYY-MM-DD strings in Regina timezone', () => {
    expect(formatReginaDate('2024-08-26')).toBe('2024-08-26');
  });
});

describe('reginaStartOfDayISO', () => {
  it('returns midnight in Regina for given date string', () => {
    const realDTF = Intl.DateTimeFormat;
    const spy = jest
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation((locale, options) => {
        if ((options as Intl.DateTimeFormatOptions)?.timeZoneName === 'longOffset') {
          return {
            formatToParts: () => [{ type: 'timeZoneName', value: 'GMT-06:00' }],
          } as unknown as Intl.DateTimeFormat;
        }
        return new realDTF(locale, options);
      });

    expect(reginaStartOfDayISO('2024-08-26')).toBe('2024-08-26T00:00:00-06:00');

    spy.mockRestore();
  });
});
