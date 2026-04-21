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

export const userRoutes = new Hono().basePath("/user");

userRoutes.post(
  "create",
  describeRoute({
    summary: "Create a new user",
    description: `Creates a new user to ptero database
    `,
    tags: ["Users", "Authentication"],
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
    const result = await createUser(user);
    return c.json(result, 201);
  },
);

userRoutes.delete(
  "delete",
  describeRoute({
    summary: "Delete user",
    description: `Deletes an user by the corresponding user id
    `,
    tags: ["Users"],
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
    const validatedId = validateUUID(id.userId);

    const result = await deleteUser(validatedId);
    return c.json({
      deleted_user: result,
    });
  },
);

userRoutes.post(
  "login",
  describeRoute({
    summary: "Login user",
    description: `Logins an User and returns the user id
  `,
    tags: ["Users", "Authentication"],
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
    return c.json({ userId: await loginUser(email, password) });
  },
);

userRoutes.get(
  "user-info/:userId",
  describeRoute({
    summary: "Get user info",
    description: `
    Get the email from an user
    `,
    tags: ["Users"],
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

    return c.json({ user_email: await getUserInfo(validatedUserId) });
  },
);
