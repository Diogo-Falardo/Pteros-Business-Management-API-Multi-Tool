// ptero.services.ts
import {
  pteroServer,
  pteroStaffServer,
  pterosRolesServer,
  pterosRolesPermissionsServer,
} from "./ptero.server";

const pteroService = new pteroServer();
const pteroStaffService = new pteroStaffServer();
const pteroRolesService = new pterosRolesServer();
const pteroRolesPermissionsService = new pterosRolesPermissionsServer();

pteroService.pteroStaffService = pteroStaffService;
pteroService.pteroRolesService = pteroRolesService;
pteroService.pteroRolesPermissionsService = pteroRolesPermissionsService;
pteroStaffService.pteroService = pteroService;
pteroStaffService.pteroRolesService = pteroRolesService;

export {
  pteroService,
  pteroStaffService,
  pteroRolesService,
  pteroRolesPermissionsService,
};
