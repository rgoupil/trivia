import type { Selectable } from 'kysely';
import type { Match, MatchQuestionAnswer, User } from 'kysely-codegen/dist/db';

export interface MatchDTO extends Selectable<Match> {
  users: Selectable<User>[] | null;
  answers: Selectable<MatchQuestionAnswer>[] | null;
  score: Record<string, number>;
}
