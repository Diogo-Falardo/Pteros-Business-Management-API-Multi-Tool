import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../utils/statusCode";
import { log } from "./logger";

type catchedError = {
  error: any;
  logError?: string;
  exceptionStatus?: HttpStatus;
  exceptionErrorMessage?: string;
  extra?: Record<string, any>;
};

export function catchError({
  error,
  logError = "An error occurred: ",
  exceptionStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  exceptionErrorMessage = "Internal Server Error",
  extra = {},
}: catchedError): never {
  if (error instanceof HTTPException) {
    throw error;
  }
  log.error(`${logError}, Error: ${error}`);
  throw new HTTPException(exceptionStatus as ContentfulStatusCode, {
    message: exceptionErrorMessage,
    ...extra,
  });
}
