import type { Match, MatchQuestion, MatchUser, User } from 'kysely-codegen/dist/db';
import { db } from './database';
import { sql, type Selectable } from 'kysely';
import { MARKED_TIMEOUT, MAX_USERS_PER_MATCH, QUESTIONS_PER_MATCH } from './constants';

export type OnMatchCreated = (data: {
  match: Selectable<Match>,
  matchQuestions: Selectable<MatchQuestion>[],
  matchUsers: Selectable<MatchUser>[],
  users: Selectable<User>[],
}) => any;

const findPendingPlayers = async (limit: number) => {
  return db
    .selectFrom('matchmakingQueue')
    .innerJoin('user', 'user.username', 'matchmakingQueue.userId')
    .selectAll('user')
    .where(eb => eb.or([
      eb('markedAt', 'is', null),
      // allow players to be marked again after timeout
      eb('markedAt', '<', new Date(Date.now() - MARKED_TIMEOUT)),
    ]))
    .limit(limit)
    .execute();
};

const markUsers = async (users: Selectable<User>[]) => {
  return db
    .updateTable('matchmakingQueue')
    .set('markedAt', new Date())
    .where('userId', 'in', users.map((player) => player.username))
    .execute();
};

const unmarkUsers = async (users: Selectable<User>[]) => {
  return db
    .updateTable('matchmakingQueue')
    .set('markedAt', null)
    .where('userId', 'in', users.map((player) => player.username))
    .execute();
}

const createMatch = async (users: Selectable<User>[]) => {
  const match = await db
    .insertInto('match')
    .values({ winnerId: null, isEnded: false })
    .returningAll()
    .executeTakeFirstOrThrow();

  const matchUsers = await Promise.all(users.map(async (user) => {
    return db
      .insertInto('matchUser')
      .values({ userId: user.username, matchId: match.id })
      .returningAll()
      .executeTakeFirstOrThrow();
  }));

  const questions = await db
    .selectFrom('question')
    .selectAll()
    .limit(QUESTIONS_PER_MATCH)
    .orderBy(sql`random()`)
    .execute();

  const matchQuestions = await Promise.all(questions.map(async (question, index) => {
    return db
      .insertInto('matchQuestion')
      .values({ questionId: question.id, matchId: match.id, order: index })
      .returningAll()
      .executeTakeFirstOrThrow();
  }));

  return { match, matchUsers, matchQuestions };
};

const matchmakingLoop = async (onMatchCreated: OnMatchCreated) => {
  const pendingUsers = await findPendingPlayers(MAX_USERS_PER_MATCH);
  if (pendingUsers.length < MAX_USERS_PER_MATCH) {
    return;
  }

  try {
    await markUsers(pendingUsers);
  } catch (error) {
    // another worker too the players or they left, try again later
    console.error('Error marking players:', error);
    return;
  }

  console.log('Found 2 players, creating match...');
  try {
    const { match, matchUsers, matchQuestions } = await createMatch(pendingUsers);
    await db
      .deleteFrom('matchmakingQueue')
      .where('userId', 'in', pendingUsers.map((player) => player.username))
      .execute();
    console.log('Match created:', match);
    onMatchCreated({
      match,
      matchQuestions,
      matchUsers,
      users: pendingUsers,
    });
  } catch (error) {
    console.error('Error creating match:', error);
    await unmarkUsers(pendingUsers);
    return;
  }
}

export const worker = {
  run: (onMatchCreated: OnMatchCreated) => {
    let enabled = true;

    (async () => {
      console.log('Worker running');

      while (enabled) {
        try {
          await matchmakingLoop(onMatchCreated);
        } catch (error) {
          console.error('Error in worker:', error);
        }

        await new Promise((resolve) => setTimeout(resolve, process.env.NODE_ENV === 'production' ? 100 : 500));
      }
    })();

    return () => {
      enabled = false;
    };
  },
};
