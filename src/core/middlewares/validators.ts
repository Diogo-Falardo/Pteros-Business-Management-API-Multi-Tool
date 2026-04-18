import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../utils/statusCode";

import {
  pteroRolesPermissionsService,
  pteroStaffService,
} from "../../modules/pteros/ptero.services";
import { userServer } from "../../modules/users/user.server";

const userService = new userServer();

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

type emailValidator = {
  email: string;
  throwErrorIfExist?: boolean;
  throwErrorIfNotExist?: boolean;
};

/**
 * Validator to validate if email exists or if email doesnt exist
 * Impossible to have bouth options at the same time
 */
export async function validateEmail({
  email,
  throwErrorIfExist = false,
  throwErrorIfNotExist = false,
}: emailValidator) {
  if (throwErrorIfExist && throwErrorIfNotExist) {
    throw new Error(
      "validateEmail: throwErrorIfExist and throwErrorIfNotExist cannot both be true. This is a programmer error.",
    );
  }

  const validateEmail = await userService.validateIfEmailAlreadyExists(email);
  if (throwErrorIfExist && validateEmail) {
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "Email already in use!",
    });
  }
  if (throwErrorIfNotExist && !validateEmail) {
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "Email not found!",
    });
  }
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
    await pteroRolesPermissionsService.validateIfRoleIdHasPermissionId(
      isUserAValidStaffMember.roleId,
      permissionId,
    );

  if (!doesTheRoleHaveThePermission) return false;

  return true;
}
