# Graph Report - .  (2026-07-30)

## Corpus Check
- 348 files · ~205,827 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1680 nodes · 3609 edges · 162 communities (105 shown, 57 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 137 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- stock/page.tsx
- cn
- dependencies
- adjust-stock-form.tsx
- scripts
- Production Operations
- schema/index.ts
- lib/products.ts
- utils.ts
- compilerOptions
- db/src/index.ts
- verify-commerce-foundation.mjs
- scripts
- transactions.ts
- compilerOptions
- compilerOptions
- invoice-actions.tsx
- variant-actions.tsx
- lib/products.ts
- dependencies
- devDependencies
- ops/components.json
- ui/components.json
- Use Compound Components
- stock-idempotency-contract.test.ts
- React Best Practices Compiled Guide
- inventory.ts
- phase02-migrations.integration.test.ts
- mail.ts
- CAT-002 Public Product Identity Approval
- business-time.ts
- lib/auth.ts
- owner-maintenance.ts
- Commerce Documentation
- invoice-workflows.ts
- payment-workflows.ts
- compilerOptions
- Base vs Radix
- COM-FND-007 Graphify Commerce Relationship Map
- Ops pack and Path B artifact model
- phase04-migrations.integration.test.ts
- validators/package.json
- Deferred rendering
- lib/products.ts
- requireDisposableTestDatabaseUrl
- lib/products.ts
- migrate-through-auth-expansion.ts
- Radix UI to Base UI Migration
- Use React DOM Resource Hints
- Commerce Research
- Neon Serverless Postgres
- scripts
- Perfume Aura documentation index
- ops-runtime-deps/package.json
- Better Auth Security Guide
- Hostinger Dual Deployment Architecture
- Static JSX hoisting
- Split Combined Hook Computations
- Use Functional setState Updates
- app/layout.tsx
- auth-policy.ts
- TRUST-001 Indian Trademark Reference Approval
- marketing/package.json
- health.ts
- CAT-003 Sale Data Approval
- utils.ts
- pack-ops-standalone.sh
- Registry Authoring and Addresses
- security-headers.ts
- Recommended Target Boundary
- VER-002 Combined Verification and Graphify
- Perfume Aura Repository Policy
- Cache Repeated Function Calls
- Prevent Hydration Mismatch Without Flickering
- auth-policy.ts
- phase02-preflight.ts
- phase02-reconcile.ts
- phase03-workflows.integration.test.ts
- Defer State Reads to Usage Point
- Calculate Derived State During Rendering
- ops/package.json
- db/src/index.ts
- db/src/index.ts
- Email and Password Authentication Guide
- auth-source-contract.test.ts
- CAT-001
- check-test-inventory.mjs
- Neon TypeScript SDK
- Semantic Component Styling
- Preload Based on User Intent
- Avoid Layout Thrashing
- Early Return from Functions
- Combine Multiple Array Iterations
- phase03-action-contract.test.ts
- phase05-ui-contract.test.ts
- Inventory Boundary
- Payment Boundary
- COM-ADR-005 Separate Staging Domain
- Accessibility and Performance Gate
- phase02-contract-design.test.ts
- sync-marketing.sh
- Configured Icon Library
- Use SWR for Automatic Deduplication
- Optimize SVG Precision
- Owner Operations Tool
- proxy.ts
- Order and Invoice Boundary
- FIND-002
- Field Composition
- Decouple State Management from UI
- Cross-Request LRU Cache
- RSC Reference Deduplication
- Hoisted Static I/O
- Parallel Component Fetching
- eslint.config.mjs
- next-env.d.ts
- dependencies
- dependencies
- devDependencies
- postcss.config.mjs
- COM-ADR-006 Guest Checkout First
- Live Smoke Gate
- SEO and Machine-Readable Data Gate
- CHECK-002
- FIND-001
- PDP-001
- PDP-005
- Perfume Aura Coming Soon Page
- Native Build Allowlist
- shadcn Logo
- shadcn Logo Mark
- Composition Guidelines
- Use Explicit Conditional Rendering
- useRef for Transient Values
- after() Non-Blocking Work
- Authenticated Server Actions
- { signIn, signOut, useSession }
- Storefront Route Proposal
- COM-ADR-003 Honest Public Marketing
- Commerce Change Protocol
- Current Commerce Baseline
- Evidence Precedence
- Functional Journey Gate
- CART-001
- CART-002
- CAT-005
- FIND-003
- PDP-002
- PDP-003
- PDP-004
- TRUST-002
- UX-001
- UX-002
- UX-003
- Adaptation Decision
- Deployment Evidence Record
- Future Requirement Traceability
- Planned Full Storefront Gate
- Required Evidence Fields
- Verification Loop

## God Nodes (most connected - your core abstractions)
1. `cn()` - 123 edges
2. `requireOwnerSession()` - 81 edges
3. `safeDbQuery()` - 31 edges
4. `actionError()` - 29 edges
5. `parsePage()` - 28 edges
6. `actionOk()` - 26 edges
7. `Button()` - 26 edges
8. `buttonVariants` - 25 edges
9. `runDomainTransaction()` - 23 edges
10. `formatPkr()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `shadcn Monorepo Workflow` --semantically_similar_to--> `Official shadcn CLI Workflow`  [INFERRED] [semantically similar]
  AGENTS.md → .agents/skills/shadcn/SKILL.md
- `RootLayout()` --calls--> `cn()`  [EXTRACTED]
  apps/ops/app/layout.tsx → packages/ui/src/lib/utils.ts
- `Recommended Target Boundary` --semantically_similar_to--> `COM-ADR-004 Separate Storefront App`  [INFERRED] [semantically similar]
  docs/commerce/ARCHITECTURE.md → docs/commerce/DECISIONS.md
- `ForgotPasswordForm()` --calls--> `buttonVariants`  [EXTRACTED]
  apps/ops/app/(auth)/forgot-password/forgot-password-form.tsx → packages/ui/src/components/button.tsx
- `ForgotPasswordForm()` --calls--> `cn()`  [EXTRACTED]
  apps/ops/app/(auth)/forgot-password/forgot-password-form.tsx → packages/ui/src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Evidence Governance** — docs_commerce_decisions_com_adr_001, docs_commerce_requirements_ver_001, docs_commerce_requirements_ver_002, docs_commerce_verification_commerce_verification, docs_commerce_release_checklist_commerce_release_checklist [INFERRED 0.95]
- **Catalog Publication Gate** — docs_commerce_decisions_com_adr_007, docs_commerce_decisions_com_adr_008, docs_commerce_decisions_com_adr_009, docs_commerce_requirements_cat_002, docs_commerce_requirements_cat_003, docs_commerce_requirements_cat_004, docs_commerce_requirements_cat_007, docs_commerce_requirements_cat_008 [INFERRED 0.95]
- **Transactional Order Flow** — docs_commerce_requirements_cart_001, docs_commerce_requirements_check_001, docs_commerce_requirements_inv_001, docs_commerce_requirements_inv_002, docs_commerce_requirements_ord_001, docs_commerce_requirements_pay_002, docs_commerce_architecture_inventory_boundary, docs_commerce_architecture_order_and_invoice_boundary, docs_commerce_architecture_payment_boundary [INFERRED 0.85]
- **Bottle Label Fail-closed Policy** — docs_commerce_decisions_com_adr_022, docs_commerce_requirements_trust_001, docs_commerce_research_disclaimer_not_safe_harbor, docs_commerce_research_india_code_section_29, docs_commerce_research_india_code_section_30 [INFERRED 0.95]
- **Better Auth Hardening Model** — _agents_skills_better_auth_best_practices_skill_session_management, _agents_skills_better_auth_security_best_practices_skill_auth_security_guide, _agents_skills_email_and_password_best_practices_skill_password_policy [INFERRED 0.85]
- **Radix to Base Migration Knowledge Base** — _agents_skills_migrate_radix_to_base_skill_radix_to_base_migration, _agents_skills_migrate_radix_to_base_class_mapping_class_string_rewrites, _agents_skills_migrate_radix_to_base_consumer_props_consumer_prop_changes, _agents_skills_migrate_radix_to_base_disclosure_disclosure_toggle_mapping, _agents_skills_migrate_radix_to_base_display_misc_display_misc_mapping, _agents_skills_migrate_radix_to_base_form_controls_form_control_mapping, _agents_skills_migrate_radix_to_base_menus_menu_family_mapping, _agents_skills_migrate_radix_to_base_overlays_overlay_mapping, _agents_skills_migrate_radix_to_base_universal_patterns_universal_migration_patterns, _agents_skills_migrate_radix_to_base_wrapper_shapes_target_wrapper_shapes [EXTRACTED 1.00]
- **Neon Branch-First Operating Model** — _agents_skills_neon_skill_branch_first_dev_flow, _agents_skills_neon_skill_neon_infrastructure_as_code, _agents_skills_neon_postgres_branches_skill_branch_type_decision, _agents_skills_neon_postgres_references_neon_sdk_ergonomic_client [INFERRED 0.85]
- **shadcn Config-Driven Workflow** — _agents_skills_shadcn_cli_project_info, _agents_skills_shadcn_mcp_mcp_configuration_boundary, _agents_skills_shadcn_rules_icons_configured_icon_library, _agents_skills_shadcn_customization_semantic_css_token_theming [INFERRED 0.85]
- **shadcn Compositional UI Contracts** — _agents_skills_shadcn_rules_chat_message_composition, _agents_skills_shadcn_rules_composition_component_structure_contracts, _agents_skills_shadcn_rules_forms_field_composition, _agents_skills_shadcn_rules_forms_input_group_composition [INFERRED 0.85]
- **Scalable React Composition** — _agents_skills_vercel_composition_patterns_rules_architecture_avoid_boolean_props_avoid_boolean_prop_proliferation, _agents_skills_vercel_composition_patterns_rules_architecture_compound_components_use_compound_components, _agents_skills_vercel_composition_patterns_rules_patterns_explicit_variants_create_explicit_component_variants, _agents_skills_vercel_composition_patterns_rules_state_context_interface_generic_context_interfaces [INFERRED 0.95]
- **Provider-Based State Composition** — _agents_skills_vercel_composition_patterns_rules_state_decouple_implementation_decouple_state_management_from_ui, _agents_skills_vercel_composition_patterns_rules_state_lift_state_lift_state_into_provider_components, _agents_skills_vercel_react_best_practices_rules_advanced_event_handler_refs_store_event_handlers_in_refs [INFERRED 0.75]
- **Async Waterfall Elimination** — _agents_skills_vercel_react_best_practices_rules_async_api_routes_prevent_waterfall_chains_in_api_routes, _agents_skills_vercel_react_best_practices_rules_async_cheap_condition_before_await_check_cheap_conditions_before_async_flags, _agents_skills_vercel_react_best_practices_rules_async_defer_await_defer_await_until_needed, _agents_skills_vercel_react_best_practices_rules_async_dependencies_dependency_based_parallelization, _agents_skills_vercel_react_best_practices_rules_async_parallel_promise_all_for_independent_operations, _agents_skills_vercel_react_best_practices_rules_async_suspense_boundaries_strategic_suspense_boundaries [INFERRED 0.95]
- **Bundle Size Optimization** — _agents_skills_vercel_react_best_practices_rules_bundle_analyzable_paths_prefer_statically_analyzable_paths, _agents_skills_vercel_react_best_practices_rules_bundle_barrel_imports_avoid_barrel_file_imports, _agents_skills_vercel_react_best_practices_rules_bundle_conditional_conditional_module_loading, _agents_skills_vercel_react_best_practices_rules_bundle_defer_third_party_defer_non_critical_third_party_libraries, _agents_skills_vercel_react_best_practices_rules_bundle_dynamic_imports_dynamic_imports_for_heavy_components [INFERRED 0.95]
- **Module-Level Caching Patterns** — _agents_skills_vercel_react_best_practices_rules_js_cache_function_results_cache_repeated_function_calls, _agents_skills_vercel_react_best_practices_rules_js_cache_storage_cache_storage_api_calls, _agents_skills_vercel_react_best_practices_rules_js_index_maps_build_index_maps_for_repeated_lookups, _agents_skills_vercel_react_best_practices_rules_js_set_map_lookups_use_set_map_for_o_1__lookups [INFERRED 0.85]
- **Single-Pass Array Processing** — _agents_skills_vercel_react_best_practices_rules_js_combine_iterations_combine_multiple_array_iterations, _agents_skills_vercel_react_best_practices_rules_js_flatmap_filter_use_flatmap_to_map_and_filter_in_one_pass, _agents_skills_vercel_react_best_practices_rules_js_min_max_loop_use_loop_for_min_max_instead_of_sort [INFERRED 0.95]
- **Browser Main-Thread Responsiveness** — _agents_skills_vercel_react_best_practices_rules_client_passive_event_listeners_use_passive_event_listeners_for_scrolling_performance, _agents_skills_vercel_react_best_practices_rules_js_batch_dom_css_avoid_layout_thrashing, _agents_skills_vercel_react_best_practices_rules_js_request_idle_callback_defer_non_critical_work_with_requestidlecallback, _agents_skills_vercel_react_best_practices_rules_rendering_animate_svg_wrapper_animate_svg_wrapper_instead_of_svg_element [INFERRED 0.85]
- **React Concurrent Responsiveness** — _agents_skills_vercel_react_best_practices_rules_rendering_usetransition_loading_usetransition, _agents_skills_vercel_react_best_practices_rules_rerender_transitions_starttransition, _agents_skills_vercel_react_best_practices_rules_rerender_use_deferred_value_usedeferredvalue [INFERRED 0.95]
- **Dependency-scoped Recomputation** — _agents_skills_vercel_react_best_practices_rules_rerender_dependencies_effect_dependency_narrowing, _agents_skills_vercel_react_best_practices_rules_rerender_derived_state_derived_state_subscription, _agents_skills_vercel_react_best_practices_rules_rerender_split_combined_hooks_hook_dependencies [INFERRED 0.85]
- **Stable React Identities** — _agents_skills_vercel_react_best_practices_rules_rendering_hoist_jsx_static_jsx_hoisting, _agents_skills_vercel_react_best_practices_rules_rerender_functional_setstate_stable_callbacks, _agents_skills_vercel_react_best_practices_rules_rerender_memo_with_default_value_stable_default_value, _agents_skills_vercel_react_best_practices_rules_rerender_no_inline_components_react_component_identity [INFERRED 0.85]
- **Inventory-to-Finance Flow** — docs_product_stock_ledger, docs_product_invoice_lifecycle, docs_product_payment_workflow, docs_product_finance_snapshot [INFERRED 0.95]
- **Verified Path Z Release** — _github_workflows_ops_pack_quality_job, _github_workflows_ops_pack_integration_job, _github_workflows_ops_pack_package_job, _github_workflows_ops_pack_standalone_artifact, docs_operations_path_z [INFERRED 0.95]
- **Production Cutover Safety** — docs_operations_staged_cutover, docs_operations_runtime_role, docs_engineering_migration_0008, docs_operations_rollback_boundary [EXTRACTED 1.00]
- **Ops artifact validation flow** — scripts_readme_ops_pack_path_b, scripts_readme_ci_quality_integration_gates, scripts_readme_atomic_artifact_publication, scripts_readme_hostinger_path_z [EXTRACTED 1.00]
- **Ledger-safe stock write** — packages_db_readme_ledger_first_inventory, packages_db_readme_applymovement, packages_db_readme_pg_pool_transactions, packages_db_readme_neon_postgres [EXTRACTED 1.00]

## Communities (162 total, 57 thin omitted)

### Community 0 - "stock/page.tsx"
Cohesion: 0.07
Nodes (96): CustomerDetailPage(), NewCustomerPage(), CustomersPage(), parseStatus(), SearchParams, DashboardPage(), FinancePage(), SearchParams (+88 more)

### Community 1 - "cn"
Cohesion: 0.08
Nodes (48): AppShell(), AppSidebar(), inventoryNav, isActive(), salesNav, CardAction(), NativeSelectOptGroup(), Separator() (+40 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (45): @base-ui/react, class-variance-authority, clsx, next-themes, dependencies, @base-ui/react, class-variance-authority, clsx (+37 more)

### Community 3 - "adjust-stock-form.tsx"
Cohesion: 0.18
Nodes (29): metadata, SecuritySettingsPage(), Props, FormField(), FormFieldProps, TextAreaField(), TextAreaFieldProps, AddInvoiceLineForm() (+21 more)

### Community 4 - "scripts"
Cohesion: 0.05
Nodes (38): drizzle-kit, dependencies, drizzle-orm, pg, devDependencies, dotenv, drizzle-kit, tsx (+30 more)

### Community 5 - "Production Operations"
Cohesion: 0.06
Nodes (38): PostgreSQL 16 Integration Job, Verified Hostinger ZIP Job, Path B Release Gate, Quality Job, Standalone Ops Artifact, Coming Soon Page, Google Fonts, Marketing Stylesheet (+30 more)

### Community 6 - "schema/index.ts"
Cohesion: 0.12
Nodes (26): account, accountRelations, rateLimit, session, sessionRelations, user, userRelations, verification (+18 more)

### Community 7 - "lib/products.ts"
Cohesion: 0.09
Nodes (29): archiveVariantAction(), ListProductsFilter, ProductDetail, ProductListItem, reactivateVariantAction(), setVariantStatusAction(), uniqueSlug(), VariantRow (+21 more)

### Community 8 - "utils.ts"
Cohesion: 0.14
Nodes (14): ForgotPasswordForm(), metadata, LoginForm(), metadata, metadata, ResetPasswordForm(), ResetPasswordFormInner(), ChangePasswordForm() (+6 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+21 more)

### Community 10 - "db/src/index.ts"
Cohesion: 0.17
Nodes (26): FinanceSummary, FinanceSnapshot, getFinanceSnapshot(), applyMovement(), archiveProduct(), archiveProductVariant(), assertCurrentProduct(), assertCurrentVariant() (+18 more)

### Community 11 - "verify-commerce-foundation.mjs"
Cohesion: 0.10
Nodes (27): allowedDecisionStatuses, allowedRequirementStatuses, assertCalendarDate(), assertEvidenceUrlConstraints(), assertRelativeMarkdownLinks(), assertSequential(), defaultRepositoryRoot, evidenceGapKeys (+19 more)

### Community 12 - "scripts"
Cohesion: 0.07
Nodes (26): description, engines, node, name, packageManager, private, scripts, build:ops (+18 more)

### Community 13 - "transactions.ts"
Cohesion: 0.12
Nodes (16): BUSINESS_TIMEZONE, Database, db, prefixes, DomainError, DomainErrorCode, domainErrorCodes, InventoryError (+8 more)

### Community 14 - "compilerOptions"
Cohesion: 0.08
Nodes (25): compilerOptions, allowJs, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+17 more)

### Community 15 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, isolatedModules, lib, module (+16 more)

### Community 16 - "invoice-actions.tsx"
Cohesion: 0.19
Nodes (17): ArchiveCustomerButton(), ActionResponse, InvoiceActionConfig, RemoveLineButton(), ProductLifecycleActions(), Props, AlertDialog(), AlertDialogAction() (+9 more)

### Community 17 - "variant-actions.tsx"
Cohesion: 0.20
Nodes (18): ProductEditDialog(), Props, Props, VariantActions(), AdjustStockForm(), ReceiveStockForm(), Props, VariantStockDialogs() (+10 more)

### Community 18 - "lib/products.ts"
Cohesion: 0.22
Nodes (22): InvoiceStatusActions(), actionError(), actionOk(), archiveCustomerAction(), addInvoiceLineAction(), createInvoiceDraftAction(), expectedDomainFailure(), fulfillInvoiceAction() (+14 more)

### Community 19 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, better-auth, drizzle-orm, @hugeicons/core-free-icons, @hugeicons/react, nodemailer, @perfume-aura/db, @perfume-aura/ui (+15 more)

### Community 20 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, dotenv, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+15 more)

### Community 21 - "ops/components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 22 - "ui/components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 23 - "Use Compound Components"
Cohesion: 0.15
Nodes (21): Chat UI Primitives, Message Component Composition, MessageScroller Behavior, Accessible Overlay Composition, Component Structure Contracts, InputGroup Composition, Composition over Configuration, Provider State Boundary (+13 more)

### Community 24 - "stock-idempotency-contract.test.ts"
Cohesion: 0.14
Nodes (15): adjustStockAction(), DashboardStats, currentDirectory, LowStockRow, movementError(), MovementRow, receiveStockAction(), revalidateStockPaths() (+7 more)

### Community 25 - "React Best Practices Compiled Guide"
Cohesion: 0.23
Nodes (20): React Best Practices Compiled Guide, React Best Practices Repository Guide, Do Not Put Effect Events in Dependency Arrays, Store Event Handlers in Refs, Initialize App Once, Not Per Mount, useEffectEvent for Stable Callback Refs, Prevent Waterfall Chains in API Routes, Check Cheap Conditions Before Async Flags (+12 more)

### Community 26 - "inventory.ts"
Cohesion: 0.17
Nodes (16): ApplyMovementInput, ApplyMovementResult, existingMovementMatches(), InventoryErrorCode, assertNonZeroInt(), assertPositiveInt(), availableQuantity(), canSell() (+8 more)

### Community 27 - "phase02-migrations.integration.test.ts"
Cohesion: 0.14
Nodes (15): pool, configuredAdminUrl, currentDirectory, databaseUrl(), dropDatabase(), expectedPhase02Indexes, expectedReconciliationCheckNames, IdRow (+7 more)

### Community 28 - "mail.ts"
Cohesion: 0.17
Nodes (14): AuthEnvironment, buildPasswordResetMessage(), escapeHtml(), MailConfigurationError, MailDeliveryError, MailEnvironment, MailTransport, MailTransportFactory (+6 more)

### Community 29 - "CAT-002 Public Product Identity Approval"
Cohesion: 0.23
Nodes (18): COM-ADR-002 Preserve Source Names, COM-ADR-008 Perfume Aura Naming and Reference Policy, COM-ADR-013 Signature Series Public Names, COM-ADR-015 AI Name Proposal Workflow, COM-ADR-016 Internal Mapping Resolution, COM-ADR-017 Inspired Reference-title Policy, COM-ADR-018 Inspired Mapping Batch Two, COM-ADR-019 Signature In-house Classification (+10 more)

### Community 30 - "business-time.ts"
Cohesion: 0.27
Nodes (16): businessDateAt(), businessMonthBounds(), businessPeriodBounds(), businessYearAt(), DateTimeParts, formatter(), formatterCache, hasValidCalendarFields() (+8 more)

### Community 31 - "lib/auth.ts"
Cohesion: 0.16
Nodes (13): { GET, POST }, auth, AuthDependencies, baseURL, createAuth(), defaultAuthDependencies, AuthSecretEnvironment, createAuthSecretResolver() (+5 more)

### Community 32 - "owner-maintenance.ts"
Cohesion: 0.20
Nodes (13): ensureOwnerAccount(), findCredentialAccountsForUpdate(), findOwnerUserForUpdate(), lockOwnerIdentity(), normalizedOwnerInput(), OwnerInput, ownerInputSchema, OwnerRecoveryResult (+5 more)

### Community 33 - "Commerce Documentation"
Cohesion: 0.13
Nodes (16): Commerce Decision Log, Commerce Documentation, Launch Products Workbook, Launch Variants Workbook, Perfume List Table Source PDF, Approved Mapping Identity Digest, main_list:22 Evidence Gap, Mapping Evidence Metadata (+8 more)

### Community 34 - "invoice-workflows.ts"
Cohesion: 0.36
Nodes (15): allocateDocumentNumberInTransaction(), applyMovementInTransaction(), addInvoiceLine(), authoritativeSubtotal(), createInvoiceDraft(), fulfillInvoice(), InvoiceLineRow, InvoiceRow (+7 more)

### Community 35 - "payment-workflows.ts"
Cohesion: 0.23
Nodes (15): InvoiceRow, lockInvoice(), lockPayments(), mapPaymentConstraint(), PaymentMethod, PaymentOperationInput, PaymentOperationResult, PaymentRow (+7 more)

### Community 36 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck (+7 more)

### Community 37 - "Base vs Radix"
Cohesion: 0.14
Nodes (15): shadcn/ui Agent Interface, CLI Dry-Run Workflow, Preset Switching Modes, shadcn Project Info, shadcn CLI Reference, Customization and Theming, MCP Project Configuration Boundary, Base vs Radix (+7 more)

### Community 38 - "COM-FND-007 Graphify Commerce Relationship Map"
Cohesion: 0.17
Nodes (15): Authentication Boundary, Proposed Domain Additions, COM-ADR-007 Product Variant Model, COM-ADR-009 Full Catalog Launch Scope, COM-ADR-010 India Delivery and Supply Intent, COM-ADR-012 Launch Optional Capabilities, COM-ADR-014 Tester and Bottle Size Semantics, Security and Privacy Gate (+7 more)

### Community 39 - "Ops pack and Path B artifact model"
Cohesion: 0.14
Nodes (15): applyMovement(), Disposable loopback PostgreSQL test database, Ledger-first inventory, Ordered auth expansion and financial inventory contract, Neon Postgres, @perfume-aura/db, node-postgres Pool interactive transactions, Single drizzle-orm instance (+7 more)

### Community 40 - "phase04-migrations.integration.test.ts"
Cohesion: 0.16
Nodes (8): configuredAdminUrl, currentDirectory, databaseUrl(), dropDatabase(), IdRow, migrationsFolder, quotedDatabase(), recreateDatabase()

### Community 41 - "validators/package.json"
Cohesion: 0.14
Nodes (13): dependencies, zod, devDependencies, typescript, exports, typescript, zod, name (+5 more)

### Community 42 - "Deferred rendering"
Cohesion: 0.15
Nodes (13): contain-intrinsic-size, CSS content-visibility, CSS content-visibility for Long Lists, Transition pending state, Use useTransition Over Manual Loading States, useTransition, Non-urgent updates, startTransition (+5 more)

### Community 43 - "lib/products.ts"
Cohesion: 0.23
Nodes (11): ActionResult, zodFieldErrors(), createCustomerAction(), CustomerDetail, CustomerListItem, emptyToNull(), updateCustomerAction(), archiveCustomerSchema (+3 more)

### Community 44 - "requireDisposableTestDatabaseUrl"
Cohesion: 0.22
Nodes (5): testDatabaseUrl, connectionString, testDatabaseUrl, LOOPBACK_HOSTS, requireDisposableTestDatabaseUrl()

### Community 45 - "lib/products.ts"
Cohesion: 0.26
Nodes (13): rupeesToCents(), recordPaymentAction(), revalidatePaymentPaths(), archiveProductAction(), createProductAction(), createVariantAction(), dbErrorMessage(), emptyToNull() (+5 more)

### Community 46 - "migrate-through-auth-expansion.ts"
Cohesion: 0.19
Nodes (12): AuthExpansionMigrationEvidence, currentDirectory, DatabaseMigrationState, DeployedMigration, ExpectedMigration, Journal, JournalEntry, migrateThroughAuthExpansion() (+4 more)

### Community 47 - "Radix UI to Base UI Migration"
Cohesion: 0.20
Nodes (12): Class String Rewrites, Consumer Prop Changes, Disclosure and Toggle Mapping, Display and Miscellaneous Mapping, Form Control Mapping, Menu Family Mapping, Overlay Mapping, Golden Pair Migration Strategy (+4 more)

### Community 48 - "Use React DOM Resource Hints"
Cohesion: 0.17
Nodes (12): preconnect, prefetchDNS, preinit, preinitModule, preload, preloadModule, React DOM Resource Hints, Use React DOM Resource Hints (+4 more)

### Community 49 - "Commerce Research"
Cohesion: 0.18
Nodes (12): Abel Fragrance Awwwards, Apotheke Perfume Awwwards, Baymard Size-Selection Guidance, Commerce Research, Henry Jacques Awwwards, Jusbox Perfumes Awwwards, KAYALI Awwwards, Rahasya Fragrances Awwwards (+4 more)

### Community 50 - "Neon Serverless Postgres"
Cohesion: 0.20
Nodes (11): Neon Branch Type Decision, Neon Postgres Branching, Normal Neon Branch, Reset Neon Branch from Parent, Schema-Only Neon Branch, Neon Connection Pooling, Neon Serverless Postgres, Branch-First Development Flow (+3 more)

### Community 51 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, recover:owner, seed:owner, start, test (+3 more)

### Community 52 - "Perfume Aura documentation index"
Cohesion: 0.18
Nodes (11): Perfume Aura documentation index, AGENTS.md, Documentation ownership rules, ENGINEERING.md, OPERATIONS.md, Ops Path G GitHub source build, Ops Path Z prebuilt ZIP deploy, PRODUCT.md (+3 more)

### Community 53 - "ops-runtime-deps/package.json"
Cohesion: 0.18
Nodes (10): dependencies, sharp, description, engines, node, npm, name, private (+2 more)

### Community 54 - "Better Auth Security Guide"
Cohesion: 0.20
Nodes (10): Better Auth Integration Guide, Better Auth Database Adapters, Better Auth Session Management, Better Auth Setup Workflow, Better Auth Security Guide, CSRF Protection, Auth Rate Limiting, Auth Secret Management (+2 more)

### Community 55 - "Hostinger Dual Deployment Architecture"
Cohesion: 0.22
Nodes (10): Runtime-Aware Postgres Driver Selection, Hostinger DNS Path A, Hostinger Dual Deployment Architecture, Neon Production Cutover, Path M Marketing Deployment, Path Z Ops Deployment, SEC-7 Marketing Source Protection, Local Quick Start (+2 more)

### Community 56 - "Static JSX hoisting"
Cohesion: 0.20
Nodes (10): Hoist Static JSX Elements, React Compiler, Static JSX hoisting, Lazy state initialization, Use Lazy State Initialization, useState, Extract to Memoized Components, Memoized component extraction (+2 more)

### Community 57 - "Split Combined Hook Computations"
Cohesion: 0.20
Nodes (10): Derived boolean dependency, Effect dependency narrowing, Narrow Effect Dependencies, Derived state subscription, Subscribe to Derived State, useMediaQuery, Hook dependencies, React Compiler (+2 more)

### Community 58 - "Use Functional setState Updates"
Cohesion: 0.20
Nodes (10): Functional setState, React Compiler, Stable callbacks, Use Functional setState Updates, Extract Default Non-primitive Parameter Value from Memoized Component to Constant, React memo, Stable default value, Component remount (+2 more)

### Community 59 - "app/layout.tsx"
Cohesion: 0.22
Nodes (8): ibmPlexSans, metadata, ralewayHeading, RootLayout(), Toaster(), Tooltip(), TooltipProvider(), TooltipTrigger()

### Community 60 - "auth-policy.ts"
Cohesion: 0.38
Nodes (8): ALLOWED_RETURN_PATH_PREFIXES, DEVELOPMENT_AUTH_ORIGINS, hasUnsafeReturnPathRepresentation(), isAllowlistedReturnPath(), parseOrigin(), resolveAuthBaseUrl(), resolveAuthTrustedOrigins(), safeReturnPath()

### Community 61 - "TRUST-001 Indian Trademark Reference Approval"
Cohesion: 0.29
Nodes (10): COM-ADR-022 Bottle Label Disablement, Scope and Decisions Gate, Surface-Named India Counsel Evidence, TRUST-001 Indian Trademark Reference Approval, Designer-Reference Risk, Disclaimer Not Safe Harbor, India Code Section 29, India Code Section 30 (+2 more)

### Community 62 - "marketing/package.json"
Cohesion: 0.22
Nodes (8): description, name, private, scripts, build, check, sync, version

### Community 63 - "health.ts"
Cohesion: 0.39
Nodes (5): GET(), GET(), HEALTH_HEADERS, livenessResponse(), readinessResponse()

### Community 64 - "CAT-003 Sale Data Approval"
Cohesion: 0.22
Nodes (9): Media and Content Boundary, Public Catalog Projection, COM-ADR-011 India Payment Selection, Catalog and Content Gate, Fail-closed Publication Approval State, CAT-003 Sale Data Approval, PAY-001, Cashfree Payments (+1 more)

### Community 65 - "utils.ts"
Cohesion: 0.25
Nodes (7): FieldContent(), FieldLegend(), FieldSeparator(), FieldSet(), FieldTitle(), fieldVariants, Label()

### Community 66 - "pack-ops-standalone.sh"
Cohesion: 0.36
Nodes (6): copy_real(), copy_sharp_into(), refuse_existing_outputs(), pack-ops-standalone.sh script, smoke_package_versions(), smoke_sharp_tree()

### Community 67 - "Registry Authoring and Addresses"
Cohesion: 0.29
Nodes (8): Registry Build Command, MCP Registry Operation Tools, shadcn MCP Server, Immutable GitHub Registry Snapshot, Registry Address Schemes, Registry Authoring and Addresses, Registry Dependencies, Source and Built Registry Forms

### Community 68 - "security-headers.ts"
Cohesion: 0.39
Nodes (5): contentSecurityPolicy(), SecurityHeaderOptions, securityHeaders(), monorepoRoot, nextConfig

### Community 69 - "Recommended Target Boundary"
Cohesion: 0.39
Nodes (8): Marketing Application, Operations Application, Storefront Application, Existing Verified Foundation, Database Package, UI Package, Validators Package, Recommended Target Boundary

### Community 70 - "VER-002 Combined Verification and Graphify"
Cohesion: 0.25
Nodes (8): Proposed Commerce Architecture, Verification Architecture, COM-ADR-001 Combined Verification System, COM-ADR-004 Separate Storefront App, Post-Release Gate, VER-001 Requirement-to-Evidence Traceability, VER-002 Combined Verification and Graphify, COM-FND-001 Commerce Documents and Links

### Community 71 - "Perfume Aura Repository Policy"
Cohesion: 0.33
Nodes (7): shadcn Component Composition, Official shadcn CLI Workflow, shadcn Preset Workflow, shadcn UI Guide, Official Tooling Only Policy, Perfume Aura Repository Policy, shadcn Monorepo Workflow

### Community 72 - "Cache Repeated Function Calls"
Cohesion: 0.29
Nodes (7): Version and Minimize localStorage Data, Cache Repeated Function Calls, How We Made the Vercel Dashboard Twice as Fast, Cache Storage API Calls, Hoist RegExp Creation, Build Index Maps for Repeated Lookups, Use Set/Map for O(1) Lookups

### Community 73 - "Prevent Hydration Mismatch Without Flickering"
Cohesion: 0.29
Nodes (7): localStorage, Prevent Hydration Mismatch Without Flickering, React hydration, Synchronous inline script, Server-side rendering, Suppress Expected Hydration Mismatches, suppressHydrationWarning

### Community 74 - "auth-policy.ts"
Cohesion: 0.48
Nodes (5): LoginFormInner(), AuthClientError, signInErrorMessage(), signInNetworkErrorMessage(), UNAVAILABLE_CODES

### Community 75 - "phase02-preflight.ts"
Cohesion: 0.33
Nodes (6): currentDirectory, main(), PreflightResult, PreflightRow, preflightSqlPath, runPhase02Preflight()

### Community 76 - "phase02-reconcile.ts"
Cohesion: 0.33
Nodes (6): currentDirectory, main(), ReconciliationResult, ReconciliationRow, reconciliationSqlPath, runPhase02Reconciliation()

### Community 77 - "phase03-workflows.integration.test.ts"
Cohesion: 0.38
Nodes (5): createDraftWithLines(), createIssuedInvoice(), createVariantFixture(), suffix(), testDatabaseUrl

### Community 78 - "Defer State Reads to Usage Point"
Cohesion: 0.33
Nodes (6): Defer State Reads to Usage Point, Deferred state reads, URLSearchParams, Effect dependencies, Event handler side effects, Put Interaction Logic in Event Handlers

### Community 79 - "Calculate Derived State During Rendering"
Cohesion: 0.33
Nodes (6): Calculate Derived State During Rendering, Render-time derived state, You Might Not Need an Effect, Do not wrap a simple expression with a primitive result type in useMemo, Primitive derived expression, useMemo overhead

### Community 80 - "ops/package.json"
Cohesion: 0.33
Nodes (5): engines, node, name, private, version

### Community 81 - "db/src/index.ts"
Cohesion: 0.60
Nodes (4): invoiceBalanceCents(), invoiceSubtotalCents(), lineTotalCents(), remainingToFulfill()

### Community 82 - "db/src/index.ts"
Cohesion: 0.60
Nodes (4): isFullyPaid(), remainingBalanceCents(), sumPaymentCents(), wouldOverpay()

### Community 83 - "Email and Password Authentication Guide"
Cohesion: 0.40
Nodes (5): Email and Password Authentication Guide, Email Verification, Password Hashing, Password Policy, Password Reset Flow

### Community 85 - "CAT-001"
Cohesion: 0.40
Nodes (5): CAT-001, COM-FND-002 Source Transcription Row Count, COM-FND-003 Source Numbering Completeness, COM-FND-005 Ambiguous Source Names, COM-FND-006 Source PDF Checksum

### Community 86 - "check-test-inventory.mjs"
Cohesion: 0.40
Nodes (3): ignoredDirectories, repositoryRoot, suites

### Community 87 - "Neon TypeScript SDK"
Cohesion: 0.67
Nodes (4): Neon SDK Ergonomic Client, Neon TypeScript SDK, Neon SDK Raw Client, Neon SDK Result Model

### Community 88 - "Semantic Component Styling"
Cohesion: 0.50
Nodes (4): Component Customization Order, Semantic CSS Token Theming, Semantic Component Styling, shadcn Utility Conventions

### Community 89 - "Preload Based on User Intent"
Cohesion: 0.50
Nodes (4): Preload Based on User Intent, Use Passive Event Listeners for Scrolling Performance, Defer Non-Critical Work with requestIdleCallback, Use Activity Component for Show/Hide

### Community 90 - "Avoid Layout Thrashing"
Cohesion: 0.50
Nodes (4): Avoid Layout Thrashing, CSS Triggers, Layout-Forcing Operations Gist, Animate SVG Wrapper Instead of SVG Element

### Community 91 - "Early Return from Functions"
Cohesion: 0.50
Nodes (4): Cache Property Access in Loops, Early Return from Functions, Early Length Check for Array Comparisons, Use toSorted() Instead of sort() for Immutability

### Community 92 - "Combine Multiple Array Iterations"
Cohesion: 0.50
Nodes (4): Combine Multiple Array Iterations, Use flatMap to Map and Filter in One Pass, Large Array Spread Limit Fiddle, Use Loop for Min/Max Instead of Sort

### Community 95 - "Inventory Boundary"
Cohesion: 0.50
Nodes (4): Inventory Boundary, Inventory and Finance Gate, INV-001, INV-002

### Community 96 - "Payment Boundary"
Cohesion: 0.50
Nodes (4): Payment Boundary, Payments Gate, PAY-002, PAY-003

### Community 97 - "COM-ADR-005 Separate Staging Domain"
Cohesion: 0.50
Nodes (4): Recommended Deployment Sequence, COM-ADR-005 Separate Staging Domain, Build and Deployment Gate, OPS-001

### Community 98 - "Accessibility and Performance Gate"
Cohesion: 0.50
Nodes (4): Accessibility and Performance Gate, A11Y-001, PERF-001, Third-Party Script Budget

### Community 100 - "sync-marketing.sh"
Cohesion: 0.83
Nodes (3): check_drift(), sync-marketing.sh script, sync_publish()

### Community 101 - "Configured Icon Library"
Cohesion: 0.67
Nodes (3): Component-Managed Icon Sizing, Configured Icon Library, Icons

### Community 102 - "Use SWR for Automatic Deduplication"
Cohesion: 0.67
Nodes (3): Deduplicate Global Event Listeners, SWR Documentation, Use SWR for Automatic Deduplication

### Community 103 - "Optimize SVG Precision"
Cohesion: 0.67
Nodes (3): Optimize SVG Precision, SVG coordinate precision, SVGO

### Community 104 - "Owner Operations Tool"
Cohesion: 0.67
Nodes (3): Accessible Operations UI, Operational Truth, Owner Operations Tool

### Community 106 - "Order and Invoice Boundary"
Cohesion: 0.67
Nodes (3): Order and Invoice Boundary, ORD-001, ORD-002

### Community 107 - "FIND-002"
Cohesion: 0.67
Nodes (3): CAT-006, FIND-002, Rule-Based Scent Finder

## Knowledge Gaps
- **589 isolated node(s):** `name`, `private`, `version`, `description`, `sync` (+584 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pool` connect `phase02-migrations.integration.test.ts` to `phase04-migrations.integration.test.ts`, `db/src/index.ts`, `phase02-preflight.ts`, `phase02-reconcile.ts`, `transactions.ts`, `migrate-through-auth-expansion.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `requireDisposableTestDatabaseUrl()` connect `requireDisposableTestDatabaseUrl` to `phase04-migrations.integration.test.ts`, `phase02-preflight.ts`, `phase02-reconcile.ts`, `phase03-workflows.integration.test.ts`, `phase02-migrations.integration.test.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `stock/page.tsx`, `utils.ts`, `adjust-stock-form.tsx`, `utils.ts`, `invoice-actions.tsx`, `variant-actions.tsx`, `app/layout.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _589 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `stock/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06916182170542635 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.07562008469449485 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._