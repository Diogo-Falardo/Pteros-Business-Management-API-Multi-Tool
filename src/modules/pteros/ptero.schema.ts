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
