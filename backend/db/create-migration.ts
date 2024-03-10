import * as path from 'path';
import * as fs from 'fs';
import { createInterface } from 'node:readline';

function createMigration(name: string) {
  const migrationsDir = path.join(__dirname, 'migrations');
  const templatePath = path.join(__dirname, 'migration.template.ts');
  const migrationPath = path.join(migrationsDir, `${Date.now()}_${name}.ts`);

  fs.copyFileSync(templatePath, migrationPath);

  console.log(`Created migration: ${migrationPath}`);
}

// read migration name from args[1] or prompt for migration name
if (process.argv[2]) {
  createMigration(process.argv[2]);
} else {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  readline.question('Enter migration name: ', (name) => {
    if (!name.trim()) {
      console.error('Migration name is required');
      process.exit(1);
    }
    createMigration(name);
    readline.close();
  });
}
