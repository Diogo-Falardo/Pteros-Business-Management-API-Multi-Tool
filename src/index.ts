import { Hono } from "hono";
import { Scalar } from "@scalar/hono-api-reference";
import { openAPIRouteHandler, describeRoute } from "hono-openapi";
import { healthRoutes } from "./modules/health/health.routes";
import { userRoutes } from "./modules/users/user.route";
import { HTTPException } from "hono/http-exception";
import { InstanceofExpression } from "typescript";

const app = new Hono();

app.route("/v1", healthRoutes);
app.route("/", userRoutes);

app.get(
  "/",
  describeRoute({
    summary: "Root endpoint",
    description: "Returns a welcome message as plain text",
    responses: {
      200: {
        description: "success response",
        content: {
          "text/plain": {
            schema: {
              type: "string",
              example: "bloop hono template!",
            },
          },
        },
      },
    },
  }),
  (c) => {
    return c.text("Ptero Project");
  },
);

app.get(
  "/doc",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "Ptero Project API",
        version: "1.0.0",
        description:
          "For more Information check: https://github.com/Diogo-Falardo/Pteros-Business-Management-API-Multi-Tool",
      },
      servers: [{ url: "http://localhost:3000", description: "Local Server" }],
    },
  }),
);

app.get("/scalar", Scalar({ url: "/doc" }));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
});

export default app;
