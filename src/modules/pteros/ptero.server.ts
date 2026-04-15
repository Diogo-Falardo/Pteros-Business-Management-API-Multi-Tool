import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "../../core/utils/statusCode";
import { db } from "../../db/db.index";
import {
  pterosRolesTable,
  pterosRolesPermissionsTable,
  pterosStaffTable,
  pterosTable,
} from "../../db/schema";
import { permissionsServer } from "../../core/admin/global.server";
import { and, eq } from "drizzle-orm";
import {
  pteroSchema,
  pteroStaffInfoSchema,
  type_PATCH_PteroSchema,
  type_PteroSchema,
  type_PteroStaffInfoSchema,
} from "./ptero.schema";

const globalPermissionService = new permissionsServer();

export class pteroServer {
  staffService = new pteroStaffServer();
  rolesService = new pterosRolesServer();
  permissionsService = new pterosRolesPermissionsServer();

  /**
   * Logic behind creating a ptero
   *
   * create a pteros, create an Owner role to that ptero
   *, add permissions to owner, add owner to ptero staff table
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

      //create owner role
      const ownerRoleId = await this.rolesService.createRoleOwner(
        newPtero[0].id,
      );

      // add permission to owner
      await this.permissionsService.setOwnerPermissions(ownerRoleId);

      // add owner to ptero staff table
      await this.staffService.addRoleToUserId(
        userId,
        newPtero[0].id,
        ownerRoleId,
      );

      return newPtero;
    } catch (err: any) {
      console.error(`Error Creating a Ptero: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error creating ptero!",
      });
    }
  }

  async deletePtero(pteroId: string) {
    try {
      await db.delete(pterosTable).where(eq(pterosTable.id, pteroId));
    } catch (err: any) {
      console.error(`Error Deleting Ptero: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error deleting ptero!",
      });
    }
  }

  /**
   * Update a ptero
   *
   * Update only if values have changed
   *
   * @param pteroId
   * @param pteroPatchSchema
   */
  async updatePtero(
    pteroId: string,
    pteroPatchSchema: type_PATCH_PteroSchema,
  ): Promise<type_PteroSchema | object> {
    const currentPteroInfo = await this.getPteroById(pteroId);
    console.log("currentPteroInfo " + currentPteroInfo);
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
    } catch (err: any) {
      console.error(`Error Updating Ptero: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error update ptero!",
      });
    }
  }
  /**
   * Looks for a ptero by its id
   *
   * If returned false means no ptero was found
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
    } catch (err: any) {
      console.error(`Error Getting Ptero: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error loading ptero!",
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
    } catch (err: any) {
      console.error(`Error Adding Invite Link: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error creating invite link!",
      });
    }
  }
  /**
   * this function should return to what ptero does that invite link cames from
   *
   * false means that invite link was not found
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
    } catch (err: any) {
      console.error(`Error Validating Invite Link: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error using invite link! Please try again later!",
      });
    }
  }

  async checkIfIsOwner(userId: string, pteroId: string) {
    try {
      const user = await db
        .select()
        .from(pterosTable)
        .where(and(eq(pterosTable.userId, userId), eq(pterosTable.id, pteroId)))
        .limit(1);

      if (!user[0]) return false;

      return true;
    } catch (err: any) {
      console.error(`Error Checking If User Is Owner: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error loading user!",
      });
    }
  }
}

export class pteroStaffServer {
  rolesService = new pterosRolesServer();

  async addRoleToUserId(userId: string, pteroId: string, roleId: string) {
    try {
      await db.insert(pterosStaffTable).values({ userId, pteroId, roleId });
    } catch (err: any) {
      console.error(
        `Error Adding Role to User Id in Ptero Staff: ${err?.message}`,
      );
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error in ptero!",
      });
    }
  }

  /**
   * Returns role_id and Role name from userId
   *
   * false means user is not a staff member
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

      const roleName = await this.rolesService.getRoleName(
        pteroId,
        userRole[0].roleId,
      );

      if (!roleName) {
        throw new HTTPException(HttpStatus.NOT_FOUND, {
          message: "Role was not found!",
        });
      }

      const info = {
        roleId: userRole[0].roleId,
        role: roleName,
      };

      return pteroStaffInfoSchema.parse(info);
    } catch (err: any) {
      console.error(
        `Error Validating If User Is A Staff Member ${err?.message}`,
      );
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error loading user",
      });
    }
  }
}

export class pterosRolesServer {
  async createRoleOwner(pteroId: string) {
    try {
      const ownerRoleId = await db
        .insert(pterosRolesTable)
        .values({
          pteroId,
          role: "Owner",
        })
        .returning();

      return ownerRoleId[0].id;
    } catch (err: any) {
      console.error(`Error Creating Role Owner: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error creating ptero!",
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
        })
        .returning();

      return viewerRoleId[0].id;
    } catch (err: any) {
      console.error(`Error Creating Role Viewer: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error using invite link! Please try again later!",
      });
    }
  }

  /**
   * This method only returns a role name
   *
   * if returns false it means no role was found
   *
   * @param userId
   * @param pteroId
   * @returns string || false
   *
   */
  async getRoleName(pteroId: string, roleId: string): Promise<string | false> {
    try {
      const roleName = await db
        .select({ role: pterosRolesTable.role })
        .from(pterosRolesTable)
        .where(
          and(
            eq(pterosRolesTable.pteroId, pteroId),
            eq(pterosRolesTable.id, roleId),
          ),
        )
        .limit(1);

      if (!roleName[0]) return false;

      return roleName[0].role;
    } catch (err: any) {
      console.error(`Error Getting Role Name${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error loading user",
      });
    }
  }

  /**
   * Returns roleId or false if role was not found
   * @param pteroId
   * @param roleName
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
    } catch (err: any) {
      console.error(`Error Getting Role Id From Role Name${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error loading user",
      });
    }
  }
}

export class pterosRolesPermissionsServer {
  // set all available permission to owner
  async setOwnerPermissions(roleId: string) {
    const getAllPermissions = await globalPermissionService.list();
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
    } catch (err: any) {
      console.error(`Error Setting Owner Permissions: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error creating ptero!",
      });
    }
  }

  /**
   * this method checks if a role has an permission
   *
   * true means has the permission
   *
   * false means that role has not that permission
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
    } catch (err: any) {
      console.error(
        `Error Validating If Role Id Has Permissions Id: ${err?.message}`,
      );
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error loading user!",
      });
    }
  }
}
