import type { DonorSeedResult } from '../src/setupDatabase';

describe('seedDonors without unique constraint', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.unmock('pg');
    jest.dontMock('pg');
  });

  it('seeding twice keeps one row per donor without unique index', async () => {
    let firstRun: DonorSeedResult | undefined;
    let secondRun: DonorSeedResult | undefined;
    let donorsInserted: Map<string, number> | undefined;

    await new Promise<void>((resolve, reject) => {
      jest.isolateModules(() => {
        class FakeClient {
          private static donorCounts = new Map<string, number>();

          async connect(): Promise<void> {
            // no-op
          }

          async end(): Promise<void> {
            // no-op
          }

          async query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number } | void> {
            if (text.includes("FROM information_schema.columns") && text.includes("column_name = 'name'")) {
              return { rows: [{ exists: true }], rowCount: 1 };
            }

            if (text.startsWith('ALTER TABLE donors ADD COLUMN')) {
              return { rows: [], rowCount: 0 };
            }

            if (text.includes('SELECT column_name, is_nullable, column_default') && text.includes("table_name = 'donors'")) {
              return {
                rows: [
                  { column_name: 'name', is_nullable: 'NO', column_default: null },
                  { column_name: 'is_pet_food', is_nullable: 'NO', column_default: 'false' },
                ],
                rowCount: 2,
              };
            }

            if (text.includes('FROM pg_constraint')) {
              return { rows: [], rowCount: 0 };
            }

            if (text.includes('FROM pg_index')) {
              return { rows: [], rowCount: 0 };
            }

            if (text.trim().toUpperCase().startsWith('SELECT NAME FROM DONORS')) {
              const rows = Array.from(FakeClient.donorCounts.entries()).map(([name]) => ({ name }));
              return { rows, rowCount: rows.length };
            }

            if (text.startsWith('INSERT INTO donors')) {
              if (!params) {
                throw new Error('Expected parameters for donor insert');
              }
              const columnMatch = text.match(/INSERT INTO donors \(([^)]+)\)/);
              const columnCount = columnMatch ? columnMatch[1].split(',').length : 2;
              for (let index = 0; index < params.length; index += columnCount) {
                const name = params[index] as string;
                const current = FakeClient.donorCounts.get(name) ?? 0;
                FakeClient.donorCounts.set(name, current + 1);
              }
              return { rows: [], rowCount: params.length / columnCount };
            }

            throw new Error(`Unexpected query: ${text}`);
          }

          static reset(): void {
            FakeClient.donorCounts = new Map<string, number>();
          }

          static snapshot(): Map<string, number> {
            return new Map(FakeClient.donorCounts);
          }
        }

        FakeClient.reset();

        jest.doMock('pg', () => ({
          __esModule: true,
          Client: FakeClient,
        }));

        void import('../src/setupDatabase')
          .then(async ({ seedDonors }) => {
            firstRun = await seedDonors();
            secondRun = await seedDonors();
            donorsInserted = FakeClient.snapshot();
            resolve();
          })
          .catch(reject);
      });
    });

    if (!firstRun || !secondRun || !donorsInserted) {
      throw new Error('Donor seed did not run as expected');
    }

    const duplicates = Array.from(donorsInserted.entries()).filter(([, count]) => count > 1);

    expect(firstRun).toEqual({ donorsSeeded: true, missingNameColumn: false });
    expect(secondRun).toEqual({ donorsSeeded: false, missingNameColumn: false });
    expect(donorsInserted.size).toBeGreaterThan(0);
    expect(duplicates).toEqual([]);
  });
});
