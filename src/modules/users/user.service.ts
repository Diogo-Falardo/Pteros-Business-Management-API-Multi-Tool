import * as argon2 from "argon2";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db/db.index";
import { usersTable } from "../../db/schema";
import { HttpStatus } from "../../core/utils/statusCode";
import { eq } from "drizzle-orm";
import { type_UserSchema } from "./user.schema";
import { catchError } from "../../core/middlewares/error";

export class userService {
  async createUser(email: string, password: string) {
    const encryptedPassword = await argon2.hash(password);
    try {
      const [user] = await db
        .insert(usersTable)
        .values({
          email,
          password: encryptedPassword,
        })
        .returning();

      return user;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Creating User:",
        exceptionErrorMessage: "Ups something went wrong while creating user!",
      });
    }
  }

  async deleteUser(userId: string) {
    try {
      await db.delete(usersTable).where(eq(usersTable.id, userId));

      return "User Deleted";
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Deleting User:",
        exceptionErrorMessage: "Ups something went wrong while deleting user!",
      });
    }
  }

  /**
   * Compares passwords if they match
   * -if they dont match return false
   * @param email
   * @param password
   * @returns id
   */
  async authentication(email: string, password: string): Promise<string> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user)
        throw new HTTPException(HttpStatus.NOT_FOUND, {
          message: "Email not found!",
        });

      const currentUserPassword = user.password;

      if (await argon2.verify(currentUserPassword, password)) {
        return user.id;
      } else {
        throw new HTTPException(HttpStatus.FORBIDDEN, {
          message: "Access Denied! Wrong Password!",
        });
      }
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Authenticating User",
        exceptionErrorMessage: "Ups loggin failed!",
      });
    }
  }

  /**
   * Retuns an User by its UserId:
   * - false means user was not found
   *
   * @param userId
   * @returns user schema || boolean
   */
  async getUserByUserId(userId: string): Promise<type_UserSchema | false> {
    try {
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (!user[0]) return false;

      return user[0];
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Getting User By User Id:",
        exceptionErrorMessage: "Error loading user!",
      });
    }
  }

  /**
   * Retuns an User by its Email
   * - false means user was not found
   *
   * @param email
   * @returns user schema || boolean
   */
  async getUserByEmail(email: string): Promise<type_UserSchema | false> {
    try {
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (!user[0]) return false;

      return user[0];
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Getting User By Email:",
        exceptionErrorMessage: "Error loading user!",
      });
    }
  }

  /**
   * Validates if there is already an user in db:
   * - true means there is already an email with that email
   * - false means there is no email associated
   *
   * @param email
   * @returns boolean
   */
  async validateIfEmailAlreadyExists(email: string): Promise<boolean> {
    try {
      const user = await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (user[0]) return true;
      else return false;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Validating If Email Already Exists:",
        exceptionErrorMessage: "Error loading user!",
      });
    }
  }
}
