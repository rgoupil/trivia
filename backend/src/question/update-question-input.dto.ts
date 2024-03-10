import { z } from 'zod';

export const UpdateQuestionInputDTO = z.object({
  body: z.object({
    question: z.string().min(3).max(255).optional(),
    answer: z.string().min(3).max(255).optional(),
  }),
});

export type UpdateQuestionInputDTO = z.infer<typeof UpdateQuestionInputDTO>;
