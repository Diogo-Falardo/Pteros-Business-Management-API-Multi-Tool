import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import {
  CREATE_PteroSchema,
  inviteLinkSchema,
  PATCH_PteroSchema,
} from "./ptero.schema";
import { validateUUID } from "../../core/middlewares/validators";
import {
  createPtero,
  deletePtero,
  generateInviteLink,
  pteroListFromAnUser,
  updatePtero,
  useInviteLink,
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
  }),
  sValidator("json", inviteLinkSchema),
  async (c) => {
    const { userId } = c.req.param();
    const valdidateUserId = validateUUID(userId);
    const { inviteLink } = c.req.valid("json");

    await useInviteLink(valdidateUserId, inviteLink);
    return c.text("Joined");
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
