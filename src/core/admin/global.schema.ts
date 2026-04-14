import { z } from "zod";

export const permissionSchema = z.object({
  id: z.uuid(),
  permission: z
    .string()
    .min(1, { message: "Permission is required" })
    .max(255, { message: "limit of 255 characters for permission" }),
});

export type type_PermissionSchema = z.infer<typeof permissionSchema>;
