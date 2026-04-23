import { z } from "zod";

export const permissionSchema = z.object({
  id: z.uuid(),
  permission: z
    .string()
    .min(1, { message: "Permission is required" })
    .max(255, { message: "limit of 255 characters for permission" }),
});

export type type_PermissionSchema = z.infer<typeof permissionSchema>;

export const admin_CREATE_Permission = permissionSchema.pick({
  permission: true,
});

export type type_admin_CREATE_Permission = z.infer<
  typeof admin_CREATE_Permission
>;
