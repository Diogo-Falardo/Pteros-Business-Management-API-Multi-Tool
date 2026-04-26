import { db } from "../../db/db.index";
import { permissionsTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { permissionSchema, type_PermissionSchema } from "./admin.schema";
import { catchError } from "../middlewares/error";
import { log } from "../middlewares/logger";
import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../utils/statusCode";

// ptero app dev adminstrator service
export class globalPermissionsService {
  /**
   * This creates a new permission globally.
   * @param permission name: string
   * @returns permission
   */
  async create(permission: string) {
    try {
      const newPermission = await db
        .insert(permissionsTable)
        .values({
          permission,
        })
        .returning();

      log.info(`Created new permission: ${permission}`);

      return newPermission[0];
    } catch (error) {
      catchError({
        error,
        logError: `Error creating permission: ${permission}`,
        exceptionErrorMessage:
          "Ups something went wrong while creating permission!",
      });
    }
  }

  async getListOfPermissions(): Promise<Array<type_PermissionSchema>> {
    try {
      const permissions = await db.select().from(permissionsTable);

      return permissionSchema.array().parse(permissions);
    } catch (error) {
      catchError({
        error,
        logError: "Error listing permissions!",
        exceptionErrorMessage:
          "Ups something went wrong while getting permissions list!",
      });
    }
  }

  async getPermissionByPermissionId(
    permissionId: string,
  ): Promise<type_PermissionSchema> {
    try {
      const permission = await db
        .select()
        .from(permissionsTable)
        .where(eq(permissionsTable.id, permissionId))
        .limit(1);

      if (!permission[0]) {
        log.withMetadata({ permission }).error("Permission not found");
        throw new HTTPException(HttpStatus.NOT_FOUND, {
          message: "Permission not found",
        });
      }

      return permissionSchema.parse(permission[0]);
    } catch (error) {
      catchError({
        error,
        logError: "Error getting permission by permission Id!",
        exceptionErrorMessage:
          "Ups something went wrong while getting permissions list!",
      });
    }
  }

  /**
   * Validate if a permission already exists:
   * - by the permission name check if the permission is already inserted
   * - true means exists
   * - false means can be created or doesnt exist
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
        log.error(`Error permission already exists!`);
        return false;
      }

      return true;
    } catch (error) {
      catchError({
        error,
        logError: `Error validating if permission already exists: ${permission}`,
        exceptionErrorMessage:
          "Ups something went wrong while validating permission!",
      });
    }
  }
}
