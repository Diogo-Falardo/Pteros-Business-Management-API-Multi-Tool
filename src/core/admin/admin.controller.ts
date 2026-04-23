import { HTTPException } from "hono/http-exception";
import { type_admin_CREATE_Permission } from "./admin.schema";
import { use_GlobalPermissionsService } from "./admin.services";
import { HttpStatus } from "../utils/statusCode";

/**
 * Validate if there is already a permission with that name:
 * - check to see if person has admin atribute **(not yet implemented)**
 * - create permission
 *
 * @param permission
 * @returns
 */
export const adminCreatePermission = async (
  permission: type_admin_CREATE_Permission,
) => {
  const validatePermissionName =
    await use_GlobalPermissionsService.validateIfPermissionAlreadyExists(
      permission.permission,
    );

  if (!validatePermissionName) {
    throw new HTTPException(HttpStatus.CONFLICT, {
      message: "Permission already inserted!",
    });
  }

  return await use_GlobalPermissionsService.create(permission.permission);
};
