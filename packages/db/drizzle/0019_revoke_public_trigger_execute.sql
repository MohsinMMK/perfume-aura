-- 0010 created these trigger functions without the PUBLIC revoke 0008/0014 use.
REVOKE ALL ON FUNCTION "prevent_last_owner_removal"() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION "prevent_ops_append_only_mutation"() FROM PUBLIC;
