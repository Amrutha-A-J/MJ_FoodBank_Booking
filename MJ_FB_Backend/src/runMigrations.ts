import pgMigrate from 'node-pg-migrate';
import config from './config';
import logger from './utils/logger';

async function runMigrations() {
  try {
    const migrations = await pgMigrate({
      databaseUrl: {
        host: config.pgHost,
        port: config.pgPort,
        database: config.pgDatabase,
        user: config.pgUser,
        password: config.pgPassword,
      },
      dir: 'src/migrations',
      direction: 'up',
      migrationsTable: 'pgmigrations',
      tsconfig: 'tsconfig.json',
      logger: {
        log: msg => logger.info(msg),
        error: msg => logger.error(msg),
      },
    });
    logger.info(`Migrations applied: ${migrations.join(', ') || 'none'}`);
  } catch (error) {
    logger.error(`Migration failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

runMigrations();
