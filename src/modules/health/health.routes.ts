import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { db } from "../../db/db.index";
import { sql } from "drizzle-orm";


export const healthRoutes = new Hono()

healthRoutes.get("/health", describeRoute({
    summary: "Database health check",
    description: "Checks API and DB connectivity",
    tags: ["Health"],
    responses: {
        200: {
            description: "API and DB are healthy"
        },
        500: {
            description: "DB is unreachable"
        }
    }
}), async (c) => {
    try{
        // simple db ping
        await db.execute(sql`SELECT 1`)

        return c.json({
            status: "ok",
            database: `connected to ${db.$client.options.database}`,
            timestamp: new Date().toISOString(),
        },200)
    } catch(err){
        return c.json({
            status: "error",
            database: "disconnected",
            timestamp: new Date().toISOString(),
        },500)
    }
})