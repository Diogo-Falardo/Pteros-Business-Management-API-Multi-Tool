import { HTTPException } from "hono/http-exception";
import { type_CREATE_UserSchema } from "./user.schema";
import { userServer } from "./user.server";
import { HttpStatus } from "../../core/utils/statusCode";
import { validateEmail } from "../../core/middlewares/validators";

const UserService = new userServer();

export const createUser = async (user: type_CREATE_UserSchema) => {
  await validateEmail({ email: user.email, throwErrorIfExist: true });
  return await UserService.createUser(user.email, user.password);
};

export const deleteUser = async (userId: string) => {
  return await UserService.deleteUser(userId);
};

/**
 * - Validat if email exists
 * - compare passwords
 * @param email
 * @param password
 * @returns
 */
export const loginUser = async (email: string, password: string) => {
  await validateEmail({ email, throwErrorIfNotExist: true });
  return await UserService.authentication(email, password);
};

export const getUserInfo = async (userId: string) => {
  const user = await UserService.getUserByUserId(userId);
  if (!user)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "User not found!",
    });

  return user.email;
};
