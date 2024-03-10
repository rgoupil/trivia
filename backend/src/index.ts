import 'dotenv/config';
import express, { Express, type NextFunction, type Request, type Response } from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import cors from 'cors';
import SocketIO from 'socket.io';
import { db } from './database';
import { authenticationRouter } from './authentication/authentication.router';
import { matchmakingRouter } from './matchmaking/matchmaking.router';
import { worker } from './worker';
import { MAX_USERS_PER_MATCH } from './constants';
import { matchRouter } from './match/match.router';
import { questionRouter } from './question/question.router';
import { verifyJWT } from './authentication/authenticated';

const corsSettings = {
  origin: new URL(process.env.FRONTEND_URL!).origin,
  methods: ['GET', 'POST'],
  credentials: true,
};
const port = process.env.PORT || 3000;
const app: Express = express();
const server = http.createServer(app);
const io = new SocketIO.Server(server, {
  cors: {
    origin: corsSettings.origin,
    methods: corsSettings.methods,
    credentials: corsSettings.credentials,
  },
});

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({
  origin: corsSettings.origin,
  methods: corsSettings.methods,
  credentials: corsSettings.credentials,
}))
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
});
app.use('/auth', authenticationRouter);
app.use('/matchmaking', matchmakingRouter);
app.use('/match', matchRouter);
app.use('/question', questionRouter);

io.use((socket, next) => {
  const user = verifyJWT(socket.handshake.auth.token);

  if (!user) {
    next(new Error('Unauthorized'));
    return;
  }

  socket.data.userId = user.sub;
  next();
});

io.on('connection', (socket) => {
  if (!socket.data.userId) {
    socket.disconnect();
    return;
  }
  const userId = socket.data.userId;
  console.log(`user connected: ${userId}`);

  socket.on('disconnect', async () => {
    console.log(`user disconnected: ${userId}`);

    // remove user from matchmaking queue
    await db.deleteFrom('matchmakingQueue').where('userId', '=', userId).execute();

    // find all matches being played by the user
    const matchUsers = await db
      .selectFrom('matchUser')
      .innerJoin('match', 'matchUser.matchId', 'match.id')
      .select('matchId')
      .where('matchUser.userId', '=', userId)
      .where('match.isEnded', 'is', false)
      .execute();

    for (const matchUser of matchUsers) {
      const matchId = matchUser.matchId;

      const usersInMatch = await db.selectFrom('matchUser').select('userId').where('matchId', '=', matchId).execute();

      const otherUser = usersInMatch.find(u => u.userId !== userId);
      if (otherUser) {
        await db.updateTable('match').set({ isEnded: true, winnerId: otherUser.userId }).where('id', '=', matchId).execute();

        io.in(matchId.toString()).emit('match-ended', { winner: otherUser.userId });
      }
    }
  });

  socket.on('answer-question', async (matchId: string, answer: string, next: (isCorrect: boolean | null) => any) => {
    const question = await db
      .selectFrom('matchQuestion')
      .innerJoin('question', 'matchQuestion.questionId', 'question.id')
      .selectAll('question')
      .where('matchQuestion.matchId', '=', matchId)
      .where('matchQuestion.isAnswered', '=', false)
      .orderBy('matchQuestion.order', 'asc')
      .executeTakeFirstOrThrow();

    const hasAnswered = await db
      .selectFrom('matchQuestionAnswer')
      .select('id')
      .where('matchId', '=', matchId)
      .where('questionId', '=', question.id)
      .where('userId', '=', userId)
      .executeTakeFirst();

    // user can only answer once
    if (hasAnswered) {
      return next(null);
    }

    // store user's answer
    const isCorrect = String(question.answer).trim() === String(answer).trim();
    await db
      .insertInto('matchQuestionAnswer')
      .values({ matchId, questionId: question.id, userId, answer, isCorrect })
      .execute();
    next(isCorrect);

    if (isCorrect) {
      io.in(matchId).emit('correct-answer', userId);
    }

    // trigger next question when all users have answered or if the answer was correct
    let moveToNextQuestion = isCorrect;
    if (!moveToNextQuestion) {
      const { count: answersCount } = await db
        .selectFrom('matchQuestionAnswer')
        .select(eb => eb.fn.count('id').as('count'))
        .where('matchId', '=', matchId)
        .where('questionId', '=', question.id)
        .executeTakeFirstOrThrow();

      moveToNextQuestion = Number(answersCount) >= MAX_USERS_PER_MATCH;
    }

    if (!moveToNextQuestion) {
      return;
    }

    const answeredQuestionsPerUser = await db
      .selectFrom('matchUser')
      .leftJoin('matchQuestionAnswer', eb =>
        eb
          .onRef('matchUser.userId', '=', 'matchQuestionAnswer.userId')
          .on('matchQuestionAnswer.isCorrect', '=', true)
          .on('matchQuestionAnswer.matchId', '=', matchId)
      )
      .select([
        'matchUser.userId',
        eb => eb.fn.count('matchQuestionAnswer.id').as('count'),
      ])
      .where('matchUser.matchId', '=', matchId)
      .groupBy('matchUser.userId')
      .execute()

    const score = answeredQuestionsPerUser.reduce((acc, curr) => ({ ...acc, [curr.userId]: Number(curr.count) }), {});
    io.in(matchId).emit('score-update', score);

    await db
      .updateTable('matchQuestion')
      .set('isAnswered', true)
      .where('matchId', '=', matchId)
      .where('questionId', '=', question.id)
      .execute();

    const foundNextQuestion = await emitEventNextQuestion(matchId);
    if (!foundNextQuestion) {
      // count points scored by each user
      const usersAnswers = await db
        .selectFrom('matchQuestionAnswer')
        .select([
          'userId',
          eb => eb.fn.count('id').as('count'),
        ])
        .where('matchId', '=', matchId)
        .where('isCorrect', '=', true)
        .groupBy('userId')
        .execute()

      // find the user with the most points
      const isDraw = !usersAnswers.length || (usersAnswers.length > 1 && usersAnswers.every(u => u.count === usersAnswers[0].count));
      console.log('isDraw', isDraw, usersAnswers);
      if (isDraw) {
        await db.updateTable('match').set({ isEnded: true }).where('id', '=', matchId).execute();
        io.in(matchId).emit('match-ended', { winner: null });
        return;
      }
      const winner = usersAnswers.reduce((acc, curr) => curr.count > acc.count ? curr : acc);
      await db.updateTable('match').set({ isEnded: true, winnerId: winner.userId }).where('id', '=', matchId).execute();

      io.in(matchId).emit('match-ended', { winner: winner.userId });
    }
  });
});

server.listen(port, async () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);

  return () => {
    db.destroy();
  };
});

worker.run(async ({
  match,
  users,
}) => {
  const allSockets = await io.fetchSockets();
  const sockets = allSockets.filter(s => users.some(u => u.username === s.data.userId));
  const matchRoomId = match.id.toString();

  io.in(sockets.map(s => s.id)).socketsJoin(matchRoomId);

  io.in(matchRoomId).emit('match-created', match.id);
  io.in(matchRoomId).emit('score-update', users.reduce((acc, curr) => ({ ...acc, [curr.username]: 0 }), {}));

  await emitEventNextQuestion(match.id);
});

const emitEventNextQuestion = async (matchId: string) => {
  const nextPendingQuestion = await db
    .selectFrom('matchQuestion')
    .selectAll()
    .where('matchId', '=', matchId)
    .where('isAnswered', '=', false)
    .orderBy('order', 'asc')
    .limit(1)
    .executeTakeFirst();

  if (nextPendingQuestion) {
    io.in(matchId.toString()).emit('next-question', nextPendingQuestion.questionId, nextPendingQuestion.order + 1);
  }
  return Boolean(nextPendingQuestion);
};
