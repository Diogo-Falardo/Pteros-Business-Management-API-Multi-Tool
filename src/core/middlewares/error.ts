import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../utils/statusCode";

type catchedError = {
  error: any;
  consoleErrorText?: string;
  exceptionStatus?: HttpStatus;
  exceptionErrorMessage?: string;
  extra?: Record<string, any>;
};

export function catchError({
  error,
  consoleErrorText = "An error occurred: ",
  exceptionStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  exceptionErrorMessage = "Internal Server Error",
  extra = {},
}: catchedError): never {
  if (error instanceof HTTPException) {
    throw error;
  }
  console.error(`${consoleErrorText} ${error}`);
  throw new HTTPException(exceptionStatus as ContentfulStatusCode, {
    message: exceptionErrorMessage,
    ...extra,
  });
}
