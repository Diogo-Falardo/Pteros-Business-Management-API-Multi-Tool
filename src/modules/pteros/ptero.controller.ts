import { HTTPException } from "hono/http-exception";
import { userServer } from "../users/user.server";
import {
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
import { validateIfUserHasRequiredPermissions } from "../../core/middlewares/validators";
import { v4 } from "uuid";
import { check } from "drizzle-orm/gel-core";

const userService = new userServer();

// validate if user exists
// create an ptero associated to that user
// make that user ptero Owner
export const createPtero = async (
  userId: string,
  ptero: type_CREATE_PteroSchema,
) => {
  const validateUser = await userService.getUserByUserId(userId);
  if (!validateUser)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "User not found!",
    });

  // this creates and sets ptero owner
  return await pteroService.createPtero(userId, ptero.name);
};

// validate if user who is requesting the delete is a Valid Owner from Ptero Staff
// delete ptero
export const deletePtero = async (userId: string, pteroId: string) => {
  const validateIfPteroExist = await pteroService.getPteroById(pteroId);
  if (!validateIfPteroExist) {
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "Ptero was not found",
    });
  }

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

// update a ptero
// staff that is going to update the ptero needs to have the required permission for that role
// to change the owner of the ptero it needs to be the current owner to do it
/**
 * Updates a ptero schema
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
  const checkIfUserHasPermission = await validateIfUserHasRequiredPermissions(
    userId,
    pteroId,
    "414c142c-76fd-46fd-ba88-8bb2eae01adc",
  );

  if (!checkIfUserHasPermission)
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message:
        "Error user is not a staff member or doesnt have the required permissions",
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
export const generateInviteLink = async (pteroId: string) => {
  const inviteLink = v4();

  // CAREFULL
  // we are passing the invite link without validating if does not colide with any existing one
  // the chances are really low but it can happen so -> just dont be lazy as me now and add it
  return await pteroService.addInviteLink(pteroId, inviteLink);
};

// again as we on dev mode still this will be simple as
// we create a new role if not exists already and add user to that role
// user will have "viewer" -> role another role that cannot be deleted
// and has no permissions the role
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

// before getting the list
// validate if the user exists
export const pteroListFromAnUser = async (userId: string) => {
  const validateIfUserExists = await userService.getUserByUserId(userId);
  if (!validateIfUserExists)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "User not found!",
    });

  const pterosList = await pteroService.listPterosAssociatedToAnUser(userId);
  if (!pterosList) {
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "No pteros found associated to you",
    });
  }

  return pterosList;
};

// get all the staff member from a ptero and their corresponding roles and permissions
// get all ptero staff and roles
// for each ptero staff get the user
export const pteroStaffListMembers = async (pteroId: string) => {
  const validateIfPteroExists = await pteroService.getPteroById(pteroId);
  if (!validateIfPteroExists)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "Ptero was not found",
    });

  const staffMemberList =
    await pteroStaffService.getTheListOfStaffUserIdsFromAPteroId(pteroId);

  let staffList: Array<type_pteroStaffUserInfoExtendSchema> = [];

  // fetch every staff role
  await Promise.all(
    staffMemberList.map(async (s) => {
      const roleName = await pteroRolesService.getRoleName(pteroId, s.roleId);
      if (!roleName) return;
      staffList.push({
        userId: s.userId,
        roleId: s.roleId,
        role: roleName,
      });
    }),
  );

  console.log(staffList);

  return staffList;
};

export const validateIfUserCanAccessPtero = async (
  userId: string,
  pteroId: string,
) => {
  const validateIfUserExists = await userService.getUserByUserId(userId);
  if (!validateIfUserExists)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "User not found",
    });

  const validateIfPteroExists = await pteroService.getPteroById(pteroId);
  if (!validateIfPteroExists)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "Ptero not found!",
    });

  const checkIfUserIsPartOfTheStaff =
    await pteroStaffService.isUserAStaffMember(userId, pteroId);
  if (!checkIfUserIsPartOfTheStaff)
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "Access denied! User is not a staff member!",
    });

  return true;
};
