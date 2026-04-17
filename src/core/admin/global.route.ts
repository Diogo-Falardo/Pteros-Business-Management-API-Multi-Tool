import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import { permissionsServer } from "./global.server";
import { admin_CREATE_Permission } from "./admin.schemas";
import { adminCreatePermission } from "./global.controller";

export const adminRoutes = new Hono().basePath("/admin");

const permissionsService = new permissionsServer();

adminRoutes.get(
  "permissions",
  describeRoute({
    summary: "Get the list of permissions",
    description: "Returns the list of available permissions",
    tags: ["Admin"],
    responses: {
      200: {
        description: "Returned list",
      },
    },
  }),
  async (c) => {
    const permissionsList = await permissionsService.list();

    return c.json(permissionsList);
  },
);

adminRoutes.post(
  "create-permission",
  describeRoute({
    summary: "Create a new permission",
    description: `
    Creates a new permission that can be used by pteros staff
    
    Please Provide a nice name that people can identify what does it do without to much dificulty

    required: Permission Name
    `,
    tags: ["Admin"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              permission: {
                type: "string",
                example: "Add Ptero Staff Members",
              },
            },
            required: ["permission"],
          },
        },
      },
      required: true,
    },
    responses: {
      200: {
        description: "Permission created",
      },
    },
  }),
  sValidator("json", admin_CREATE_Permission),
  async (c) => {
    const permission = c.req.valid("json");
    const newPermission = await adminCreatePermission(permission);
    return c.json({
      new_permission: newPermission,
    });
  },
);
