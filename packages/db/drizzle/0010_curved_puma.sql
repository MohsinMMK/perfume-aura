CREATE TYPE "public"."staff_invitation_event_type" AS ENUM('created', 'delivered', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "ops_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_invitation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_user_id" text NOT NULL,
	"actor_user_id" text,
	"event_type" "staff_invitation_event_type" NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"failed_verification_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ops_audit_events" ADD CONSTRAINT "ops_audit_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitation_events" ADD CONSTRAINT "staff_invitation_events_staff_user_id_user_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitation_events" ADD CONSTRAINT "staff_invitation_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ops_audit_events_actor_user_idx" ON "ops_audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "ops_audit_events_target_idx" ON "ops_audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "ops_audit_events_occurred_at_idx" ON "ops_audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "staff_invitation_events_staff_user_idx" ON "staff_invitation_events" USING btree ("staff_user_id");--> statement-breakpoint
CREATE INDEX "staff_invitation_events_email_idx" ON "staff_invitation_events" USING btree ("email");--> statement-breakpoint
CREATE INDEX "staff_invitation_events_occurred_at_idx" ON "staff_invitation_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "two_factor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "two_factor_user_id_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user"
  ADD CONSTRAINT "user_ops_role_check"
  CHECK ("role" IN ('owner', 'staff', 'user'));--> statement-breakpoint
CREATE UNIQUE INDEX "user_exactly_one_owner_idx"
  ON "user" ("role")
  WHERE "role" = 'owner';--> statement-breakpoint
CREATE FUNCTION "prevent_last_owner_removal"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."role" = 'owner'
     AND (TG_OP = 'DELETE' OR NEW."role" IS DISTINCT FROM 'owner')
     AND (SELECT count(*) FROM "user" WHERE "role" = 'owner') <= 1 THEN
    RAISE EXCEPTION 'The final Perfume Aura owner cannot be removed or demoted'
      USING ERRCODE = '55000';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "user_prevent_last_owner_removal"
BEFORE DELETE OR UPDATE OF "role" ON "user"
FOR EACH ROW
EXECUTE FUNCTION "prevent_last_owner_removal"();--> statement-breakpoint
CREATE UNIQUE INDEX "staff_invitation_events_one_created_per_staff_idx"
  ON "staff_invitation_events" ("staff_user_id")
  WHERE "event_type" = 'created';--> statement-breakpoint
CREATE UNIQUE INDEX "staff_invitation_events_one_accepted_per_staff_idx"
  ON "staff_invitation_events" ("staff_user_id")
  WHERE "event_type" = 'accepted';--> statement-breakpoint
CREATE FUNCTION "prevent_ops_append_only_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "staff_invitation_events_append_only"
BEFORE UPDATE OR DELETE ON "staff_invitation_events"
FOR EACH ROW
EXECUTE FUNCTION "prevent_ops_append_only_mutation"();--> statement-breakpoint
CREATE TRIGGER "ops_audit_events_append_only"
BEFORE UPDATE OR DELETE ON "ops_audit_events"
FOR EACH ROW
EXECUTE FUNCTION "prevent_ops_append_only_mutation"();
