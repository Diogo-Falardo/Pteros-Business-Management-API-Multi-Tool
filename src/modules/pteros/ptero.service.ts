import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../../core/utils/statusCode";
import { db } from "../../db/db.index";
import {
  pterosRolesTable,
  pterosRolesPermissionsTable,
  pterosStaffTable,
  pterosTable,
} from "../../db/schema";
import { use_GlobalPermissionsService } from "../../core/admin/global.services";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  pteroRolesPermissionsSchema,
  pteroRolesSchema,
  pteroSchema,
  pteroSimplifiedSchema,
  pteroStaffInfoSchema,
  pteroStaffUsersInfoSchema,
  type_CREATE_PteroRolesPermissionsList,
  type_PATCH_PteroSchema,
  type_PteroRolesPermissionsSchema,
  type_PteroRolesSchema,
  type_PteroSchema,
  type_PteroSimplifiedSchema,
  type_PteroStaffInfoSchema,
  type_PteroStaffUserInfoSchema,
} from "./ptero.schema";
import { catchError } from "../../core/middlewares/error";

export class pteroService {
  private _pteroStaffService?: pteroStaffService;
  private _pteroRolesService?: pterosRolesService;
  private _pteroRolesPermissionsService?: pterosRolesPermissionsService;

  set pteroStaffService(s: pteroStaffService) {
    this._pteroStaffService = s;
  }
  get pteroStaffService() {
    if (!this._pteroStaffService) throw new Error("PteroStaffService not set");
    return this._pteroStaffService;
  }

  set pteroRolesService(s: pterosRolesService) {
    this._pteroRolesService = s;
  }
  get pteroRolesService() {
    if (!this._pteroRolesService) throw new Error("PteroRolesService not set");
    return this._pteroRolesService;
  }

  set pteroRolesPermissionsService(s: pterosRolesPermissionsService) {
    this._pteroRolesPermissionsService = s;
  }
  get pteroRolesPermissionsService() {
    if (!this._pteroRolesPermissionsService)
      throw new Error("PterosRolesPermissionsService not set");
    return this._pteroRolesPermissionsService;
  }

  /**
   * Logic behind creating a ptero:
   * - create a pteros: create an Owner role to that ptero
   * - add permissions to owner, add owner to ptero staff table
   *
   * @param userId
   * @param pteroName
   * @returns ptero
   */
  async createPtero(userId: string, pteroName: string) {
    try {
      const newPtero = await db
        .insert(pterosTable)
        .values({
          userId,
          name: pteroName,
        })
        .returning();

      // create owner role
      const ownerRoleId = await this.pteroRolesService.createRoleOwner(
        newPtero[0].id,
      );

      // add permission to owner
      await this.pteroRolesPermissionsService.setOwnerPermissions(ownerRoleId);

      // add owner to ptero staff table
      await this.pteroStaffService.addRoleToUserId(
        userId,
        newPtero[0].id,
        ownerRoleId,
      );

      return newPtero;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Creating a Ptero:",
        exceptionErrorMessage: "Error creating ptero!",
      });
    }
  }

  async deletePtero(pteroId: string) {
    try {
      await db.delete(pterosTable).where(eq(pterosTable.id, pteroId));
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Deleting Ptero:",
        exceptionErrorMessage: "Error deleting ptero!",
      });
    }
  }

  /**
   * Update a ptero:
   * - Update only if values have changed
   *
   * @param pteroId
   * @param pteroPatchSchema
   */
  async updatePtero(
    pteroId: string,
    pteroPatchSchema: type_PATCH_PteroSchema,
  ): Promise<type_PteroSchema | object> {
    const currentPteroInfo = await this.getPteroById(pteroId);
    if (!currentPteroInfo)
      throw new HTTPException(HttpStatus.NOT_FOUND, {
        message: "Ptero was not found!",
      });

    let updatePtero: type_PATCH_PteroSchema = {};

    if (
      pteroPatchSchema.name &&
      currentPteroInfo.name !== pteroPatchSchema.name
    ) {
      updatePtero.name = pteroPatchSchema.name;
    }

    if (
      pteroPatchSchema.userId &&
      currentPteroInfo.userId !== pteroPatchSchema.userId
    ) {
      updatePtero.userId = pteroPatchSchema.userId;
    }

    if (Object.keys(updatePtero).length === 0) {
      return {
        message: "No changes detected. Ptero remains unchanged.",
        ptero: currentPteroInfo,
        updated: false,
      };
    }

    try {
      const updatedPtero = await db
        .update(pterosTable)
        .set(updatePtero)
        .where(eq(pterosTable.id, pteroId))
        .returning();

      return pteroSchema.parse(updatedPtero[0]);
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Updating Ptero:",
        exceptionErrorMessage: "Error updating ptero!",
      });
    }
  }
  /**
   * Looks for a ptero by its id:
   * - If returned false means no ptero was found
   *
   * @param pteroId
   * @returns schema or false
   */
  async getPteroById(pteroId: string): Promise<type_PteroSchema | false> {
    try {
      const ptero = await db
        .select()
        .from(pterosTable)
        .where(eq(pterosTable.id, pteroId))
        .limit(1);

      if (!ptero[0]) return false;

      return pteroSchema.parse(ptero[0]);
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Getting Ptero:",
        exceptionErrorMessage: "Error loading ptero!",
      });
    }
  }

  /**
   * Check if is owner of that ptero
   * - False means its not
   * - True means its the owner
   *
   * @param userId
   * @param pteroId
   * @returns
   */
  async checkIfIsPteroOwner(userId: string, pteroId: string): Promise<boolean> {
    try {
      const user = await db
        .select()
        .from(pterosTable)
        .where(and(eq(pterosTable.userId, userId), eq(pterosTable.id, pteroId)))
        .limit(1);

      if (!user[0]) return false;

      return true;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Checking If User Is Owner:",
        exceptionErrorMessage: "Error loading user!",
      });
    }
  }

  /**
   * Gets the list of pteros than an user is part of
   * - false means there is no pteros associated to that user
   *
   * @param userId
   * @returns Simplified Schema of ptero or False
   */
  async listPterosAssociatedToAnUser(userId: string) {
    try {
      const pteros = await db
        .select({ id: pterosTable.id, name: pterosTable.name })
        .from(pterosTable)
        .where(eq(pterosTable.userId, userId));

      if (!pteros) return false;

      // find if user is staff of any pteros
      const pterosUserIsStaff =
        await this.pteroStaffService.getListOfPterosUserIsStaff(userId);

      let pterosList = pteros;
      if (pterosUserIsStaff && pterosUserIsStaff.length > 0) {
        pterosList = [...pteros, ...pterosUserIsStaff];
      }

      const uniquePteros = pterosList.filter(
        (p, i, s) => i === s.findIndex((t) => t.id === p.id),
      );
      return pteroSimplifiedSchema.array().parse(uniquePteros);
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Listing Pteros Associated To An User:",
        exceptionErrorMessage: "Error loading pteros",
      });
    }
  }

  async addInviteLink(
    pteroId: string,
    inviteLink: string,
  ): Promise<string | false> {
    try {
      const generatedInviteLink = await db
        .update(pterosTable)
        .set({ inviteLink })
        .where(eq(pterosTable.id, pteroId))
        .returning();

      if (!generatedInviteLink[0].inviteLink) return false;

      return generatedInviteLink[0].inviteLink;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Adding Invite Link:",
        exceptionErrorMessage: "Error creating invite link!",
      });
    }
  }
  /**
   * This function should return to what ptero does that invite link cames from:
   * - false means that invite link was not found
   *
   * @param inviteLink
   * @return pteroId or false
   */
  async validateInviteLink(inviteLink: string): Promise<string | false> {
    try {
      const ptero = await db
        .select()
        .from(pterosTable)
        .where(eq(pterosTable.inviteLink, inviteLink))
        .limit(1);

      if (!ptero[0]) return false;

      return ptero[0].id;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Validating Invite Link:",
        exceptionErrorMessage:
          "Error using invite link! Please try again later!",
      });
    }
  }
}

export class pteroStaffService {
  private _pteroService?: pteroService;
  private _pteroRolesService?: pterosRolesService;

  set pteroService(s: pteroService) {
    this._pteroService = s;
  }
  get pteroService() {
    if (!this._pteroService) throw new Error("pteroService not set");
    return this._pteroService;
  }

  set pteroRolesService(s: pterosRolesService) {
    this._pteroRolesService = s;
  }
  get pteroRolesService() {
    if (!this._pteroRolesService) throw new Error("pteroRolesService not set");
    return this._pteroRolesService;
  }

  /**
   * Add a role id to an user Id
   * @param userId
   * @param pteroId
   * @param roleId
   */
  async addRoleToUserId(userId: string, pteroId: string, roleId: string) {
    try {
      await db.insert(pterosStaffTable).values({ userId, pteroId, roleId });
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Adding Role to User Id in Ptero Staff:",
        exceptionErrorMessage: "Error in ptero!",
      });
    }
  }

  /**
   * Updates a role to an existing staff member
   * @param userId
   * @param pteroId
   * @param roleId
   */
  async updateRoleToUserId(userId: string, pteroId: string, roleId: string) {
    try {
      await db
        .update(pterosStaffTable)
        .set({
          roleId,
        })
        .where(
          and(
            eq(pterosStaffTable.userId, userId),
            eq(pterosStaffTable.pteroId, pteroId),
          ),
        );
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Updating Role To UserId:",
        exceptionErrorMessage:
          "Error updating staff member! Please try again later.",
      });
    }
  }

  /**
   * Returns role_id and role_name from an userId:
   *  - false means user is not a staff member
   *
   * @param userId
   * @param pteroId
   * @returns schema or boolean
   */
  async isUserAStaffMember(
    userId: string,
    pteroId: string,
  ): Promise<type_PteroStaffInfoSchema | false> {
    try {
      const userRole = await db
        .select({ roleId: pterosStaffTable.roleId })
        .from(pterosStaffTable)
        .where(
          and(
            eq(pterosStaffTable.userId, userId),
            eq(pterosStaffTable.pteroId, pteroId),
          ),
        )
        .limit(1);

      if (!userRole[0]) return false;

      const role = await this.pteroRolesService.getRoleByRoleId(
        pteroId,
        userRole[0].roleId,
      );

      if (!role) {
        throw new HTTPException(HttpStatus.NOT_FOUND, {
          message: "Role was not found!",
        });
      }

      const info = {
        roleId: userRole[0].roleId,
        role: role.role,
      };

      return pteroStaffInfoSchema.parse(info);
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Validating If User Is A Staff Member:",
        exceptionErrorMessage: "Error loading user!",
      });
    }
  }

  /**
   * This method returns the lisf of pteros an user is part of:
   * - false means user is not part of any ptero
   *
   * @param userId
   * @returns simplifed ptero schema | false
   */
  async getListOfPterosUserIsStaff(
    userId: string,
  ): Promise<Array<type_PteroSimplifiedSchema> | false> {
    try {
      const pteros = await db
        .select({ pteroId: pterosStaffTable.pteroId })
        .from(pterosStaffTable)
        .where(eq(pterosStaffTable.userId, userId));

      if (!pteros) return false;

      // for every ptero that user is part of get the ptero info
      const pterosUserIsStaffOf = await Promise.all(
        pteros.map(async (p) => {
          return await this.pteroService.getPteroById(p.pteroId);
        }),
      );

      if (!pterosUserIsStaffOf) return false;

      return pteroSimplifiedSchema.array().parse(pterosUserIsStaffOf);
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Listing Pteros That an User is Staff off:",
        exceptionErrorMessage: "Error loading pteros!",
      });
    }
  }

  /**
   * Returns a list of ids of the staff members from an ptero Id
   *
   * @param pteroId
   * @return a list of ids
   */
  async getTheListOfStaffUserIdsFromAPteroId(
    pteroId: string,
  ): Promise<Array<type_PteroStaffUserInfoSchema>> {
    try {
      const staffMembers = await db
        .select({
          userId: pterosStaffTable.userId,
          roleId: pterosStaffTable.roleId,
        })
        .from(pterosStaffTable)
        .where(eq(pterosStaffTable.pteroId, pteroId));

      return pteroStaffUsersInfoSchema.array().parse(staffMembers);
    } catch (error) {
      catchError({
        error,
        consoleErrorText:
          "Error Getting The List Of Staff User Ids From A Ptero Id:",
        exceptionErrorMessage: "Error loading staff members!",
      });
    }
  }
}

export class pterosRolesService {
  async createRoleOwner(pteroId: string) {
    try {
      const ownerRoleId = await db
        .insert(pterosRolesTable)
        .values({
          pteroId,
          role: "Owner",
          hierarchy: 1,
        })
        .returning();

      return ownerRoleId[0].id;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Creating Role Owner:",
        exceptionErrorMessage: "Error creating ptero!",
      });
    }
  }

  async createRoleViewer(pteroId: string) {
    try {
      const viewerRoleId = await db
        .insert(pterosRolesTable)
        .values({
          pteroId,
          role: "Viewer",
          hierarchy: 0,
        })
        .returning();

      return viewerRoleId[0].id;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Creating Role Viewer:",
        exceptionErrorMessage:
          "Error using invite link! Please try again later!",
      });
    }
  }

  /**
   * This method reaturns the role:
   * - false means no role was found
   *
   * @param userId
   * @param pteroId
   * @returns string || false
   *
   */
  async getRoleByRoleId(
    pteroId: string,
    roleId: string,
  ): Promise<type_PteroRolesSchema | false> {
    try {
      const role = await db
        .select()
        .from(pterosRolesTable)
        .where(
          and(
            eq(pterosRolesTable.pteroId, pteroId),
            eq(pterosRolesTable.id, roleId),
          ),
        )
        .limit(1);

      if (!role[0]) return false;

      return pteroRolesSchema.parse(role[0]);
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Getting Role by Role:",
        exceptionErrorMessage: "Error loading user",
      });
    }
  }

  /**
   * Get the role id from a role name:
   * - false means there are no roles
   *
   * @param pteroId
   * @param roleName
   * @returns Array or False
   */
  async getRoleIdFromRoleName(
    pteroId: string,
    roleName: string,
  ): Promise<string | false> {
    try {
      const roleId = await db
        .select({ roleId: pterosRolesTable.id })
        .from(pterosRolesTable)
        .where(
          and(
            eq(pterosRolesTable.pteroId, pteroId),
            eq(pterosRolesTable.role, roleName),
          ),
        )
        .limit(1);

      if (!roleId[0]) return false;

      return roleId[0].roleId;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Getting Role Id From Role Name:",
        exceptionErrorMessage: "Error loading user!",
      });
    }
  }

  async getAllRolesFromPteroId(
    pteroId: string,
  ): Promise<Array<type_PteroRolesSchema>> {
    try {
      const roles = await db
        .select()
        .from(pterosRolesTable)
        .where(eq(pterosRolesTable.pteroId, pteroId));

      return pteroRolesSchema.array().parse(roles);
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Getting All Roles From PteroId",
        exceptionErrorMessage: "Error getting roles! Please try again later",
      });
    }
  }

  /**
   * this method was with the intention of updating a role hiearchy
   *
   * @param pteroId
   * @param hiearchy -> current number that we want to update
   * @param move should be "up" or "down"
   */
  // async updateHierachy(pteroId: string, hiearchy: number, move: string) {
  //   const hiearchyChanger = () => {
  //     if (move === "up") {
  //       return (hiearchy + 1) as number;
  //     } else {
  //       return (hiearchy - 1) as number;
  //     }
  //   };

  //   console.log("Update - HCHANGER");
  //   console.log(hiearchyChanger());

  //   try {
  //     const updatedHierachy = await db.update(pterosRolesTable).set({
  //       hierarchy: hiearchyChanger(),
  //     });
  //   } catch (error) {
  //     catchError({
  //       error,
  //       consoleErrorText: "Error Updating Hierachy:",
  //       exceptionErrorMessage: "Error with role! Please try again later.",
  //     });
  //   }
  // }

  /**
   * Create a new role :
   * - new role are set two on hiearchy *
   * - if there are only to roles ("viewer and owner") then create role
   * - if there are more than 2 roles ("owner and viewer") it needs to update all the other roles + 1
   *
   * @param pteroId
   * @param role
   */
  async createRole(pteroId: string, role: string) {
    const currentRoles = await this.getAllRolesFromPteroId(pteroId);

    try {
      if (currentRoles.length === 1) {
        await db.insert(pterosRolesTable).values({
          pteroId,
          role: "viewer",
          hierarchy: 0,
        });
        await db.insert(pterosRolesTable).values({
          pteroId,
          role,
          hierarchy: 2,
        });
      } else {
        // updates all the other roles to + 1
        await db
          .update(pterosRolesTable)
          .set({ hierarchy: sql`${pterosRolesTable.hierarchy} + 1` })
          .where(
            and(
              eq(pterosRolesTable.pteroId, pteroId),
              gte(pterosRolesTable.hierarchy, 2),
            ),
          );

        await db.insert(pterosRolesTable).values({
          pteroId,
          role,
          hierarchy: 2,
        });
      }
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Creating new Role: ",
        exceptionErrorMessage:
          "Error trying to create new role! Please try again later.",
      });
    }
  }
}

export class pterosRolesPermissionsService {
  /**
   * Set all available permissions to owner
   * @param roleId
   */
  async setOwnerPermissions(roleId: string) {
    const getAllPermissions =
      await use_GlobalPermissionsService.getListOfPermissions();
    if (getAllPermissions.length === 0) {
      throw new HTTPException(HttpStatus.NOT_FOUND, {
        message: "There are no permissions to set",
      });
    }

    try {
      for (let permission of getAllPermissions) {
        await db
          .insert(pterosRolesPermissionsTable)
          .values({ roleId, permissonId: permission.id });
      }
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Setting Owner Permissions:",
        exceptionErrorMessage: "Error creating ptero!",
      });
    }
  }

  /**
   * This method checks if a role has an permission:
   * - true means has the permission
   * - false means that role has not that permission
   *
   * @param roleId
   * @param permissionId
   * @returns boolean
   */
  async validateIfRoleIdHasPermissionId(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    try {
      const isValid = await db
        .select()
        .from(pterosRolesPermissionsTable)
        .where(
          and(
            eq(pterosRolesPermissionsTable.roleId, roleId),
            eq(pterosRolesPermissionsTable.permissonId, permissionId),
          ),
        )
        .limit(1);

      if (!isValid[0]) return false;

      return true;
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Validating If Role Id Has Permissions Id:",
        exceptionErrorMessage: "Error loading user!",
      });
    }
  }

  /**
   * Check if a role has permissions:
   * - False means there is no roles for that permission
   * @param roleId
   * @returns list of roles
   */
  async checkIfRoleHasPermissions(
    roleId: string,
  ): Promise<Array<type_PteroRolesPermissionsSchema> | false> {
    try {
      const roles = await db
        .select()
        .from(pterosRolesPermissionsTable)
        .where(eq(pterosRolesPermissionsTable.roleId, roleId));

      if (!roles[0]) return false;

      return pteroRolesPermissionsSchema.array().parse(roles);
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Checking If Roles Has Permissions:",
        exceptionErrorMessage: "Error loading role! Try again later.",
      });
    }
  }

  /**
   * Sets an list of permission to a roleid
   * - check if the role has already any permission
   * - if has then update (insert and delete)
   *    1. Updates new permissions
   *    2. Removes permissions
   * - if not then create (insert)
   * @param roleId
   * @param listPermissions
   */
  async setListOfPermissionsToRole(
    roleId: string,
    listPermissions: Array<type_CREATE_PteroRolesPermissionsList>,
  ) {
    try {
      if (listPermissions.length === 0)
        throw new HTTPException(HttpStatus.BAD_REQUEST, {
          message: "0 permissions to set!",
        });

      // if there is no roles add all roles in the list
      const checkIfRoleHasPermissions =
        await this.checkIfRoleHasPermissions(roleId);
      if (!checkIfRoleHasPermissions) {
        for (const perm of listPermissions) {
          await db
            .insert(pterosRolesPermissionsTable)
            .values({ roleId, permissonId: perm.permissionId });
        }
      } else {
        const currentSet = new Set(
          checkIfRoleHasPermissions.map((p) => p.permissionId),
        );
        const newSet = new Set(listPermissions.map((p) => p.permissionId));

        // permissions to add
        // on the list of permissions if current set does not have the permission id
        // its add to this const
        const toAdd = listPermissions.filter(
          (p) => !currentSet.has(p.permissionId),
        );

        // permission to remove
        // on the list of roles if the role is not there it addes it to this const
        const toRemove = checkIfRoleHasPermissions.filter(
          (p) => !newSet.has(p.permissionId),
        );

        for (const perm of toAdd) {
          await db
            .insert(pterosRolesPermissionsTable)
            .values({ roleId, permissonId: perm.permissionId });
        }

        for (const perm of toRemove) {
          await db
            .delete(pterosRolesPermissionsTable)
            .where(
              and(
                eq(pterosRolesPermissionsTable.roleId, roleId),
                eq(pterosRolesPermissionsTable.permissonId, perm.permissionId),
              ),
            );
        }
      }
    } catch (error) {
      catchError({
        error,
        consoleErrorText: "Error Setting List of Permissions to Role:",
        exceptionErrorMessage: "Error updating role! Try again later.",
      });
    }
  }
}
