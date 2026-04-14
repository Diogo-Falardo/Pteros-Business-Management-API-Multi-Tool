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
  pteroStaffInfoSchema,
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
      await this.staffService.addOwner(userId, newPtero[0].id, ownerRoleId);

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
}

export class pteroStaffServer {
  rolesService = new pterosRolesServer();

  async addOwner(userId: string, pteroId: string, roleId: string) {
    try {
      await db.insert(pterosStaffTable).values({ userId, pteroId, roleId });
    } catch (err: any) {
      console.error(`Error Creating Role Owner: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error creating ptero!",
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
      const ownerId = await db
        .insert(pterosRolesTable)
        .values({
          pteroId,
          role: "Owner",
        })
        .returning();

      return ownerId[0].id;
    } catch (err: any) {
      console.error(`Error Creating Role Owner: ${err?.message}`);
      throw new HTTPException(HttpStatus.INTERNAL_SERVER_ERROR, {
        message: "Error creating ptero!",
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
