import { HTTPException } from "hono/http-exception";
import { db } from "../../db/db.index";
import { usersTable } from "../../db/schema";
import { HttpStatus } from "../../core/utils/statusCode";
import { eq } from "drizzle-orm";
import { deleteUser } from "./user.controller";
export class UserServer {
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
    try {
      const [user] = await db
        .insert(usersTable)
        .values({
          email,
          password,
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
}
