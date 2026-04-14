import { HTTPException } from "hono/http-exception";
import { userServer } from "../users/user.server";
import { type_CREATE_PteroSchema } from "./ptero.schema";
import { HttpStatus } from "../../core/utils/statusCode";
import { pteroServer } from "./ptero.server";

const userService = new userServer();
const pteroService = new pteroServer();

// validate if user exists
// create an ptero associated to that user
// make that user ptero Owner
export const createPtero = async (
  userId: string,
  ptero: type_CREATE_PteroSchema,
) => {
  const validatedUser = await userService.getUserByUserId(userId);
  if (!validatedUser)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "User not found",
    });

  // this creates and sets ptero owner
  return pteroService.createPtero(userId, ptero.name);
};
