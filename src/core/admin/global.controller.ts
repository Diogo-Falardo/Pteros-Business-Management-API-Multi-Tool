import { type_admin_CREATE_Permission } from "./admin.schemas";
import { permissionsServer } from "./global.server";

const permissionsService = new permissionsServer();

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
    await permissionsService.validateIfPermissionAlreadyExists(
      permission.permission,
    );

  return await permissionsService.create(permission.permission);
};
