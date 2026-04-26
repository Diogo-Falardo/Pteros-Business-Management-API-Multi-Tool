import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import {
  CREATE_PteroRoleSchema,
  CREATE_PteroSchema,
  inviteLinkSchema,
  PATCH_PteroSchema,
  PermissionsListSchema,
  pteroStaffMembersIdSchema,
} from "./ptero.schema";
import { validateUUID } from "../../core/middlewares/validators";
import {
  addPermissionsToPteroRole,
  addPteroStaffToRole,
  createNewPteroRole,
  createPtero,
  deletePtero,
  generateInviteLink,
  getPteroRolePermissionList,
  // getPteroRolePermissionList,
  getPteroRolesList,
  pteroListFromAnUser,
  pteroStaffListMembers,
  updatePtero,
  useInviteLink,
  validateIfUserCanAccessPtero,
} from "./ptero.controller";
import { log } from "../../core/middlewares/logger";

export const pteroRoutes = new Hono().basePath("/ptero");

pteroRoutes.post(
  "create/:userId",
  describeRoute({
    summary: "Create a new ptero",
    description: `
Ptero is basicly any type of business that requires a multi tool (management) API .
- By creating a ptero a user becames the owner of it.    `,
    tags: ["Ptero"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                example: "Pterodactylus",
              },
            },
            required: ["name"],
          },
        },
      },
      required: true,
    },
    responses: {
      200: {
        description: "Ptero created",
      },
      404: {
        description: "User not found",
      },
    },
  }),
  sValidator("json", CREATE_PteroSchema),
  async (c) => {
    const { userId } = c.req.param();
    const validatedUserId = validateUUID(userId);
    const ptero = c.req.valid("json");

    log.info(
      `creating ptero for user: ${userId} with ptero schema: ${JSON.stringify(ptero)}`,
    );

    const createdPtero = await createPtero(validatedUserId, ptero);
    return c.json({
      ptero_created: createdPtero,
    });
  },
);

pteroRoutes.delete(
  "delete/:userId/:pteroId",
  describeRoute({
    summary: "Delete a ptero",
    description: `
  Deleting a ptero will delete everything with it.
  - To delete a ptero is required the Owner Role
  `,
    tags: ["Ptero"],
    responses: {
      200: {
        description: "Ptero deleted",
      },
      404: {
        description:
          "Ptero was not found, User not found, User is not a staff member",
      },
      403: {
        description: "User doesnt have valid permissions",
      },
    },
  }),
  async (c) => {
    const { userId, pteroId } = c.req.param();
    const validatedUserId = validateUUID(userId);
    const validatedPteroId = validateUUID(pteroId);

    log.info(
      `Start delete ptero: ${JSON.stringify({ validatedPteroId })} request by user: ${JSON.stringify({ validatedUserId })}`,
    );

    await deletePtero(validatedUserId, validatedPteroId);

    return c.json({ ptero_deleted: validatedPteroId });
  },
);

pteroRoutes.patch(
  "update/:userId/:pteroId",
  describeRoute({
    summary: "Update an existing ptero",
    description: `
  Updates an existing ptero inside the database if who requested has permissions for that
  - to update the owner of the ptero it needs to be the current owner to do it
    `,
    tags: ["Ptero"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                example: "uuid",
              },
              name: {
                type: "string",
                example: "Ankylosaurus",
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Ptero updated",
      },
      403: {
        description:
          "User doesnt have permissions, or tried to update ownership of ptero and its not the current owner",
      },
      404: {
        description: "Ptero was not found",
      },
    },
  }),
  sValidator("json", PATCH_PteroSchema),
  async (c) => {
    const { userId, pteroId } = c.req.param();
    const validatedUserId = validateUUID(userId);
    const validatedPteroId = validateUUID(pteroId);
    const ptero = c.req.valid("json");

    log.info(
      `Updating ptero: ${JSON.stringify({ validatedUserId, validatedPteroId, ptero })}`,
    );

    const updatedPtero = await updatePtero(
      validatedUserId,
      validatedPteroId,
      ptero,
    );
    return c.json(updatedPtero);
  },
);

pteroRoutes.get(
  "list/:userId",
  describeRoute({
    summary: "Get list pteros from User",
    description: `
  Return the list of pteros associated to that user
    `,
    tags: ["Ptero", "User - Info"],
    responses: {
      404: {
        description: "Not found the user or pteros",
      },
      200: {
        description: "Ptero list",
      },
    },
  }),
  async (c) => {
    const { userId } = c.req.param();
    const validatedUserId = validateUUID(userId);

    log.info(`Getting list of pteros from the user: ${validatedUserId}`);

    const pterosList = await pteroListFromAnUser(validatedUserId);
    return c.json({ pteros_list: pterosList });
  },
);

// ptero valdiations

pteroRoutes.get(
  "allowed/:userId/:pteroId",
  describeRoute({
    summary: "Check user allowed access ptero",
    description: `
  - Checks if the **user** that is **trying to access this ptero is valid staff member** 
  - If its in staff list it can access **otherwise it cannot**

    `,
    tags: ["Ptero", "Ptero - Validations"],
    responses: {
      200: {
        description: "Returns true : user can access",
      },
      404: {
        description: "User not found or ptero not found",
      },
      403: {
        description: "User is not allowed to access the ptero",
      },
    },
  }),
  async (c) => {
    const { userId, pteroId } = c.req.param();
    const validatedUserId = validateUUID(userId);
    const validatedPteroId = validateUUID(pteroId);

    log.info(
      `Validating if the user ${validatedUserId} can access the ptero: ${pteroId}`,
    );

    const isUserAllowed = await validateIfUserCanAccessPtero(
      validatedUserId,
      validatedPteroId,
    );
    return c.json({ isUserAllowed });
  },
);

// Ptero Staff Management
// Here you will find the routes/endpoints that make the management of ptero users possible

/**
 * This routes are mainly to controll over the staff system around every ptero
 * Every staff member present on the staff list with any role can view the respective members and its role
 */

pteroRoutes.get(
  "list-of-staffs/:pteroId",
  describeRoute({
    summary: "Get the list of staff members",
    description: `
  - Returns the list of staff members from a ptero  
  *If **there is a ptero** its impossible to return an empty array because
  an **owner is a staff** member*

  Can be used by everyone in the ptero staff list
    `,
    tags: ["Ptero", "Ptero - Staff - Management"],
    responses: {
      200: {
        description: "Ptero staff list",
      },
      404: {
        description: "Ptero not found",
      },
    },
  }),
  async (c) => {
    const { pteroId } = c.req.param();
    const validatedPteroId = validateUUID(pteroId);

    log.info(`Getting the list of staff members of ptero: ${validatedPteroId}`);

    const staffList = await pteroStaffListMembers(validatedPteroId);

    return c.json({ ptero_staff_list: staffList });
  },
);

pteroRoutes.post(
  "set-new-staff-member/:userId/:pteroId",
  describeRoute({
    summary: "Add new staff member",
    description: `
  Adds a new staff member to a ptero staff list

  The path parameters:
  - userId is who is making the changes
  - pteroId ...

  The body:
  - roleId is the new role to be setted
  - userId is from the person its trying to change
    

  can only be used with this permission:
  - "id": "8005995a-7cc0-4afc-b531-c48ff97d6bbb",
  - "permission": "Add Ptero Staff Members"
  


    `,
    tags: ["Ptero", "Ptero - Staff - Management"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                example: "uuid",
                description: "The id of the new staff member",
              },
              roleId: {
                type: "string",
                example: "uuid",
              },
            },
            required: ["userId", "roleId"],
          },
        },
      },
      required: true,
    },
    responses: {
      200: {
        description: "User was set as staff member",
      },
      403: {
        description: "User is not part of your staff members list",
      },
    },
  }),
  sValidator("json", pteroStaffMembersIdSchema),
  async (c) => {
    const { userId, pteroId } = c.req.param();
    const { userId: newStaffMemberId, roleId } = c.req.valid("json");

    log
      .withMetadata({ userId, pteroId, newStaffMemberId, roleId })
      .info("adding new staff member");

    const valdiatedUserId = validateUUID(userId);
    const validatedPteroId = validateUUID(pteroId);

    const payload = {
      userId: newStaffMemberId,
      roleId,
    };

    return c.json(
      await addPteroStaffToRole(valdiatedUserId, validatedPteroId, payload),
    );
  },
);

pteroRoutes.post(
  "create-role/:userId/:pteroId",
  describeRoute({
    summary: "Create a new role for ptero",
    description: `
  Creates a new staff role     
  - *Creates a new role at the bottom of the hiearchy*
  - **Updating all other roles to + 1 in hierchy**
  - **Except Owner and Viewers**

  Can be used by staff members with the permission: 

  - "id": "eb344a89-e9a1-474c-b242-a414855719c0",
  - "permission": "Create New Role" 
  
  `,
    tags: ["Ptero", "Ptero - Staff - Management"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              role: {
                type: "string",
                example: "Staff Manager",
              },
            },
            required: ["role"],
          },
        },
      },
      required: true,
    },
    responses: {
      200: {
        description: "Role created",
      },
      403: {
        description: "Role already exists",
      },
    },
  }),
  sValidator("json", CREATE_PteroRoleSchema),
  async (c) => {
    const { userId, pteroId } = c.req.param();
    const { role } = c.req.valid("json");
    log.withMetadata({ userId, pteroId, role }).info("creating new role");

    const validatedUserId = validateUUID(userId);
    const validatedPteroId = validateUUID(pteroId);

    await createNewPteroRole(validatedUserId, validatedPteroId, role);

    return c.json({ new_role: role });
  },
);

pteroRoutes.post(
  "update-roles-permissions/:userId/:pteroId/:roleId",
  describeRoute({
    summary: "Set list of permissions to a role",
    description: `
  From a list of permissions updates or deletes permissions:
  
  - **userId** is from **who is making the request**

  - Adds if there is no permissions to roles.
  - If there are permissions:
    1. Add new permissions
    2. Remove permissions that were disabled
    `,
    tags: ["Ptero", "Ptero - Staff - Management"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                permissionId: { type: "string", format: "uuid" },
              },
              required: ["permissionsId"],
            },
          },
          example: [
            {
              permissionId: "8005995a-7cc0-4afc-b531-c48ff97d6bbb",
            },
            {
              permissionId: "d1384f1a-af16-4a40-b55f-08abcab784bb",
            },
          ],
        },
      },
      required: true,
    },
  }),
  sValidator("json", PermissionsListSchema),
  async (c) => {
    const { userId, pteroId, roleId } = c.req.param();
    const permissions = c.req.valid("json");
    log
      .withMetadata({ userId, pteroId, roleId, permissions })
      .info("upserting the list of permissions to a role");
    const validatedUserId = validateUUID(userId);
    const validatedPteroId = validateUUID(pteroId);
    const validatedRoleId = validateUUID(roleId);

    await addPermissionsToPteroRole(
      validatedUserId,
      validatedPteroId,
      validatedRoleId,
      permissions,
    );

    return c.json("Permissions Updated");
  },
);

pteroRoutes.get(
  "roles/:userId/:pteroId",
  describeRoute({
    summary: "Get the list of roles from a ptero",
    description: `
  Returns the list roles of  each pteros:
  - ***Only works if user is part of the ptero staff table***
    `,
    tags: ["Ptero", "Ptero - Staff - Management"],
    responses: {
      200: {
        description: "list of roles",
      },
      403: {
        description: "User is not part of your staff members list",
      },
    },
  }),
  async (c) => {
    const { userId, pteroId } = c.req.param();
    log
      .withMetadata({ userId, pteroId })
      .info("getting the list of roles from the ptero");
    const valdiatedUserId = validateUUID(userId);
    const validatedPteroId = validateUUID(pteroId);

    return c.json(await getPteroRolesList(valdiatedUserId, validatedPteroId));
  },
);

pteroRoutes.get(
  "roles-permissions/:userId/:pteroId/:roleId",
  describeRoute({
    summary: "Get the permissions of each role",
    description: `
  Returns the permissions of each role from that ptero;  
  - ***Only works if the user who requested has the update roles permission***  
  
  {
    "id": "2286190c-15f5-48ea-b3f6-414df1ab4ff4",
    "permission": "Update Roles Permissions"
  },

    `,
    tags: ["Ptero", "Ptero - Staff - Management"],
    responses: {
      200: {
        description: "list of permissions or an empty array",
      },
      403: {
        description: "user dont have permissions",
      },
      404: {
        description: "user or ptero not found",
      },
      500: {
        description: "database error",
      },
    },
  }),
  async (c) => {
    const { userId, pteroId, roleId } = c.req.param();
    const validatedUserId = validateUUID(userId);
    const validatedPteroId = validateUUID(pteroId);
    const validatedRoleId = validateUUID(roleId);

    log.info("looking for permissions");

    return c.json(
      await getPteroRolePermissionList(
        validatedUserId,
        validatedPteroId,
        validatedRoleId,
      ),
    );
  },
);

// invite links

pteroRoutes.post(
  "generate-invite-link/:pteroId",
  describeRoute({
    summary: "Create an invite link to a ptero",
    description: `
  reates a new invite link to an existing pteros

  ***Possible bugs ecounter:***  
  NOT IMPLEMENTED DO TO NOT BE URGENT  
  *needs to be better planned the way invite links should work*
  - There is ***NO validation for same uuids or invite links in pteros table***
  - There is ***NO validation if ptero has already an invite link***    
    `,
    tags: ["Ptero", "Ptero - Invite"],
    responses: {
      200: {
        description: "Generated invite link",
      },
    },
  }),
  async (c) => {
    const { pteroId } = c.req.param();
    const validatedPteroId = validateUUID(pteroId);

    log.info(`Generating invite link for ptero: ${validatedPteroId}`);
    const generatedInviteLink = await generateInviteLink(validatedPteroId);
    return c.json({ invite_link: generatedInviteLink });
  },
);

pteroRoutes.post(
  "use-invite-link/:userId",
  describeRoute({
    summary: "Use an Invite Link",
    description: `
  Uses an Invite Link used by an User trying to join a ptero
    
  It sets a new role inside of staff called viewer
  - Viewer:
    - Does not have any permission is just there to view
    - This role cannot be deleted

    `,
    tags: ["Ptero", "Ptero - Invite"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              inviteLink: {
                type: "string",
                example: "uuid",
              },
            },
            required: ["inviteLink"],
          },
        },
      },
      required: true,
    },
    responses: {
      200: {
        description: "Invite link used",
      },
      403: {
        description: "Cannout join ptero",
      },
      404: {
        description: "Invite link was not found",
      },
    },
  }),
  sValidator("json", inviteLinkSchema),
  async (c) => {
    const { userId } = c.req.param();
    const validatedUserId = validateUUID(userId);
    const { inviteLink } = c.req.valid("json");

    log.info(`Using invite link ${inviteLink} user using: ${validatedUserId}`);

    await useInviteLink(validatedUserId, inviteLink);
    return c.json("Joined");
  },
);
