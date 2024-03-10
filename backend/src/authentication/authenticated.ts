import type { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';

export type JWTRequest = Request & { auth?: { userId: string } };

export const authenticated = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).send({ message: 'Unauthorized' });
    return;
  }

  const user = verifyJWT(token);
  if (!user || typeof user !== 'object' || !('sub' in user) || typeof user.sub !== 'string' || !user.sub) {
    res.status(401).send({ message: 'Unauthorized' });
    return;
  }

  (req as JWTRequest).auth = { userId: user.sub };

  next();
};

export const verifyJWT = (token: string) => {
  try {
    return verify(token, process.env.AUTH_SECRET!, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
};
