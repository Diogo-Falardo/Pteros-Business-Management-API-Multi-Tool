import { z } from "zod";

export const admin_CREATE_Permission = z.object({
  permission: z
    .string()
    .min(1, { message: "Permission is required" })
    .max(255, { message: "limit of 255 characters for permission" }),
});

export type type_admin_CREATE_Permission = z.infer<
  typeof admin_CREATE_Permission
>;
