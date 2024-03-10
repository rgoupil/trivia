import { Pool } from 'pg';
import { CamelCasePlugin, Kysely, ParseJSONResultsPlugin, PostgresDialect } from 'kysely';
import { DB } from 'kysely-codegen/dist/db';

export type Database = DB;

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    }),
  }),
  plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin()],
});
