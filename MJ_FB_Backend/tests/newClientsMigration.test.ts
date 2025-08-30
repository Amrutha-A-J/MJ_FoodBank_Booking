import fs from 'fs';
import path from 'path';

describe('new_clients migration', () => {
  it('creates table and booking column', () => {
    const dir = path.join(__dirname, '../src/migrations');
    const file = fs.readdirSync(dir).find(f => f.includes('new_clients'));
    expect(file).toBeDefined();
    const content = fs.readFileSync(path.join(dir, file as string), 'utf8');
    expect(content).toMatch(/createTable\(['"]new_clients['"]/);
    expect(content).toMatch(/addColumn\(['"]bookings['"][\s\S]*new_client_id/);
  });
});
