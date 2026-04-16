import * as argon2 from "argon2";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db/db.index";
import { usersTable } from "../../db/schema";
import { HttpStatus } from "../../core/utils/statusCode";
import { eq } from "drizzle-orm";
import { type_UserSchema } from "./user.schema";

export class userServer {
  /**
   * Retuns an User by its UserId
   *
   * false : means user was not found
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
    } catch (err: any) {
      console.error(`Error Getting User By User Id: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error loading user!",
      });
    }
  }

  /**
   * Retuns an User by its Email
   *
   * false : means user was not found
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
    } catch (err: any) {
      console.error(`Error Getting User By Email: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error loading user!",
      });
    }
  }

  /**
   * Validates if there is already an user in db
   *
   * true means there is already an email with that email
   *
   * false means there is no email associated
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
    } catch (err: any) {
      console.error(
        `Error Validating If Email Already Exists: ${err?.message}`,
      );
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error loading user!",
      });
    }
  }

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
    } catch (err: any) {
      console.error(`Error creating user: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: `Ups something went wrong while creating user!`,
      });
    }
  }

  async deleteUser(userId: string) {
    try {
      await db.delete(usersTable).where(eq(usersTable.id, userId));

      return "User Deleted";
    } catch (err: any) {
      console.error(`Error creating user: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: `Ups something went wrong while deleting user!`,
      });
    }
  }

  // compares passwords if they match return id if they dont match return false
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
    } catch (err: any) {
      if (err instanceof HTTPException) {
        throw err;
      }
      console.error(`Error Authenticating User: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: `Ups loggin failed!`,
      });
    }
  }
}
