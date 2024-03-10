import { Router, type Request, type Response } from 'express';
import { validate } from '../validate';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { LoginInputDTO } from './login-input.dto';
import { db } from '../database';

export const authenticationRouter = Router();

authenticationRouter.post('/login', validate(LoginInputDTO), async (req: Request, res: Response) => {
  const { body: { username, password } } = req as LoginInputDTO;

  try {
    const user = await db.selectFrom('user').selectAll().where('username', '=', username).executeTakeFirstOrThrow();
    const passwordIsValid = await argon2.verify(user.password, password);
    if (!passwordIsValid) {
      throw new Error('Invalid password');
    }
    const token = await jwt.sign({ sub: user.username }, process.env.AUTH_SECRET!, { algorithm: 'HS256', expiresIn: '1h' });

    res.status(200).send({
      user: {
        username: user.username,
      },
      token,
    });
    return;
  } catch {
    res.status(401).send({ message: 'Invalid username or password' });
  }
});
