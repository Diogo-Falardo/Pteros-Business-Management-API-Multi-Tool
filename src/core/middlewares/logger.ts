import { LogLayer, ConsoleTransport } from "loglayer";
export const log = new LogLayer({
  transport: new ConsoleTransport({
    logger: console,
    appendObjectData: false,
  }),
});
