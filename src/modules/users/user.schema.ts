import { z } from "zod";

export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  password: z
    .string()
    .min(6)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@!%*?&]).{6,}$/),
});
export type type_UserSchema = z.infer<typeof UserSchema>;

export const CREATE_UserSchema = UserSchema.pick({
  email: true,
  password: true,
});

export type type_CREATE_UserSchema = z.infer<typeof CREATE_UserSchema>;
