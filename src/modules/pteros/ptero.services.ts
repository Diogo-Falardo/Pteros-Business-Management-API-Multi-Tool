import {
  pteroService,
  pteroStaffService,
  pterosRolesService,
  pterosRolesPermissionsService,
} from "./ptero.service";

const use_PteroService = new pteroService();
const use_PteroStaffService = new pteroStaffService();
const use_PteroRolesService = new pterosRolesService();
const use_PteroRolesPermissionsService = new pterosRolesPermissionsService();

use_PteroService.pteroStaffService = use_PteroStaffService;
use_PteroService.pteroRolesService = use_PteroRolesService;
use_PteroService.pteroRolesPermissionsService =
  use_PteroRolesPermissionsService;
use_PteroStaffService.pteroService = use_PteroService;
use_PteroStaffService.pteroRolesService = use_PteroRolesService;

export {
  use_PteroService,
  use_PteroStaffService,
  use_PteroRolesService,
  use_PteroRolesPermissionsService,
};
