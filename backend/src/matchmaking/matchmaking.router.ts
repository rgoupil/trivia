import { Router, type Response } from 'express';
import { db } from '../database';
import { authenticated, type JWTRequest } from '../authentication/authenticated';

export const matchmakingRouter = Router();

matchmakingRouter.post('/join', authenticated, async (req: JWTRequest, res: Response) => {
  try {
    await db.insertInto('matchmakingQueue').values({ userId: req.auth!.userId }).execute();
  } catch {
    return res.status(400).json({ message: 'Already in queue' });
  }

  res.status(200).json({ message: 'Joined queue' });
});

matchmakingRouter.post('/leave', authenticated, async (req: JWTRequest, res: Response) => {
  try {
    await db.deleteFrom('matchmakingQueue').where('userId', '=', req.auth!.userId).where('markedAt', 'is', null).execute();
  } catch {
    return res.status(400).json({ message: 'Not in queue' });
  }

  res.status(200).json({ message: 'Left queue' });
});
