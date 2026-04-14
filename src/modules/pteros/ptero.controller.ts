import { HTTPException } from "hono/http-exception";
import { userServer } from "../users/user.server";
import { type_CREATE_PteroSchema } from "./ptero.schema";
import { HttpStatus } from "../../core/utils/statusCode";
import {
  pteroServer,
  pterosRolesServer,
  pteroStaffServer,
} from "./ptero.server";

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
