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

const globalPermissionService = new permissionsServer();

export class pteroServer {
  rolesService = new pterosRolesServer();
  permissionsService = new pterosRolesPermissionsServer();
  staffService = new pteroStaffServer();

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
}

export class pteroStaffServer {
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
}
