process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';

jest.mock(
  'exceljs',
  () => ({
    __esModule: true,
    default: {
      Workbook: class {
        worksheet = { columns: [], addRow: jest.fn() };
        xlsx = { writeBuffer: jest.fn().mockResolvedValue(Buffer.from('test')) };
        addWorksheet() {
          return this.worksheet;
        }
      },
    },
  }),
  { virtual: true },
);
export {};
