CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pteros_Roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ptero_id" uuid NOT NULL,
	"role" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pteros_Roles_Permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pteros_Staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ptero_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pteros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pteros_Roles" ADD CONSTRAINT "pteros_Roles_ptero_id_pteros_id_fk" FOREIGN KEY ("ptero_id") REFERENCES "public"."pteros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pteros_Roles_Permissions" ADD CONSTRAINT "pteros_Roles_Permissions_role_id_pteros_Roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."pteros_Roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pteros_Roles_Permissions" ADD CONSTRAINT "pteros_Roles_Permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pteros_Staff" ADD CONSTRAINT "pteros_Staff_ptero_id_pteros_id_fk" FOREIGN KEY ("ptero_id") REFERENCES "public"."pteros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pteros_Staff" ADD CONSTRAINT "pteros_Staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pteros_Staff" ADD CONSTRAINT "pteros_Staff_role_id_pteros_Roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."pteros_Roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pteros" ADD CONSTRAINT "pteros_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;