import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../utils/statusCode";
import {
  pterosRolesPermissionsServer,
  pteroStaffServer,
} from "../../modules/pteros/ptero.server";
import { fa } from "zod/v4/locales";

const pteroStaffService = new pteroStaffServer();
const pterosRolesPermissionsService = new pterosRolesPermissionsServer();

// generic uuid validation
export function validateUUID(uuid: string) {
  const parsed = z.uuid().safeParse(uuid);

  if (!parsed.success) {
    throw new HTTPException(HttpStatus.BAD_REQUEST, {
      message: "Invalid UUID",
    });
  }

  return uuid;
}

// validate if an user has the required permissions
// check if user its a valid staff member
// if its staff member collect its role
// if that role has the required permission
export async function validateIfUserHasRequiredPermissions(
  userId: string,
  pteroId: string,
  permissionId: string,
): Promise<boolean> {
  const isUserAValidStaffMember = await pteroStaffService.isUserAStaffMember(
    userId,
    pteroId,
  );
  if (!isUserAValidStaffMember) return false;

  const doesTheRoleHaveThePermission =
    await pterosRolesPermissionsService.validateIfRoleIdHasPermissionId(
      isUserAValidStaffMember.roleId,
      permissionId,
    );

  if (!doesTheRoleHaveThePermission) return false;

  return true;
}
