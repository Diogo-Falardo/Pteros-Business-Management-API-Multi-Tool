import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import { use_GlobalPermissionsService } from "./admin.services";
import { admin_CREATE_Permission } from "./admin.schema";
import { adminCreatePermission } from "./admin.controller";

export const adminRoutes = new Hono().basePath("/admin");

adminRoutes.get(
  "permissions",
  describeRoute({
    summary: "Returns the list of available permissions",
    description: "Returns the list of available permissions",
    tags: ["Admin", "Admin - Permissions"],
    responses: {
      200: {
        description: "Returned list",
      },
    },
  }),
  async (c) => {
    const permissionsList =
      await use_GlobalPermissionsService.getListOfPermissions();

    return c.json(permissionsList);
  },
);

adminRoutes.post(
  "create-permission",
  describeRoute({
    summary: "Create a new permission globally",
    description: `
  Creates a new permission that can be used by pteros staff:
  - Please Provide a **nice name** that people can identify what does it do without to much dificulty  

***--> future to add descriptions***

    `,
    tags: ["Admin", "Admin - Permissions"],
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
    return c.json({ newPermission });
  },
);
