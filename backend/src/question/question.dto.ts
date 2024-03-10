import type { Selectable } from 'kysely';
import type { Question } from 'kysely-codegen/dist/db';

export interface QuestionDTO extends Omit<Selectable<Question>, 'answer'> {
}
