import { HTTPException } from "hono/http-exception";
import { type_CREATE_UserSchema } from "./user.schema";
import { HttpStatus } from "../../core/utils/statusCode";
import { validateEmail } from "../../core/middlewares/validators";
import { use_UserService } from "./user.services";
import { log } from "../../core/middlewares/logger";

export const createUser = async (user: type_CREATE_UserSchema) => {
  await validateEmail({ email: user.email, throwErrorIfExist: true });
  return await use_UserService.createUser(user.email, user.password);
};

export const deleteUser = async (userId: string) => {
  return await use_UserService.deleteUser(userId);
};

/**
 * - Validate if email exists
 * - compare passwords
 * @param email
 * @param password
 * @returns
 */
export const loginUser = async (email: string, password: string) => {
  await validateEmail({ email, throwErrorIfNotExist: true });
  return await use_UserService.authentication(email, password);
};

export const getUserInfo = async (userId: string) => {
  const user = await use_UserService.getUserByUserId(userId);
  if (!user) {
    log.error(
      `Error trying to fetch user: ${userId} was not found in the database`,
    );
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "User not found!",
    });
  }

  return user.email;
};
