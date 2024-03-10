import { z } from 'zod';

export const CreateQuestionInputDTO = z.object({
  body: z.object({
    question: z.string().min(3).max(255),
    answer: z.string().min(3).max(255),
  }),
});

export type CreateQuestionInputDTO = z.infer<typeof CreateQuestionInputDTO>;
