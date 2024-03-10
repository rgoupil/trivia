
import { Router, type Response, type Request } from 'express';
import { db } from '../database';
import { authenticated, type JWTRequest } from '../authentication/authenticated';
import type { QuestionDTO } from './question.dto';
import { CreateQuestionInputDTO } from './create-question-input.dto';
import { validate } from '../validate';
import { UpdateQuestionInputDTO } from './update-question-input.dto';

export const questionRouter = Router();

questionRouter.post('/', validate(CreateQuestionInputDTO), async (req: Request, res: Response) => {
  const { body: { question, answer } } = req as CreateQuestionInputDTO;

  const newQuestion = await db
    .insertInto('question')
    .values({ question, answer })
    .returningAll()
    .executeTakeFirstOrThrow();

  const dto: QuestionDTO = newQuestion;
  res.status(200).json(dto);
});

questionRouter.patch('/:id', validate(UpdateQuestionInputDTO), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body: { question, answer } } = req as UpdateQuestionInputDTO;

  const updatedQuestion = await db
    .updateTable('question')
    .set({ question, answer, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();

  const dto: QuestionDTO = updatedQuestion;
  res.status(200).json(dto);
});

questionRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  await db.deleteFrom('question').where('id', '=', id).execute();
  res.status(204).json();
});

questionRouter.get('/:id', authenticated, async (req: JWTRequest, res: Response) => {
  const { id } = req.params;

  const question = await db
    .selectFrom('question')
    .select([
      'id',
      'question',
      'createdAt',
      'updatedAt',
    ])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!question) {
    res.status(404).json({ message: 'Question not found' });
    return;
  }

  const dto: QuestionDTO = question;
  res.status(200).json(dto);
});
