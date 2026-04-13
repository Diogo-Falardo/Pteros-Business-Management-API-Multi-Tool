import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const exampleTable = pgTable("example", {
  id: uuid().defaultRandom().primaryKey(),
  text: varchar({ length: 255 }).notNull(),
});
