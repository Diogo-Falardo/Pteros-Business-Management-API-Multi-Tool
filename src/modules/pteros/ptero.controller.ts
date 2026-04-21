import { HTTPException } from "hono/http-exception";
import { userServer } from "../users/user.server";
import {
  type_CREATE_PteroRolesPermissionsList,
  type_CREATE_PteroSchema,
  type_PATCH_PteroSchema,
  type_pteroStaffUserInfoExtendSchema,
} from "./ptero.schema";
import { HttpStatus } from "../../core/utils/statusCode";
import {
  pteroService,
  pteroRolesService,
  pteroStaffService,
} from "./ptero.services";
import {
  validateIfUserHasRequiredPermissions,
  validatePtero,
} from "../../core/middlewares/validators";
import { v4 } from "uuid";

const userService = new userServer();

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
  return await pteroService.createPtero(userId, ptero.name);
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
  const validateUser = await pteroStaffService.isUserAStaffMember(
    userId,
    pteroId,
  );
  if (!validateUser)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "User not found or user is not a staff member!",
    });
  if (validateUser.role !== "Owner") {
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "Invalid permissions!",
    });
  }

  return await pteroService.deletePtero(pteroId);
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
  const getCurrentPteroInfo = await pteroService.getPteroById(pteroId);
  console.log("getCurrentPteroInfo " + getCurrentPteroInfo);
  if (!getCurrentPteroInfo)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "Ptero was not found!",
    });

  if (patchPteroSchema.userId && userId !== getCurrentPteroInfo.userId) {
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "Only ptero owner can change ownership",
    });
  }

  return await pteroService.updatePtero(pteroId, patchPteroSchema);
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
  return await pteroService.addInviteLink(pteroId, inviteLink);
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
  const pteroId = await pteroService.validateInviteLink(inviteLink);
  if (!pteroId)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "Invite link was not found!",
    });

  // check if the owner is not trying to use the invite link
  const checkIfIsOwner = await pteroService.checkIfIsOwner(userId, pteroId);
  if (checkIfIsOwner)
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "You cant join your own server!",
    });

  // check if there is already a view role
  // this if first try to get View Role Id from that ptero
  const roleId = await pteroRolesService.getRoleIdFromRoleName(
    pteroId,
    "Viewer",
  );

  if (!roleId) {
    const newRoleId = await pteroRolesService.createRoleViewer(pteroId);
    await pteroStaffService.addRoleToUserId(userId, pteroId, newRoleId);
  } else {
    // check if user is not already part of that ptero
    const validateIfUserIsInPtero = await pteroStaffService.isUserAStaffMember(
      userId,
      pteroId,
    );

    if (validateIfUserIsInPtero) {
      console.log(validateIfUserIsInPtero);
      throw new HTTPException(HttpStatus.FORBIDDEN, {
        message: "You are already part of this ptero!",
      });
    }

    await pteroStaffService.addRoleToUserId(userId, pteroId, roleId);
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

  const pterosList = await pteroService.listPterosAssociatedToAnUser(userId);
  if (!pterosList) {
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
    await pteroStaffService.getTheListOfStaffUserIdsFromAPteroId(pteroId);

  let staffList: Array<type_pteroStaffUserInfoExtendSchema> = [];

  // fetch every staff role
  await Promise.all(
    staffMemberList.map(async (s) => {
      const role = await pteroRolesService.getRoleByRoleId(pteroId, s.roleId);
      const userInfo = await userService.getUserByUserId(s.userId);
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
  //   {
  //   "id": "eb344a89-e9a1-474c-b242-a414855719c0",
  //   "permission": "Create New Role"
  // }
  await validatePtero({
    userId,
    pteroId,
    checkUserExists: true,
    checkPteroExists: true,
    checkUserIsStaff: true,
    checkUserHasPermission: "eb344a89-e9a1-474c-b242-a414855719c0",
  });

  await pteroRolesService.createRole(pteroId, role);
};

// add a list of permissions to a role
export const addPermissionsToPteroRole = async (
  userId: string,
  pteroId: string,
  roleId: string,
  listPermissions: Array<type_CREATE_PteroRolesPermissionsList>,
) => {
  await validatePtero({});
};
