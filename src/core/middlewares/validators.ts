import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../utils/statusCode";
import {
  use_PteroRolesPermissionsService,
  use_PteroService,
  use_PteroStaffService,
} from "../../modules/pteros/ptero.services";
import { use_UserService } from "../../modules/users/user.services";
import { log } from "./logger";

/**
 * Generic uuid validator
 * @param uuid
 * @returns uuid
 */
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
 * - **Impossible to have bouth options at the same time!**
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

  const validateEmail =
    await use_UserService.validateIfEmailAlreadyExists(email);
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

type pteroValidatorOptions = {
  userId?: string;
  pteroId?: string;
  checkUserExists?: boolean;
  checkPteroExists?: boolean;
  checkUserIsStaff?: boolean;
  checkUserHasPermission?: string; // uuid permission id
};

/**
 * Ptero Validator with diferent options:
 * - Validate if user exist
 * - Validate if ptero exist
 * - Validate if user is a staff member
 * - validate if user has permission
 *
 * @param options
 */
export async function validatePtero(options: pteroValidatorOptions) {
  log.info(`now validating ptero`);
  if (!options.userId && !options.pteroId) {
    throw Error(
      "pteroValidator: Hey developer you need at least an userId or a pteroId to use this validator",
    );
  }

  if (options.checkUserExists && options.userId) {
    log.info(`validating if user exists`);
    const validateUserId = await use_UserService.getUserByUserId(
      options.userId,
    );
    if (!validateUserId) {
      log.error(`user not found`);
      throw new HTTPException(HttpStatus.NOT_FOUND, {
        message: "User not found!",
      });
    }
  }

  if (options.checkPteroExists && options.pteroId) {
    log.info(`validating if ptero exists`);
    const validatePteroId = await use_PteroService.getPteroById(
      options.pteroId,
    );
    if (!validatePteroId) {
      log.error(`ptero not found`);
      throw new HTTPException(HttpStatus.NOT_FOUND, {
        message: "Ptero not found!",
      });
    }
  }

  if (options.checkUserIsStaff && options.pteroId && options.userId) {
    log.info(`validating if user is staff member`);
    const validateIfUserIsStaff =
      await use_PteroStaffService.isUserAStaffMember(
        options.userId,
        options.pteroId,
      );
    if (!validateIfUserIsStaff) {
      log.error(`user is not a staff member`);
      throw new HTTPException(HttpStatus.FORBIDDEN, {
        message: "Only staff members have access to this!",
      });
    }
  }

  if (options.checkUserHasPermission && options.userId && options.pteroId) {
    log.info(`validating if user is staff member has permissions`);
    const doesUserHasPermissions = await validateIfUserHasRequiredPermissions(
      options.userId,
      options.pteroId,
      options.checkUserHasPermission,
    );
    if (!doesUserHasPermissions) {
      log.error(`doesnt have the required permissions`);
      throw new HTTPException(HttpStatus.FORBIDDEN, {
        message:
          "Error user is not a staff member or doesnt have the required permissions",
      });
    }
  }
}

/**
 * Validates if an user has the required permissions by:
 * 1. validate if its a staff member
 * 2. collect its role
 * 3. check if that role has the required permission
 *
 * @param userId
 * @param pteroId
 * @param permissionId
 * @returns boolean
 */
export async function validateIfUserHasRequiredPermissions(
  userId: string,
  pteroId: string,
  permissionId: string,
): Promise<boolean> {
  const isUserAValidStaffMember =
    await use_PteroStaffService.isUserAStaffMember(userId, pteroId);
  if (!isUserAValidStaffMember) return false;

  const doesTheRoleHaveThePermission =
    await use_PteroRolesPermissionsService.validateIfRoleIdHasPermissionId(
      isUserAValidStaffMember.roleId,
      permissionId,
    );

  if (!doesTheRoleHaveThePermission) return false;

  return true;
}
