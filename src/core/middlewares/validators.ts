import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../utils/statusCode";

// generic uuid validation
export function validateUUID(uuid: string) {
  const parsed = z.uuid().safeParse(uuid);

  if (!parsed.success) {
    throw new HTTPException(HttpStatus.BAD_REQUEST, {
      message: "Invalid UUID",
    });
  }

  return uuid;
}
