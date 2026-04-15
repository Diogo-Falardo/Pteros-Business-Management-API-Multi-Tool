ALTER TABLE "pteros" ADD COLUMN "invite_link" uuid;--> statement-breakpoint
ALTER TABLE "pteros" ADD CONSTRAINT "pteros_invite_link_unique" UNIQUE("invite_link");