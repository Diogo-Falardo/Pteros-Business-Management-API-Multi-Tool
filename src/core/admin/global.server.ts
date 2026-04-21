import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../utils/statusCode";
import { db } from "../../db/db.index";
import { permissionsTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { permissionSchema, type_PermissionSchema } from "./global.schema";
import { catchError } from "../middlewares/error";

// ptero app dev adminstrator
export class permissionsServer {
  async create(permission: string) {
    try {
      const newPermission = await db
        .insert(permissionsTable)
        .values({
          permission,
        })
        .returning();

      return permission;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error creating permission:",
        exceptionErrorMessage:
          "Ups something went wrong while creating permission!",
      });
    }
  }

  async list(): Promise<Array<type_PermissionSchema>> {
    try {
      const permissions = await db.select().from(permissionsTable);

      return permissionSchema.array().parse(permissions);
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error listing permissions:",
        exceptionErrorMessage:
          "Ups something went wrong while getting permissions list!",
      });
    }
  }

  /**
   * Validate if a permission already exists:
   * - by the permission name check if the permission is already inserted
   * - true means exists
   * - false means can be created
   *
   * @param permission
   * @returns boolean
   */
  async validateIfPermissionAlreadyExists(permission: string) {
    try {
      const existingPermission = await db
        .select()
        .from(permissionsTable)
        .where(eq(permissionsTable.permission, permission))
        .limit(1);

      if (existingPermission[0]) {
        return false;
      }

      return true;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error validating if permission already exists:",
        exceptionErrorMessage:
          "Ups something went wrong while validating permission!",
      });
    }
  }
}
