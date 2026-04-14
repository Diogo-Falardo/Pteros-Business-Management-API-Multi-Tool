import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import { CREATE_PteroSchema } from "./ptero.schema";
import { validateUUID } from "../../core/middlewares/validators";
import { pteroServer } from "./ptero.server";

export const pteroRoutes = new Hono().basePath("/ptero");

const pteroService = new pteroServer();

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

    const createdPtero = await pteroService.createPtero(
      validatedUserId,
      ptero.name,
    );
    return c.json({
      ptero_created: createdPtero,
    });
  },
);
