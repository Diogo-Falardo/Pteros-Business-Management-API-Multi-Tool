import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import { CREATE_PteroSchema } from "./ptero.schema";
import { validateUUID } from "../../core/middlewares/validators";
import { createPtero, deletePtero } from "./ptero.controller";

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

    const createdPtero = await createPtero(userId, ptero);
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
