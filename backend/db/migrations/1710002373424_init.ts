import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('user')
    .addColumn('username', 'text', (col) => col
      .primaryKey().notNull())
    .addColumn('password', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn('updated_at', 'timestamptz')
    .execute();

  await db.schema
    .createTable('question')
    .addColumn('id', 'uuid', (col) =>
      col
        .primaryKey()
        .defaultTo(sql`gen_random_uuid()`)
        .notNull(),
    )
    .addColumn('question', 'text', (col) => col.notNull())
    .addColumn('answer', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn('updated_at', 'timestamptz')
    .execute();

  await db.schema
    .createTable('matchmaking_queue')
    .addColumn('user_id', 'text', (col) => col.primaryKey().notNull().references('user.username'))
    .addColumn('marked_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createTable('match')
    .addColumn('id', 'uuid', (col) =>
      col
        .primaryKey()
        .defaultTo(sql`gen_random_uuid()`)
        .notNull(),
    )
    .addColumn('is_ended', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('winner_id', 'text', (col) => col.references('user.username'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn('updated_at', 'timestamptz')
    .execute();

  await db.schema
    .createTable('match_user')
    .addColumn('id', 'uuid', (col) =>
      col
        .primaryKey()
        .defaultTo(sql`gen_random_uuid()`)
        .notNull(),
    )
    .addColumn('user_id', 'text', (col) => col.notNull().references('user.username'))
    .addColumn('match_id', 'uuid', (col) => col.notNull().references('match.id'))
    .execute();

  await db.schema
    .createTable('match_question')
    .addColumn('id', 'uuid', (col) =>
      col
        .primaryKey()
        .defaultTo(sql`gen_random_uuid()`)
        .notNull(),
    )
    .addColumn('match_id', 'uuid', (col) => col.notNull().references('match.id'))
    .addColumn('question_id', 'uuid', (col) => col.notNull().references('question.id'))
    .addColumn('is_answered', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('order', 'integer', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('match_question_answer')
    .addColumn('id', 'uuid', (col) =>
      col
        .primaryKey()
        .defaultTo(sql`gen_random_uuid()`)
        .notNull(),
    )
    .addColumn('match_id', 'uuid', (col) => col.notNull().references('match.id'))
    .addColumn('question_id', 'uuid', (col) => col.notNull().references('question.id'))
    .addColumn('user_id', 'text', (col) => col.notNull().references('user.username'))
    .addColumn('answer', 'text', (col) => col.notNull())
    .addColumn('is_correct', 'boolean', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await (db as Kysely<{ user: { username: string, password: string } }>).insertInto('user').values([
    // password1
    { username: 'user1', password: '$argon2i$v=19$m=4096,t=3,p=1$Kw/S7j+qgvLl/ZlufD91XA$05wFG/0dQB6EdROkjvmEXpy2lu1UV8y3pnpIt2FAL/0' },
    // password2
    { username: 'user2', password: '$argon2i$v=19$m=4096,t=3,p=1$4uDgfr/vBFHn6qXBPy35fA$2ql9c1WYOFa569RcyR75PaMGzEL8O9M/nenA8JGAZag' },
    // password3
    { username: 'user3', password: '$argon2i$v=19$m=4096,t=3,p=1$DhYpubHmzzmC0Eqi2EtmdQ$yQirYV3MZOGhPsE44VQ8zWsTuWNib4Fr3OZQk5KfIsM' },
  ]).execute();

  await (db as Kysely<{ question: { id: string, question: string, answer: string } }>).insertInto('question').values([
    { id: '36db16ed-ba8f-4243-bc76-c63dec15b4a1', question: 'What is the capital of Finland?', answer: 'Helsinki' },
    { id: '19f45a71-f804-4833-a278-d5fc38a06952', question: 'What is the capital of Sweden?', answer: 'Stockholm' },
    { id: '340d8851-12ea-4b2d-bf5a-0ec57611d8e0', question: 'In what city is the Eiffel Tower located?', answer: 'Paris' },
    { id: '21350a52-f5c7-4160-9fb7-657c6d41a3da', question: 'In what city is the Statue of Liberty located?', answer: 'New York' },
    { id: '7ca97954-2539-4ec8-aade-7c3265c924d3', question: 'What is the capital of France?', answer: 'Paris' },
    { id: '6ebfa943-5c3d-4b94-aa89-d521d8500a6c', question: 'Where is the largest desert in the world located?', answer: 'Sahara' },
    { id: '65532d23-6e5c-4087-96db-5eb4b136a560', question: 'How many continents are there?', answer: '7' },
    { id: 'eb419af3-d65a-4cdb-8006-14a8a7486735', question: 'How many bits are in a byte?', answer: '8' },
    { id: '6b0eec8b-9b42-437d-8b55-23a7fe31adb8', question: 'What is the capital of the United States?', answer: 'Washington' },
    { id: '828a4b08-55f7-4aa0-bec9-cdf6deda18d0', question: 'What is the capital of Romania?', answer: 'Bucharest' },
    { id: 'd2572b86-51d5-49fc-b229-77cd156b1c00', question: 'How many fingers do humans have?', answer: '10' },
  ]).execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('matchmaking_queue').execute();
  await db.schema.dropTable('match_user').execute();
  await db.schema.dropTable('match_question').execute();
  await db.schema.dropTable('match_question_answer').execute();
  await db.schema.dropTable('question').execute();
  await db.schema.dropTable('match').execute();
  await db.schema.dropTable('user').execute();
}
