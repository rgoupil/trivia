import * as path from 'path';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
  type MigrationResult,
} from 'kysely';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({
  path: path.join(__dirname, '..', '.env'),
});

async function migrateToLatest() {
  const database = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL!,
      }),
    }),
  });

  const migrator = new Migrator({
    db: database,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const action = process.argv[2];
  let error: unknown;
  let results: MigrationResult[] | undefined;
  switch (action) {
    case 'up':
      {
        const res = await migrator.migrateUp();
        error = res.error;
        results = res.results;
      }
      break;
    case 'down':
      {
        const res = await migrator.migrateDown();
        error = res.error;
        results = res.results;
      }
      break;
    default:
      {
        const res = await migrator.migrateToLatest();
        error = res.error;
        results = res.results;
      }
      break;
  }

  results?.forEach((migrationResult) => {
    if (migrationResult.status === 'Success') {
      console.log(
        `migration "${migrationResult.migrationName}" was ${action === 'down' ? 'reverted' : 'executed'} successfully`,
      );
    } else if (migrationResult.status === 'Error') {
      console.error(
        `failed to execute migration "${migrationResult.migrationName}"`,
      );
    }
  });

  if (error) {
    console.error('Failed to migrate');
    console.error(error);
    process.exit(1);
  }

  await database.destroy();
}

migrateToLatest();
