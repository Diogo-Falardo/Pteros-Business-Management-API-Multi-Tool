import { LogLayer, ConsoleTransport } from "loglayer";
import type { LogLayerTransportParams } from "loglayer";
export const log = new LogLayer({
  transport: new ConsoleTransport({
    logger: console,
    dateField: "timestamp",
    appendObjectData: false,
    levelFn: (level) => level.toUpperCase(),
  }),
});

log.withMetadata;
