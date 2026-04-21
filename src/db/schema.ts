import { integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  email: varchar({ length: 255 }).notNull(),
  password: varchar({ length: 255 }).notNull(),
});

export const pterosTable = pgTable("pteros", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  name: varchar({ length: 255 }).notNull(),
  inviteLink: uuid("invite_link").unique(),
});

export const pterosStaffTable = pgTable("pteros_Staff", {
  id: uuid().defaultRandom().primaryKey(),
  pteroId: uuid("ptero_id")
    .notNull()
    .references(() => pterosTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  roleId: uuid("role_id")
    .notNull()
    .references(() => pterosRolesTable.id),
});

export const pterosRolesTable = pgTable("pteros_Roles", {
  id: uuid().defaultRandom().primaryKey(),
  pteroId: uuid("ptero_id")
    .notNull()
    .references(() => pterosTable.id, { onDelete: "cascade" }),
  role: varchar({ length: 255 }).notNull(),
  hierarchy: integer().notNull().notNull(),
});

export const pterosRolesPermissionsTable = pgTable("pteros_Roles_Permissions", {
  id: uuid().defaultRandom().primaryKey(),
  roleId: uuid("role_id")
    .notNull()
    .references(() => pterosRolesTable.id, { onDelete: "cascade" }),
  permissonId: uuid("permission_id")
    .notNull()
    .references(() => permissionsTable.id),
});

export const permissionsTable = pgTable("permissions", {
  id: uuid().defaultRandom().primaryKey(),
  permission: varchar({ length: 255 }).notNull(),
});
