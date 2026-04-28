import { Hono } from "hono";
import { z } from "zod";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import { CREATE_UserSchema, LoginSchema } from "./user.schema";
import {
  createUser,
  deleteUser,
  getUserInfo,
  loginUser,
} from "./user.controller";
import { validateUUID } from "../../core/middlewares/validators";
import { log } from "../../core/middlewares/logger";

export const userRoutes = new Hono().basePath("/user");

userRoutes.post(
  "create",
  describeRoute({
    summary: "Create user",
    description: `Creates a new user
  - Password is encrypted using **argon2** 

  **required** to use the application
    `,
    tags: ["User", "Authentication"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              email: {
                type: "string",
                format: "email",
                example: "user@example.com",
              },
              password: { type: "string", example: "123Ul!" },
            },
            required: ["email", "password"],
          },
        },
      },
      required: true,
    },
    responses: {
      403: {
        description: "Email already in use",
      },
      200: {
        description: "User Created",
      },
    },
  }),
  sValidator("json", CREATE_UserSchema),
  async (c) => {
    const user = c.req.valid("json");

    log.withMetadata({ user: user }).info("Creating user");
    const create = await createUser(user);
    return c.json(create, 201);
  },
);

userRoutes.delete(
  "delete",
  describeRoute({
    summary: "Delete user",
    description: `Deletes an user **by the corresponding user id**
  
  - Only admins should be allowed to use this in your software.  
  ***This never should be a set as a permission***

    `,
    tags: ["User", "Admin"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            properties: {
              userId: {
                type: "string",
                example: "uuid",
              },
            },
            required: ["userId"],
          },
        },
      },
      required: true,
    },
    responses: {
      200: {
        description: "User Deleted",
      },
    },
  }),
  sValidator("json", z.object({ userId: z.string() })),
  async (c) => {
    const id = c.req.valid("json");
    const validatedUserId = validateUUID(id.userId);

    log.info(`Deleting user: ${validatedUserId}`);

    const result = await deleteUser(validatedUserId);
    return c.json({
      deleted_user: result,
    });
  },
);

userRoutes.post(
  "login",
  describeRoute({
    summary: "Login user",
    description: `- Logins an User and **returns the corresponding user id**`,
    tags: ["User", "Authentication"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              email: {
                type: "string",
                format: "email",
                example: "user@example.com",
              },
              password: { type: "string", example: "123Ul!" },
            },
            required: ["email", "password"],
          },
        },
      },
      required: true,
    },
    responses: {
      200: {
        description: "User logged with success",
      },
      404: {
        description: "Email not found",
      },
      403: {
        description: "User inserted wrong password",
      },
    },
  }),
  sValidator("json", LoginSchema),
  async (c) => {
    const { email, password } = c.req.valid("json");

    log.info(`Authentication start for: ${email}`);
    return c.json({ userId: await loginUser(email, password) });
  },
);

userRoutes.get(
  "user-info/:userId",
  describeRoute({
    summary: "Info user",
    description: `
  - Returns the **email** from an user
    `,
    tags: ["User"],
    responses: {
      200: {
        description: "User email",
      },
      404: {
        description: "User not found",
      },
    },
  }),
  async (c) => {
    const { userId } = c.req.param();
    const validatedUserId = validateUUID(userId);

    log.info(`Inicitaing fetching of user: ${userId}`);
    return c.json({ user_email: await getUserInfo(validatedUserId) });
  },
);
