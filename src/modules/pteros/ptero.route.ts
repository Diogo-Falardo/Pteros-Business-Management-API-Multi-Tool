import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import {
  CREATE_PteroRoleSchema,
  CREATE_PteroSchema,
  inviteLinkSchema,
  PATCH_PteroSchema,
} from "./ptero.schema";
import { validateUUID } from "../../core/middlewares/validators";
import {
  createNewPteroRole,
  createPtero,
  deletePtero,
  generateInviteLink,
  pteroListFromAnUser,
  pteroStaffListMembers,
  updatePtero,
  useInviteLink,
  validateIfUserCanAccessPtero,
} from "./ptero.controller";

export const pteroRoutes = new Hono().basePath("/ptero");

pteroRoutes.post(
  "create/:userId",
  describeRoute({
    summary: "Create a new ptero",
    description: `
        Creates a new ptero inside ptero database

        Ptero is basicly any type of business that requires a multi tool (management) API

        required: UserId, Name (ptero name)
        
        `,
    tags: ["Pteros"],
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
        description: "ptero created",
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
  Deleting a ptero will delete everything with it

  To delete a ptero is required the Owner Role

  required: UserId, PteroId("Owner" -> role), 
  
  `,
    tags: ["Pteros"],
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

    to update the owner of the ptero it needs to be the current owner to do it

    retquired: UserId, PteroId, PatchSchema
    `,
    tags: ["Pteros"],
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

    const updatedPtero = await updatePtero(
      validatedUserId,
      validatedPteroId,
      ptero,
    );
    return c.json(updatedPtero);
  },
);

pteroRoutes.post(
  "generate-invite-link/:pteroId",
  describeRoute({
    summary: "Create an invite link to a ptero",
    description: `
    Creates a new invite link to an existing pteros

    Possible bugs ecounter: 
    -> NOT IMPLEMENTED DO TO NOT BE URGENT
    - There is NO validation for same uuids or invite links in pteros table
    - There is no validation if ptero has already an invite link
    
    required: PteroId
    `,
    tags: ["Pteros"],
    responses: {
      200: {
        description: "Generated invite link",
      },
    },
  }),
  async (c) => {
    const { pteroId } = c.req.param();
    const validatedPteroId = validateUUID(pteroId);

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
    -> Viewer:
      -> Does not have any permission is just there to view
      -> This role cannot be deleted

    `,
    tags: ["Pteros"],
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
    const valdidateUserId = validateUUID(userId);
    const { inviteLink } = c.req.valid("json");

    await useInviteLink(valdidateUserId, inviteLink);
    return c.json("Joined");
  },
);

pteroRoutes.get(
  "list/:userId",
  describeRoute({
    summary: "Get the list of pteros from an user",
    description: `
    Return the list of pteros associated to that user
    
    `,
    tags: ["Pteros", "Users"],
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

    const pterosList = await pteroListFromAnUser(validatedUserId);
    return c.json({ pteros_list: pterosList });
  },
);

pteroRoutes.get(
  "list-of-staffs/:pteroId",
  describeRoute({
    summary: "Get the list of pteros staff from an ptero id",
    description: `
    Returns the list of staff members from a ptero

    If there is a ptero its impossible to return an empty array because
    an owner is a staff member
    
    `,
    tags: ["Pteros"],
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

    const staffList = await pteroStaffListMembers(validatedPteroId);

    return c.json({ ptero_staff_list: staffList });
  },
);

pteroRoutes.get(
  "allowed/:userId/:pteroId",
  describeRoute({
    summary: "Check if user is allowed to access ptero",
    description: `
    Checks if the user that is trying to access this ptero is valid staff member 

    if its in staff list it can access otherwise it cannot

    `,
    tags: ["Pteros", "Users"],
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

    const isUserAllowed = await validateIfUserCanAccessPtero(
      validatedUserId,
      validatedPteroId,
    );
    return c.json({ isUserAllowed });
  },
);

pteroRoutes.post(
  "create-role/:userId/:pteroId",
  describeRoute({
    summary: "Create a new role for ptero",
    description: `
    Creates a new role for ptero
    
    Basically creates a new role at the bottom of the hiearchy
    Updating all other roles to + 1 in hierchy

    `,
    tags: ["Pteros"],
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
  }),
  sValidator("json", CREATE_PteroRoleSchema),
  async (c) => {
    const { userId, pteroId } = c.req.param();
    const { role } = c.req.valid("json");
    const validatedUserId = validateUUID(userId);
    const validatedPteroId = validateUUID(pteroId);

    const newRole = await createNewPteroRole(
      validatedUserId,
      validatedPteroId,
      role,
    );

    return c.json(newRole);
  },
);
