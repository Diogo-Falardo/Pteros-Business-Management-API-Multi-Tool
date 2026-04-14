import { uuid, z } from "zod";

export const pteroSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z
    .string()
    .min(1, { message: "Ptero name is required" })
    .max(255, { message: "Ptero name has a max of 255 characters" }),
});

export const CREATE_PteroSchema = pteroSchema.pick({
  name: true,
});

export type type_CREATE_PteroSchema = z.infer<typeof CREATE_PteroSchema>;
