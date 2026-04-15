import { HTTPException } from "hono/http-exception";
import { type_CREATE_UserSchema } from "./user.schema";
import { userServer } from "./user.server";
import { HttpStatus } from "../../core/utils/statusCode";

const UserService = new userServer();

// create an user
// validate if the user already exists on db
// insert the user
export const createUser = async (user: type_CREATE_UserSchema) => {
  const validateEmail = await UserService.validateIfEmailAlreadyExists(
    user.email,
  );
  if (validateEmail)
    throw new HTTPException(HttpStatus.FORBIDDEN, {
      message: "Email already in use!",
    });

  return await UserService.createUser(user.email, user.password);
};

export const deleteUser = async (userId: string) => {
  return await UserService.deleteUser(userId);
};

// validate if email exists
// compare passwords if they match return userId
export const loginUser = async (email: string, password: string) => {
  const validateIfEmailExists = UserService.validateIfEmailAlreadyExists(email);
  if (!validateIfEmailExists)
    throw new HTTPException(HttpStatus.NOT_FOUND, {
      message: "Email not found!",
    });

  return await UserService.authentication(email, password);
};
