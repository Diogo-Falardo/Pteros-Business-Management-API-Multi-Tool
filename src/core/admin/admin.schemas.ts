import { z } from "zod";
import { permissionSchema } from "./global.schema";

export const admin_CREATE_Permission = permissionSchema.pick({
  permission: true,
});

export type type_admin_CREATE_Permission = z.infer<
  typeof admin_CREATE_Permission
>;
