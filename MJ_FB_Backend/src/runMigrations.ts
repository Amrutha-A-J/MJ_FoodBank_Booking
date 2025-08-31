import pgMigrate from 'node-pg-migrate';
import config from './config';
import logger from './utils/logger';

export async function runMigrations() {
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
        info: msg => logger.info(msg),
        warn: msg => logger.warn(msg),
        error: msg => logger.error(msg),
      },
    });

    if (migrations.length > 0) {
      migrations.forEach(name => logger.info(`Applied migration: ${name}`));
    } else {
      logger.info('No migrations to apply');
    }
  } catch (error) {
    logger.error(`Migration failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}
