import pool from '../src/db';
import './utils/mockDb';

const {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} = require('../src/controllers/pantry/pantryAggregationController');

const year = new Date().getFullYear();

describe('pantry aggregation roll-ups', () => {
  beforeEach(() => {
    (pool.query as jest.Mock).mockReset();
  });

  it('rolls up multiple weeks into monthly and yearly totals', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ visits: 1, adults: 2, children: 3, weight: 10 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ visits: 2, adults: 3, children: 4, weight: 20 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ visits: 3, adults: 5, children: 7, weight: 30 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ visits: 3, adults: 5, children: 7, weight: 30 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ month: 5, orders: 3, adults: 5, children: 7, people: 12, foodWeight: 30 }] })
      .mockResolvedValueOnce({ rows: [{ year, orders: 3, adults: 5, children: 7, people: 12, foodWeight: 30 }] });

    await refreshPantryWeekly(year, 5, 1);
    await refreshPantryWeekly(year, 5, 2);
    await refreshPantryMonthly(year, 5);
    await refreshPantryYearly(year);
    const monthlyRes = await pool.query(
      'SELECT month, orders, adults, children, people, weight AS "foodWeight" FROM pantry_monthly_overall WHERE year = $1 ORDER BY month',
      [year],
    );
    const yearlyRes = await pool.query(
      'SELECT year, orders, adults, children, people, weight AS "foodWeight" FROM pantry_yearly_overall ORDER BY year',
    );
    expect(monthlyRes.rows).toEqual([
      { month: 5, orders: 3, adults: 5, children: 7, people: 12, foodWeight: 30 },
    ]);
    expect(yearlyRes.rows).toEqual([
      { year, orders: 3, adults: 5, children: 7, people: 12, foodWeight: 30 },
    ]);
  });

  it('updates an existing week and keeps roll-ups consistent', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ visits: 1, adults: 2, children: 3, weight: 10 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ visits: 2, adults: 3, children: 4, weight: 20 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ visits: 3, adults: 5, children: 7, weight: 30 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ visits: 3, adults: 5, children: 7, weight: 30 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ month: 5, orders: 3, adults: 5, children: 7, people: 12, foodWeight: 30 }] })
      .mockResolvedValueOnce({ rows: [{ year, orders: 3, adults: 5, children: 7, people: 12, foodWeight: 30 }] })
      .mockResolvedValueOnce({ rows: [{ visits: 5, adults: 6, children: 7, weight: 40 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ visits: 7, adults: 9, children: 11, weight: 60 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ visits: 7, adults: 9, children: 11, weight: 60 }] })
      .mockResolvedValueOnce({ rows: [{ orders: 0, weight: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ month: 5, orders: 7, adults: 9, children: 11, people: 20, foodWeight: 60 }] })
      .mockResolvedValueOnce({ rows: [{ year, orders: 7, adults: 9, children: 11, people: 20, foodWeight: 60 }] });

    await refreshPantryWeekly(year, 5, 1);
    await refreshPantryWeekly(year, 5, 2);
    await refreshPantryMonthly(year, 5);
    await refreshPantryYearly(year);
    let res = await pool.query(
      'SELECT month, orders, adults, children, people, weight AS "foodWeight" FROM pantry_monthly_overall WHERE year = $1 ORDER BY month',
      [year],
    );
    expect(res.rows).toEqual([
      { month: 5, orders: 3, adults: 5, children: 7, people: 12, foodWeight: 30 },
    ]);
    res = await pool.query(
      'SELECT year, orders, adults, children, people, weight AS "foodWeight" FROM pantry_yearly_overall ORDER BY year',
    );
    expect(res.rows).toEqual([
      { year, orders: 3, adults: 5, children: 7, people: 12, foodWeight: 30 },
    ]);
    await refreshPantryWeekly(year, 5, 1);
    await refreshPantryMonthly(year, 5);
    await refreshPantryYearly(year);
    res = await pool.query(
      'SELECT month, orders, adults, children, people, weight AS "foodWeight" FROM pantry_monthly_overall WHERE year = $1 ORDER BY month',
      [year],
    );
    expect(res.rows).toEqual([
      { month: 5, orders: 7, adults: 9, children: 11, people: 20, foodWeight: 60 },
    ]);
    res = await pool.query(
      'SELECT year, orders, adults, children, people, weight AS "foodWeight" FROM pantry_yearly_overall ORDER BY year',
    );
    expect(res.rows).toEqual([
      { year, orders: 7, adults: 9, children: 11, people: 20, foodWeight: 60 },
    ]);
  });
});
