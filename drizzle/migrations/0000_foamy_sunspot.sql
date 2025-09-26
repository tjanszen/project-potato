CREATE TABLE "click_events" (
	"click_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"value" boolean NOT NULL,
	"user_local_date" date NOT NULL,
	"user_timezone" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "date_check" CHECK (date >= DATE '2025-01-01'),
	CONSTRAINT "value_check" CHECK (value = TRUE)
);
--> statement-breakpoint
CREATE TABLE "day_marks" (
	"user_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"value" boolean NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "day_marks_user_id_local_date_pk" PRIMARY KEY("user_id","local_date"),
	CONSTRAINT "date_check" CHECK (local_date >= DATE '2025-01-01'),
	CONSTRAINT "value_check" CHECK (value = TRUE)
);
--> statement-breakpoint
CREATE TABLE "league_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"league_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year_month" text NOT NULL,
	"check_type" text NOT NULL,
	"expected_value" integer,
	"actual_value" integer,
	"status" text NOT NULL,
	"error_message" text,
	"processing_time_ms" integer,
	"correlation_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recon_year_month_format" CHECK ("reconciliation_log"."year_month" ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "recon_status_values" CHECK ("reconciliation_log"."status" IN ('match', 'mismatch', 'corrected', 'error')),
	CONSTRAINT "recon_check_type_values" CHECK ("reconciliation_log"."check_type" IN ('total_days', 'longest_run', 'active_run')),
	CONSTRAINT "recon_processing_time_non_negative" CHECK ("reconciliation_log"."processing_time_ms" IS NULL OR "reconciliation_log"."processing_time_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "run_totals" (
	"user_id" uuid NOT NULL,
	"year_month" text NOT NULL,
	"total_days" integer DEFAULT 0 NOT NULL,
	"longest_run_days" integer DEFAULT 0 NOT NULL,
	"active_run_days" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "run_totals_user_id_year_month_pk" PRIMARY KEY("user_id","year_month"),
	CONSTRAINT "year_month_format" CHECK ("run_totals"."year_month" ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "total_days_non_negative" CHECK ("run_totals"."total_days" >= 0),
	CONSTRAINT "longest_run_non_negative" CHECK ("run_totals"."longest_run_days" >= 0),
	CONSTRAINT "active_run_non_negative" CHECK ("run_totals"."active_run_days" IS NULL OR "run_totals"."active_run_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"span" daterange NOT NULL,
	"day_count" integer NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"last_extended_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"start_date" date,
	"end_date" date,
	CONSTRAINT "day_count_check" CHECK ("runs"."day_count" = upper("runs"."span") - lower("runs"."span")),
	CONSTRAINT "span_check" CHECK (upper("runs"."span") >= lower("runs"."span"))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_marks" ADD CONSTRAINT "day_marks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_log" ADD CONSTRAINT "reconciliation_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_totals" ADD CONSTRAINT "run_totals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_user_idx" ON "league_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "membership_league_idx" ON "league_memberships" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "membership_league_active_idx" ON "league_memberships" USING btree ("league_id","is_active");--> statement-breakpoint
CREATE INDEX "recon_user_month_idx" ON "reconciliation_log" USING btree ("user_id","year_month");--> statement-breakpoint
CREATE INDEX "recon_status_idx" ON "reconciliation_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recon_created_at_idx" ON "reconciliation_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "recon_correlation_idx" ON "reconciliation_log" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "totals_user_month_idx" ON "run_totals" USING btree ("user_id","year_month");--> statement-breakpoint
CREATE INDEX "runs_user_end_date_idx" ON "runs" USING btree ("user_id","end_date");--> statement-breakpoint
CREATE INDEX "runs_user_active_idx" ON "runs" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "runs_user_start_date_idx" ON "runs" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE INDEX "runs_span_overlap_idx" ON "runs" USING btree ("span");