import { HTTPException } from "hono/http-exception";
import { userServer } from "../users/user.server";
import {
  type_CREATE_PteroSchema,
  type_PATCH_PteroSchema,
} from "./ptero.schema";
import { HttpStatus } from "../../core/utils/statusCode";
import {
  pteroServer,
  pterosRolesServer,
  pteroStaffServer,
} from "./ptero.server";
import { validateIfUserHasRequiredPermissions } from "../../core/middlewares/validators";

const userService = new userServer();
const pteroService = new pteroServer();
const pteroRolesService = new pterosRolesServer();
const pteroStaffService = new pteroStaffServer();

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
  //   "id": "4e097dc7-06f2-4290-a11f-cb56f386c388",
  //   "permission": "Update ptero Info"
  // }
  const checkIfUserHasPermission = await validateIfUserHasRequiredPermissions(
    userId,
    pteroId,
    "4e097dc7-06f2-4290-a11f-cb56f386c388",
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
      message: "Ptero was not found! -contoller",
    });

  if (patchPteroSchema.userId && userId !== getCurrentPteroInfo.userId) {
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "Only ptero owner can change ownership",
    });
  }

  return await pteroService.updatePtero(pteroId, patchPteroSchema);
};
