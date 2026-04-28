import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../../core/utils/statusCode";
import {
  use_PteroService,
  use_PteroRolesService,
  use_PteroStaffService,
  use_PteroRolesPermissionsService,
} from "./ptero.services";
import { validatePtero } from "../../core/middlewares/validators";
import { v4 } from "uuid";
import { use_UserService } from "../users/user.services";
import { log } from "../../core/middlewares/logger";
import {
  type_CREATE_PteroRolesPermissionsList,
  type_CREATE_PteroSchema,
  type_PATCH_PteroSchema,
  type_PteroRolesExtendedSchema,
  type_PteroStaffMembersIdSchema,
  type_PteroStaffMembersInfoSchema,
} from "./ptero.schema";
import { use_GlobalPermissionsService } from "../../core/admin/admin.services";
import { globalPermissionsService } from "../../core/admin/admin.service";

/**
 * Create a new ptero
 * @param userId
 * @param ptero
 * @returns
 */
export const createPtero = async (
  userId: string,
  ptero: type_CREATE_PteroSchema,
) => {
  await validatePtero({
    userId,
    checkUserExists: true,
  });

  // this creates and sets ptero owner
  return await use_PteroService.createPtero(userId, ptero.name);
};

/**
 * Delete a ptero:
 * - Only the owner can delete it
 * @param userId
 * @param pteroId
 * @returns
 */
export const deletePtero = async (userId: string, pteroId: string) => {
  await validatePtero({
    pteroId,
    checkPteroExists: true,
  });

  // this valdiation is still required because valdiate ptero has not this options
  const validateUser = await use_PteroStaffService.isUserAStaffMember(
    userId,
    pteroId,
  );
  if (!validateUser) {
    log.error(
      `Requested user ${JSON.stringify({ userId })} is not a staff member from ptero: ${JSON.stringify({ pteroId })}`,
    );
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "User not found or user is not a staff member!",
    });
  }
  if (validateUser.role !== "Owner") {
    log.error(
      `Requested user ${JSON.stringify({ userId })} is not the owner of this ptero: ${JSON.stringify({ pteroId })}`,
    );
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "Invalid permissions!",
    });
  }

  return await use_PteroService.deletePtero(pteroId);
};

/**
 * Updates a ptero schema:
 * - Staff that is going to update ptero has to have the required permission for it
 * - To change the ptero owner it needs to be the current ptero owner for it
 *
 * @param userId -> This user id is from who is sending the update
 * @param patchPteroSchema
 */
export const updatePtero = async (
  userId: string,
  pteroId: string,
  patchPteroSchema: type_PATCH_PteroSchema,
) => {
  // permission is
  //   {
  //   "id": "414c142c-76fd-46fd-ba88-8bb2eae01adc",
  //   "permission": "Update Ptero Info"
  // }
  await validatePtero({
    userId,
    pteroId,
    checkUserExists: true,
    checkPteroExists: true,
    checkUserIsStaff: true,
    checkUserHasPermission: "414c142c-76fd-46fd-ba88-8bb2eae01adc",
  });

  // check if userId that cames on patch is diferent from the owners ptero id
  const getCurrentPteroInfo = await use_PteroService.getPteroById(pteroId);

  log.info(
    `Getting current ptero info: ${JSON.stringify({ getCurrentPteroInfo })} to check if the userId that camed: ${patchPteroSchema.userId} to be patched is the owner id`,
  );

  if (!getCurrentPteroInfo) {
    log.error(`The current ptero was not found!`);
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "Ptero was not found!",
    });
  }

  if (patchPteroSchema.userId && userId !== getCurrentPteroInfo.userId) {
    log.error(
      `User cannot change the ownership of ptero because its not the owner of it`,
    );
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "Only ptero owner can change ownership",
    });
  }

  return await use_PteroService.updatePtero(pteroId, patchPteroSchema);
};

// generate an invite link for now in dev state is just simple as generating an UUID unique
// add that to the ptero table
/**
 * Generate an invite link **(for now in dev state simple generate an UUID unique)**
 * - Adds the invite link to the ptero table
 * - **Pending validations look inside function**
 *
 * @param pteroId
 * @returns
 */
export const generateInviteLink = async (pteroId: string) => {
  const inviteLink = v4();

  // CAREFULL
  // we are passing the invite link without validating if does not colide with any existing one
  // the chances are really low but it can happen so -> just dont be lazy as me now and add it
  return await use_PteroService.addInviteLink(pteroId, inviteLink);
};

/**
 * Simple because we still on dev mode:
 * - Create a new role if not exists already ***viewer*** and add user to that role
 * - has no permissions
 *
 * @param userId
 * @param inviteLink
 */
export const useInviteLink = async (userId: string, inviteLink: string) => {
  const pteroId = await use_PteroService.validateInviteLink(inviteLink);
  if (!pteroId) {
    log.error(`Invite link was not found: ${inviteLink}`);
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "Invite link was not found!",
    });
  }

  // check if the owner is not trying to use the invite link
  const checkIfIsOwner = await use_PteroService.checkIfIsPteroOwner(
    userId,
    pteroId,
  );
  if (checkIfIsOwner) {
    log.error(`Owner cannot join its own ptero!`);
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "You cant join your own ptero!",
    });
  }

  // check if there is already a view role
  // this if first try to get View Role Id from that ptero
  console.log(`Looking for role viewer`);
  const roleId = await use_PteroRolesService.getRoleIdFromRoleName(
    pteroId,
    "Viewer",
  );

  if (!roleId) {
    console.log(`Role viewer was not found creating a viewer role`);
    const newRoleId = await use_PteroRolesService.createRoleViewer(pteroId);
    await use_PteroStaffService.addRoleToUserId(userId, pteroId, newRoleId);
  } else {
    // check if user is not already part of that ptero
    const validateIfUserIsInPtero =
      await use_PteroStaffService.isUserAStaffMember(userId, pteroId);

    if (validateIfUserIsInPtero) {
      log.info(`user: ${userId} is already part of the ptero`);
      throw new HTTPException(HttpStatus.FORBIDDEN, {
        message: "You are already part of this ptero!",
      });
    }

    await use_PteroStaffService.addRoleToUserId(userId, pteroId, roleId);
  }
};

/**
 * @param userId
 * @returns list of pteros from an user
 */
export const pteroListFromAnUser = async (userId: string) => {
  await validatePtero({
    userId,
    checkUserExists: true,
  });

  const pterosList =
    await use_PteroService.listPterosAssociatedToAnUser(userId);
  if (!pterosList) {
    log.error(`No pteros was found associated to user: ${userId}`);
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "No pteros found associated to you",
    });
  }

  return pterosList;
};

/**
 * Get all the staff members from an ptero and their corresponding roles:
 * - For each ptero staff get the corresponding user
 * - **THIS NEEDS A BETTER REVIEW BECAUSE OF NOT HAVING ANY SORT OF SECURITY**
 * @param pteroId
 * @returns
 */
export const pteroStaffListMembers = async (pteroId: string) => {
  await validatePtero({
    pteroId,
    checkPteroExists: true,
  });

  const staffMemberList =
    await use_PteroStaffService.getTheListOfStaffUserIdsFromAPteroId(pteroId);

  let staffList: Array<type_PteroStaffMembersInfoSchema> = [];

  // fetch every staff role
  await Promise.all(
    staffMemberList.map(async (s) => {
      const role = await use_PteroRolesService.getRoleByRoleId(
        pteroId,
        s.roleId,
      );
      const userInfo = await use_UserService.getUserByUserId(s.userId);
      if (!role || !userInfo) return;
      staffList.push({
        userId: s.userId,
        roleId: s.roleId,
        role: role.role,
        email: userInfo.email,
        hierarchy: role.hierarchy,
      });
    }),
  );

  return staffList;
};

export const validateIfUserCanAccessPtero = async (
  userId: string,
  pteroId: string,
) => {
  await validatePtero({
    userId,
    pteroId,
    checkUserExists: true,
    checkPteroExists: true,
    checkUserIsStaff: true,
  });

  return true;
};

/**
 * Creates a new Role for that ptero:
 * - Hiearchy is set to two and updates all the others to +1
 *
 * @param userId
 * @param pteroId
 * @param role
 */
export const createNewPteroRole = async (
  userId: string,
  pteroId: string,
  role: string,
) => {
  // permission is
  //   "id": "eb344a89-e9a1-474c-b242-a414855719c0",
  //   "permission": "Create New Role"  //   {
  // }
  await validatePtero({
    userId,
    pteroId,
    checkUserExists: true,
    checkPteroExists: true,
    checkUserIsStaff: true,
    checkUserHasPermission: "eb344a89-e9a1-474c-b242-a414855719c0",
  });

  await use_PteroRolesService.createRole(pteroId, role);
};

/**
 * Adds or Removes Permission from a list of permission to a ptero role.
 *
 * @param userId
 * @param pteroId
 * @param roleId
 * @param listPermissions
 */
export const addPermissionsToPteroRole = async (
  userId: string,
  pteroId: string,
  roleId: string,
  listPermissions: Array<type_CREATE_PteroRolesPermissionsList>,
) => {
  //   {
  //   "id": "2286190c-15f5-48ea-b3f6-414df1ab4ff4",
  //   "permission": "Update Roles Permissions"
  // }
  await validatePtero({
    userId,
    pteroId,
    checkUserExists: true,
    checkPteroExists: true,
    checkUserIsStaff: true,
    checkUserHasPermission: "2286190c-15f5-48ea-b3f6-414df1ab4ff4",
  });

  await use_PteroRolesPermissionsService.setListOfPermissionsToRole(
    roleId,
    listPermissions,
  );
};

/**
 * Adds a ptero staff member to a specific role
 *
 *
 * @param userId user that makes the request
 * @param pteroId
 * @param staff user that is going to became a "staff member" and its role role
 */
export const addPteroStaffToRole = async (
  userId: string,
  pteroId: string,
  staff: type_PteroStaffMembersIdSchema,
) => {
  //   {
  //   "id": "8005995a-7cc0-4afc-b531-c48ff97d6bbb",
  //   "permission": "Add Ptero Staff Members"
  // },
  await validatePtero({
    userId,
    pteroId,
    checkUserExists: true,
    checkPteroExists: true,
    checkUserIsStaff: true,
    checkUserHasPermission: "8005995a-7cc0-4afc-b531-c48ff97d6bbb",
  });

  // validate if the user that is going to be inserted as new staff member is already in staff
  const validateIfUserIsInStaff =
    await use_PteroStaffService.isUserAStaffMember(staff.userId, pteroId);
  if (!validateIfUserIsInStaff) {
    log
      .withMetadata({ validateIfUserIsInStaff })
      .error("user is not a staff member");
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "User is not in you staff list!",
    });
  }

  await use_PteroStaffService.updateRoleToUserId(
    staff.userId,
    pteroId,
    staff.roleId,
  );

  return "Staff member list updated!";
};

/**
 * Gets the role list from an pteroId
 *
 * @param userId
 * @param pteroId
 * @returns
 */
export const getPteroRolesList = async (userId: string, pteroId: string) => {
  await validatePtero({
    userId,
    pteroId,
    checkUserExists: true,
    checkPteroExists: true,
    checkUserIsStaff: true,
  });

  return await use_PteroRolesService.getAllRolesFromPteroId(pteroId);
};

// /**
//  * Gets all the permissions that are atribuitted to a role:
//  * - return an empty array if the is no permissions set to it
//  * @param userId
//  * @param pteroId
//  * @param roleId
//  * @returns [] or list of permissions
//  */
export const getPteroRolePermissionList = async (
  userId: string,
  pteroId: string,
  roleId: string,
) => {
  // required permission
  // 2286190c-15f5-48ea-b3f6-414df1ab4ff4
  // "permission": "Update Roles Permissions"

  await validatePtero({
    userId,
    pteroId,
    checkUserExists: true,
    checkPteroExists: true,
    checkUserIsStaff: true,
    checkUserHasPermission: "2286190c-15f5-48ea-b3f6-414df1ab4ff4",
  });

  const globalPermissionList =
    await use_GlobalPermissionsService.getListOfPermissions();

  const listOfPermissionsRoles =
    await use_PteroRolesPermissionsService.checkIfRoleHasPermissions(roleId);

  if (!listOfPermissionsRoles) {
    log.withMetadata({ roleId }).info("role has no permissions");
    return globalPermissionList.map((p) => {
      return {
        id: p.id,
        permission: p.permission,
        active: false,
      };
    });
  } else {
    // combine list of permission of each role role with
    // the name of the permission
    // and all the available permissions

    const listOfPermissionFromARole = await Promise.all(
      listOfPermissionsRoles.map(async (permission) => {
        const permissionNameArr =
          await use_GlobalPermissionsService.getPermissionByPermissionId(
            permission.permissionId,
          );
        const permissionName = Array.isArray(permissionNameArr)
          ? permissionNameArr[0]
          : permissionNameArr;
        if (!permissionName) return null;
        log
          .withMetadata({ permissionNameArr, permissionName })
          .info("permission inside of list of permission roles");
        return {
          id: permission.permissionId,
          permission: permissionName.permission,
        };
      }),
    );

    const selectedPermissionIds = new Set(
      listOfPermissionFromARole
        .filter((p): p is { id: string; permission: string } => p !== null)
        .map((p) => p.id),
    );

    const PermissionList = globalPermissionList
      .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
      .map((p) => ({
        id: p.id,
        permission: p.permission,
        active: selectedPermissionIds.has(p.id),
      }));

    log.withMetadata({ PermissionList }).info("permissions list");
    return PermissionList;
  }
};
