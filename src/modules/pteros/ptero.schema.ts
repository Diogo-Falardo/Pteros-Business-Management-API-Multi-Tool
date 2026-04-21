import { uuid, z } from "zod";

export const pteroSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z
    .string()
    .min(1, { message: "Ptero name is required" })
    .max(255, { message: "Ptero name has a max of 255 characters" }),
  inviteLink: z.uuid().nullable(),
});

export type type_PteroSchema = z.infer<typeof pteroSchema>;

export const CREATE_PteroSchema = pteroSchema.pick({
  name: true,
});

export type type_CREATE_PteroSchema = z.infer<typeof CREATE_PteroSchema>;

/**
 *
 * PTERO STAFF SCHEMA TABLE
 *
 */

export const pteroStaffSchema = z.object({
  id: z.uuid(),
  pteroId: z.uuid(),
  userId: z.uuid(),
  roleId: z.uuid(),
});

export const pteroStaffInfoSchema = pteroStaffSchema
  .pick({
    roleId: true,
  })
  .extend({
    role: z.string(),
  });

export type type_PteroStaffInfoSchema = z.infer<typeof pteroStaffInfoSchema>;

// this schema was created for the list of users from a ptero sfaff members
// beeing used in the creation of a new staff member
export const pteroStaffUsersInfoSchema = pteroStaffSchema.pick({
  userId: true,
  roleId: true,
});
export type type_PteroStaffUserInfoSchema = z.infer<
  typeof pteroStaffUsersInfoSchema
>;

export const pteroStaffUserInfoExtendedSchema =
  pteroStaffUsersInfoSchema.extend({
    role: z.string(),
    email: z.email(),
    hierarchy: z.number(),
  });
export type type_pteroStaffUserInfoExtendSchema = z.infer<
  typeof pteroStaffUserInfoExtendedSchema
>;

export const PATCH_PteroSchema = pteroSchema
  .pick({
    userId: true,
    name: true,
  })
  .partial();

export type type_PATCH_PteroSchema = z.infer<typeof PATCH_PteroSchema>;

export const inviteLinkSchema = z.object({
  inviteLink: z.uuid(),
});

// we are doing this schema to dont show more than pteroId and Name
// we are thinking in this way just to prevent others to get the invite link
export const pteroSimplifiedSchema = pteroSchema.pick({
  id: true,
  name: true,
});

export type type_PteroSimplifiedSchema = z.infer<typeof pteroSimplifiedSchema>;

/**
 *
 * PTERO ROLES SCHEMA TABLE
 *
 */
export const pteroRolesSchema = z.object({
  id: z.uuid(),
  pteroId: z.uuid(),
  role: z
    .string()
    .min(1, { message: "Ptero name is required" })
    .max(255, { message: "Ptero name has a max of 255 characters" }),
  hierarchy: z.number(),
});
export type type_PteroRolesSchema = z.infer<typeof pteroRolesSchema>;

export const CREATE_PteroRoleSchema = pteroRolesSchema.pick({
  role: true,
});

/**
 *
 * PTERO ROLES PERMISSIONS SCHEMA TABLE
 *
 */

export const pteroRolesPermissionsSchema = z.object({
  id: z.uuid(),
  roleId: z.uuid(),
  permissionId: z.uuid(),
});

export type type_PteroRolesPermissionsSchema = z.infer<
  typeof pteroRolesPermissionsSchema
>;

export const CREATE_pteroRolesPermissionsList =
  pteroRolesPermissionsSchema.pick({
    permissionId: true,
  });

export type type_CREATE_PteroRolesPermissionsList = z.infer<
  typeof CREATE_pteroRolesPermissionsList
>;

export const PATCH_PteroRolesPermissionsList =
  CREATE_pteroRolesPermissionsList.partial();

export type type_PATCH_PteroRolesPermissionsList = z.infer<
  typeof PATCH_PteroRolesPermissionsList
>;

export const PermissionsListSchema = z.array(
  z.object({ permissionId: z.uuid() }),
);
