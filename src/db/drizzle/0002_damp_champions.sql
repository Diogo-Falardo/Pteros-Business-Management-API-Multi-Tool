ALTER TABLE "pteros_Roles" DROP CONSTRAINT "pteros_Roles_ptero_id_pteros_id_fk";
--> statement-breakpoint
ALTER TABLE "pteros_Roles_Permissions" DROP CONSTRAINT "pteros_Roles_Permissions_role_id_pteros_Roles_id_fk";
--> statement-breakpoint
ALTER TABLE "pteros_Staff" DROP CONSTRAINT "pteros_Staff_ptero_id_pteros_id_fk";
--> statement-breakpoint
ALTER TABLE "pteros_Roles" ADD CONSTRAINT "pteros_Roles_ptero_id_pteros_id_fk" FOREIGN KEY ("ptero_id") REFERENCES "public"."pteros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pteros_Roles_Permissions" ADD CONSTRAINT "pteros_Roles_Permissions_role_id_pteros_Roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."pteros_Roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pteros_Staff" ADD CONSTRAINT "pteros_Staff_ptero_id_pteros_id_fk" FOREIGN KEY ("ptero_id") REFERENCES "public"."pteros"("id") ON DELETE cascade ON UPDATE no action;