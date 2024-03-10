import { z } from 'zod';

export const LoginInputDTO = z.object({
  body: z.object({
    username: z.string().min(3).max(255),
    password: z.string().min(8).max(255),
  }),
});

export type LoginInputDTO = z.infer<typeof LoginInputDTO>;
