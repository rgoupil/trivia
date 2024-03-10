import { Router, type Response } from 'express';
import { db } from '../database';
import { authenticated, type JWTRequest } from '../authentication/authenticated';
import type { MatchDTO } from './match.dto';

export const matchRouter = Router();

matchRouter.get('/:id', authenticated, async (req: JWTRequest, res: Response) => {
  const { id } = req.params;

  const match = await db
    .selectFrom('match')
    .selectAll('match')
    .where('match.id', '=', id)
    .executeTakeFirstOrThrow();

  const users = await db
    .selectFrom('matchUser')
    .innerJoin('user', 'user.username', 'matchUser.userId')
    .selectAll('user')
    .where('matchUser.matchId', '=', match.id)
    .execute();

  const answers = await db
    .selectFrom('matchQuestionAnswer')
    .selectAll()
    .where('matchQuestionAnswer.matchId', '=', match.id)
    .execute();

  const answeredQuestionsPerUser = await db
    .selectFrom('matchUser')
    .leftJoin('matchQuestionAnswer', eb =>
      eb
        .onRef('matchUser.userId', '=', 'matchQuestionAnswer.userId')
        .on('matchQuestionAnswer.isCorrect', '=', true)
        .on('matchQuestionAnswer.matchId', '=', match.id)
    )
    .select([
      'matchUser.userId',
      eb => eb.fn.count('matchQuestionAnswer.id').as('count'),
    ])
    .where('matchUser.matchId', '=', match.id)
    .groupBy('matchUser.userId')
    .execute()

  const score = answeredQuestionsPerUser.reduce((acc, curr) => ({ ...acc, [curr.userId]: Number(curr.count) }), {});

  const dto: MatchDTO = {
    ...match,
    users,
    answers,
    score,
  };
  res.status(200).json(dto);
});
