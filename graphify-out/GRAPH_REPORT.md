# Graph Report - .  (2026-07-25)

## Corpus Check
- 336 files · ~187,236 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1482 nodes · 3389 edges · 111 communities (84 shown, 27 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 86 edges (avg confidence: 0.86)
- Token cost: 635,542 input · 64,278 output

## Community Hubs (Navigation)
- Dashboard Empty Stock
- Action Validators Invoice
- Sidebar Sheet Menu
- Dialog Alert Actions
- React Hugeicons Css
- Password Field Form
- Docs Operations Marketing
- Phase02 Drizzle Migrate
- Form Stock Card
- Tsconfig Module Next
- Inventory Stock Enum
- Product Workflows Variant
- Check Marketing Integration
- Tsconfig Module Modules
- Tsconfig Module Drizzle
- Transactions Domain Errors
- React Perfume Aura
- Eslint Tailwindcss React
- Menu Color Css
- Menu Color Css
- Composition Agents Skills
- React Best Practices
- Auth Session Relations
- Migrations Integration Phase02
- Mail Reset Environment
- Business Time Date
- Owner Maintenance Seed
- Invoice Workflows Transaction
- Payment Workflows Invoice
- Tsconfig Validators Module
- Shadcn Agents Skills
- Readme Scripts And
- Migrations Phase04 Integration
- Validators Dependencies Zod
- Agents Skills Vercel
- Integration Database Auth
- Inventory Math Delta
- Auth Expansion Migrate
- Radix Base Agents
- React Agents Skills
- Neon Agents Skills
- Agents Deployment Path
- Owner Scripts Build
- Scripts Runtime Deps
- Auth Better Agents
- React Agents Skills
- React Agents Skills
- React Agents Skills
- Tooltip Layout Ibm
- Auth Policy Return
- Marketing Description Name
- Health Live Ready
- Pack Standalone Scripts
- Registry Shadcn Agents
- Security Headers Next
- Shadcn Agents Skills
- Vercel Agents Skills
- Hydration React Rendering
- Auth Login Error
- Number Counters Numbers
- Preflight Phase02 Current
- Phase02 Reconcile Reconciliation
- Phase03 Workflows Integration
- Agents Skills Vercel
- Derived Agents Skills
- Secret Auth Environment
- Engines Node Name
- Invoice Math Cents
- Payment Math Cents
- Password Email And
- Source Auth Contract
- Check Inventory Mjs
- Neon Sdk Agents
- Shadcn Agents Skills
- Agents Skills Vercel
- Agents Skills Vercel
- Agents Skills Vercel
- Agents Skills Vercel
- Phase03 Action Contract
- Phase05 Contract Current
- Phase02 Contract Design
- Sync Marketing Scripts
- Icons Agents Skills
- Swr Agents Skills
- Svg Precision Agents
- Product Operations Accessible
- Proxy Config
- Agents Skills Shadcn
- State Decouple Agents
- Cache React Request
- Rsc Agents Skills
- Static Agents Skills
- Parallel Fetching Agents
- Eslint Config Mjs
- Next Env Note
- Next System
- System Flow
- Nodemailer System
- Config Postcss Mjs
- Html Perfume Aura
- Pnpm Workspace Yaml
- Shadcn Logo Agents
- Shadcn Logo Mark
- Composition Guidelines Agents
- Conditional Rendering Explicit
- Ref Transient Values
- After Non Blocking
- Server Actions Authenticated
- Sign Out Session

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
- `ForgotPasswordForm()` --calls--> `buttonVariants`  [EXTRACTED]
  apps/ops/app/(auth)/forgot-password/forgot-password-form.tsx → packages/ui/src/components/button.tsx
- `ForgotPasswordForm()` --calls--> `cn()`  [EXTRACTED]
  apps/ops/app/(auth)/forgot-password/forgot-password-form.tsx → packages/ui/src/lib/utils.ts
- `ResetPasswordFormInner()` --calls--> `buttonVariants`  [EXTRACTED]
  apps/ops/app/(auth)/reset-password/reset-password-form.tsx → packages/ui/src/components/button.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
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

## Communities (111 total, 27 thin omitted)

### Community 0 - "Dashboard Empty Stock"
Cohesion: 0.07
Nodes (100): CustomerDetailPage(), NewCustomerPage(), CustomersPage(), parseStatus(), SearchParams, DashboardPage(), FinancePage(), SearchParams (+92 more)

### Community 1 - "Action Validators Invoice"
Cohesion: 0.05
Nodes (86): InvoiceStatusActions(), actionError(), actionOk(), ActionResult, zodFieldErrors(), archiveCustomerAction(), createCustomerAction(), CustomerDetail (+78 more)

### Community 2 - "Sidebar Sheet Menu"
Cohesion: 0.08
Nodes (46): AppSidebar(), inventoryNav, isActive(), salesNav, CardAction(), NativeSelectOptGroup(), Separator(), Sheet() (+38 more)

### Community 3 - "Dialog Alert Actions"
Cohesion: 0.11
Nodes (35): ArchiveCustomerButton(), ActionResponse, InvoiceActionConfig, RemoveLineButton(), ProductEditDialog(), Props, ProductLifecycleActions(), Props (+27 more)

### Community 4 - "React Hugeicons Css"
Cohesion: 0.04
Nodes (45): @base-ui/react, class-variance-authority, clsx, next-themes, dependencies, @base-ui/react, class-variance-authority, clsx (+37 more)

### Community 5 - "Password Field Form"
Cohesion: 0.09
Nodes (26): ForgotPasswordForm(), metadata, LoginForm(), metadata, metadata, ResetPasswordForm(), ResetPasswordFormInner(), ChangePasswordForm() (+18 more)

### Community 6 - "Docs Operations Marketing"
Cohesion: 0.06
Nodes (39): PostgreSQL 16 Integration Job, Verified Hostinger ZIP Job, Path B Release Gate, Quality Job, Standalone Ops Artifact, Coming Soon Page, Google Fonts, Marketing Stylesheet (+31 more)

### Community 7 - "Phase02 Drizzle Migrate"
Cohesion: 0.05
Nodes (38): drizzle-kit, dependencies, drizzle-orm, pg, devDependencies, dotenv, drizzle-kit, tsx (+30 more)

### Community 8 - "Form Stock Card"
Cohesion: 0.20
Nodes (26): metadata, SecuritySettingsPage(), Props, FormField(), TextAreaField(), AddInvoiceLineForm(), CreateInvoiceForm(), RecordPaymentForm() (+18 more)

### Community 9 - "Tsconfig Module Next"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+21 more)

### Community 10 - "Inventory Stock Enum"
Cohesion: 0.15
Nodes (21): ApplyMovementInput, ApplyMovementResult, existingMovementMatches(), InventoryErrorCode, optionalValue(), StockMovementType, customers, customerStatusEnum (+13 more)

### Community 11 - "Product Workflows Variant"
Cohesion: 0.17
Nodes (25): FinanceSummary, FinanceSnapshot, getFinanceSnapshot(), applyMovement(), archiveProduct(), archiveProductVariant(), assertCurrentProduct(), assertCurrentVariant() (+17 more)

### Community 12 - "Check Marketing Integration"
Cohesion: 0.08
Nodes (25): description, engines, node, name, packageManager, private, scripts, build:ops (+17 more)

### Community 13 - "Tsconfig Module Modules"
Cohesion: 0.08
Nodes (25): compilerOptions, allowJs, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+17 more)

### Community 14 - "Tsconfig Module Drizzle"
Cohesion: 0.08
Nodes (24): compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, isolatedModules, lib, module (+16 more)

### Community 15 - "Transactions Domain Errors"
Cohesion: 0.13
Nodes (15): Database, db, DomainError, DomainErrorCode, domainErrorCodes, InventoryError, runSeed(), seedMainLocation() (+7 more)

### Community 16 - "React Perfume Aura"
Cohesion: 0.09
Nodes (23): dependencies, better-auth, drizzle-orm, @hugeicons/core-free-icons, @hugeicons/react, nodemailer, @perfume-aura/db, @perfume-aura/ui (+15 more)

### Community 17 - "Eslint Tailwindcss React"
Cohesion: 0.09
Nodes (23): devDependencies, dotenv, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+15 more)

### Community 18 - "Menu Color Css"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 19 - "Menu Color Css"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 20 - "Composition Agents Skills"
Cohesion: 0.15
Nodes (21): Chat UI Primitives, Message Component Composition, MessageScroller Behavior, Accessible Overlay Composition, Component Structure Contracts, InputGroup Composition, Composition over Configuration, Provider State Boundary (+13 more)

### Community 21 - "React Best Practices"
Cohesion: 0.23
Nodes (20): React Best Practices Compiled Guide, React Best Practices Repository Guide, Do Not Put Effect Events in Dependency Arrays, Store Event Handlers in Refs, Initialize App Once, Not Per Mount, useEffectEvent for Stable Callback Refs, Prevent Waterfall Chains in API Routes, Check Cheap Conditions Before Async Flags (+12 more)

### Community 22 - "Auth Session Relations"
Cohesion: 0.14
Nodes (17): { GET, POST }, auth, AuthDependencies, baseURL, createAuth(), defaultAuthDependencies, resolveAuthSecret, Session (+9 more)

### Community 23 - "Migrations Integration Phase02"
Cohesion: 0.14
Nodes (15): pool, configuredAdminUrl, currentDirectory, databaseUrl(), dropDatabase(), expectedPhase02Indexes, expectedReconciliationCheckNames, IdRow (+7 more)

### Community 24 - "Mail Reset Environment"
Cohesion: 0.17
Nodes (14): AuthEnvironment, buildPasswordResetMessage(), escapeHtml(), MailConfigurationError, MailDeliveryError, MailEnvironment, MailTransport, MailTransportFactory (+6 more)

### Community 25 - "Business Time Date"
Cohesion: 0.27
Nodes (16): businessDateAt(), businessMonthBounds(), businessPeriodBounds(), businessYearAt(), DateTimeParts, formatter(), formatterCache, hasValidCalendarFields() (+8 more)

### Community 26 - "Owner Maintenance Seed"
Cohesion: 0.20
Nodes (13): ensureOwnerAccount(), findCredentialAccountsForUpdate(), findOwnerUserForUpdate(), lockOwnerIdentity(), normalizedOwnerInput(), OwnerInput, ownerInputSchema, OwnerRecoveryResult (+5 more)

### Community 27 - "Invoice Workflows Transaction"
Cohesion: 0.36
Nodes (15): allocateDocumentNumberInTransaction(), applyMovementInTransaction(), addInvoiceLine(), authoritativeSubtotal(), createInvoiceDraft(), fulfillInvoice(), InvoiceLineRow, InvoiceRow (+7 more)

### Community 28 - "Payment Workflows Invoice"
Cohesion: 0.23
Nodes (15): InvoiceRow, lockInvoice(), lockPayments(), mapPaymentConstraint(), PaymentMethod, PaymentOperationInput, PaymentOperationResult, PaymentRow (+7 more)

### Community 29 - "Tsconfig Validators Module"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck (+7 more)

### Community 30 - "Shadcn Agents Skills"
Cohesion: 0.14
Nodes (15): shadcn/ui Agent Interface, CLI Dry-Run Workflow, Preset Switching Modes, shadcn Project Info, shadcn CLI Reference, Customization and Theming, MCP Project Configuration Boundary, Base vs Radix (+7 more)

### Community 31 - "Readme Scripts And"
Cohesion: 0.14
Nodes (15): applyMovement(), Disposable loopback PostgreSQL test database, Ledger-first inventory, Ordered auth expansion and financial inventory contract, Neon Postgres, @perfume-aura/db, node-postgres Pool interactive transactions, Single drizzle-orm instance (+7 more)

### Community 32 - "Migrations Phase04 Integration"
Cohesion: 0.16
Nodes (8): configuredAdminUrl, currentDirectory, databaseUrl(), dropDatabase(), IdRow, migrationsFolder, quotedDatabase(), recreateDatabase()

### Community 33 - "Validators Dependencies Zod"
Cohesion: 0.14
Nodes (13): dependencies, zod, devDependencies, typescript, exports, typescript, zod, name (+5 more)

### Community 34 - "Agents Skills Vercel"
Cohesion: 0.15
Nodes (13): contain-intrinsic-size, CSS content-visibility, CSS content-visibility for Long Lists, Transition pending state, Use useTransition Over Manual Loading States, useTransition, Non-urgent updates, startTransition (+5 more)

### Community 35 - "Integration Database Auth"
Cohesion: 0.22
Nodes (5): testDatabaseUrl, connectionString, testDatabaseUrl, LOOPBACK_HOSTS, requireDisposableTestDatabaseUrl()

### Community 36 - "Inventory Math Delta"
Cohesion: 0.26
Nodes (10): assertNonZeroInt(), assertPositiveInt(), availableQuantity(), canSell(), InventoryMathError, MovementTypeForDelta, quantityAfterDelta(), ResolveDeltaInput (+2 more)

### Community 37 - "Auth Expansion Migrate"
Cohesion: 0.19
Nodes (12): AuthExpansionMigrationEvidence, currentDirectory, DatabaseMigrationState, DeployedMigration, ExpectedMigration, Journal, JournalEntry, migrateThroughAuthExpansion() (+4 more)

### Community 38 - "Radix Base Agents"
Cohesion: 0.20
Nodes (12): Class String Rewrites, Consumer Prop Changes, Disclosure and Toggle Mapping, Display and Miscellaneous Mapping, Form Control Mapping, Menu Family Mapping, Overlay Mapping, Golden Pair Migration Strategy (+4 more)

### Community 39 - "React Agents Skills"
Cohesion: 0.17
Nodes (12): preconnect, prefetchDNS, preinit, preinitModule, preload, preloadModule, React DOM Resource Hints, Use React DOM Resource Hints (+4 more)

### Community 40 - "Neon Agents Skills"
Cohesion: 0.20
Nodes (11): Neon Branch Type Decision, Neon Postgres Branching, Normal Neon Branch, Reset Neon Branch from Parent, Schema-Only Neon Branch, Neon Connection Pooling, Neon Serverless Postgres, Branch-First Development Flow (+3 more)

### Community 41 - "Agents Deployment Path"
Cohesion: 0.22
Nodes (11): Runtime-Aware Postgres Driver Selection, Hostinger DNS Path A, Hostinger Dual Deployment Architecture, Neon Production Cutover, Path G Ops Deployment, Path M Marketing Deployment, Path Z Ops Deployment, SEC-7 Marketing Source Protection (+3 more)

### Community 42 - "Owner Scripts Build"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, recover:owner, seed:owner, start, test (+3 more)

### Community 43 - "Scripts Runtime Deps"
Cohesion: 0.18
Nodes (10): dependencies, sharp, description, engines, node, npm, name, private (+2 more)

### Community 44 - "Auth Better Agents"
Cohesion: 0.20
Nodes (10): Better Auth Integration Guide, Better Auth Database Adapters, Better Auth Session Management, Better Auth Setup Workflow, Better Auth Security Guide, CSRF Protection, Auth Rate Limiting, Auth Secret Management (+2 more)

### Community 45 - "React Agents Skills"
Cohesion: 0.20
Nodes (10): Hoist Static JSX Elements, React Compiler, Static JSX hoisting, Lazy state initialization, Use Lazy State Initialization, useState, Extract to Memoized Components, Memoized component extraction (+2 more)

### Community 46 - "React Agents Skills"
Cohesion: 0.20
Nodes (10): Derived boolean dependency, Effect dependency narrowing, Narrow Effect Dependencies, Derived state subscription, Subscribe to Derived State, useMediaQuery, Hook dependencies, React Compiler (+2 more)

### Community 47 - "React Agents Skills"
Cohesion: 0.20
Nodes (10): Functional setState, React Compiler, Stable callbacks, Use Functional setState Updates, Extract Default Non-primitive Parameter Value from Memoized Component to Constant, React memo, Stable default value, Component remount (+2 more)

### Community 48 - "Tooltip Layout Ibm"
Cohesion: 0.22
Nodes (8): ibmPlexSans, metadata, ralewayHeading, RootLayout(), Toaster(), Tooltip(), TooltipProvider(), TooltipTrigger()

### Community 49 - "Auth Policy Return"
Cohesion: 0.38
Nodes (8): ALLOWED_RETURN_PATH_PREFIXES, DEVELOPMENT_AUTH_ORIGINS, hasUnsafeReturnPathRepresentation(), isAllowlistedReturnPath(), parseOrigin(), resolveAuthBaseUrl(), resolveAuthTrustedOrigins(), safeReturnPath()

### Community 50 - "Marketing Description Name"
Cohesion: 0.22
Nodes (8): description, name, private, scripts, build, check, sync, version

### Community 51 - "Health Live Ready"
Cohesion: 0.39
Nodes (5): GET(), GET(), HEALTH_HEADERS, livenessResponse(), readinessResponse()

### Community 52 - "Pack Standalone Scripts"
Cohesion: 0.36
Nodes (6): copy_real(), copy_sharp_into(), refuse_existing_outputs(), pack-ops-standalone.sh script, smoke_package_versions(), smoke_sharp_tree()

### Community 53 - "Registry Shadcn Agents"
Cohesion: 0.29
Nodes (8): Registry Build Command, MCP Registry Operation Tools, shadcn MCP Server, Immutable GitHub Registry Snapshot, Registry Address Schemes, Registry Authoring and Addresses, Registry Dependencies, Source and Built Registry Forms

### Community 54 - "Security Headers Next"
Cohesion: 0.39
Nodes (5): contentSecurityPolicy(), SecurityHeaderOptions, securityHeaders(), monorepoRoot, nextConfig

### Community 55 - "Shadcn Agents Skills"
Cohesion: 0.33
Nodes (7): shadcn Component Composition, Official shadcn CLI Workflow, shadcn Preset Workflow, shadcn UI Guide, Official Tooling Only Policy, Perfume Aura Repository Policy, shadcn Monorepo Workflow

### Community 56 - "Vercel Agents Skills"
Cohesion: 0.29
Nodes (7): Version and Minimize localStorage Data, Cache Repeated Function Calls, How We Made the Vercel Dashboard Twice as Fast, Cache Storage API Calls, Hoist RegExp Creation, Build Index Maps for Repeated Lookups, Use Set/Map for O(1) Lookups

### Community 57 - "Hydration React Rendering"
Cohesion: 0.29
Nodes (7): localStorage, Prevent Hydration Mismatch Without Flickering, React hydration, Synchronous inline script, Server-side rendering, Suppress Expected Hydration Mismatches, suppressHydrationWarning

### Community 58 - "Auth Login Error"
Cohesion: 0.48
Nodes (5): LoginFormInner(), AuthClientError, signInErrorMessage(), signInNetworkErrorMessage(), UNAVAILABLE_CODES

### Community 59 - "Number Counters Numbers"
Cohesion: 0.33
Nodes (5): BUSINESS_TIMEZONE, prefixes, documentNumberCounters, DocumentNumberKind, documentNumberKinds

### Community 60 - "Preflight Phase02 Current"
Cohesion: 0.33
Nodes (6): currentDirectory, main(), PreflightResult, PreflightRow, preflightSqlPath, runPhase02Preflight()

### Community 61 - "Phase02 Reconcile Reconciliation"
Cohesion: 0.33
Nodes (6): currentDirectory, main(), ReconciliationResult, ReconciliationRow, reconciliationSqlPath, runPhase02Reconciliation()

### Community 62 - "Phase03 Workflows Integration"
Cohesion: 0.38
Nodes (5): createDraftWithLines(), createIssuedInvoice(), createVariantFixture(), suffix(), testDatabaseUrl

### Community 63 - "Agents Skills Vercel"
Cohesion: 0.33
Nodes (6): Defer State Reads to Usage Point, Deferred state reads, URLSearchParams, Effect dependencies, Event handler side effects, Put Interaction Logic in Event Handlers

### Community 64 - "Derived Agents Skills"
Cohesion: 0.33
Nodes (6): Calculate Derived State During Rendering, Render-time derived state, You Might Not Need an Effect, Do not wrap a simple expression with a primitive result type in useMemo, Primitive derived expression, useMemo overhead

### Community 65 - "Secret Auth Environment"
Cohesion: 0.47
Nodes (4): AuthSecretEnvironment, createAuthSecretResolver(), GenerateSecret, isProductionBuild()

### Community 66 - "Engines Node Name"
Cohesion: 0.33
Nodes (5): engines, node, name, private, version

### Community 67 - "Invoice Math Cents"
Cohesion: 0.60
Nodes (4): invoiceBalanceCents(), invoiceSubtotalCents(), lineTotalCents(), remainingToFulfill()

### Community 68 - "Payment Math Cents"
Cohesion: 0.60
Nodes (4): isFullyPaid(), remainingBalanceCents(), sumPaymentCents(), wouldOverpay()

### Community 69 - "Password Email And"
Cohesion: 0.40
Nodes (5): Email and Password Authentication Guide, Email Verification, Password Hashing, Password Policy, Password Reset Flow

### Community 71 - "Check Inventory Mjs"
Cohesion: 0.40
Nodes (3): ignoredDirectories, repositoryRoot, suites

### Community 72 - "Neon Sdk Agents"
Cohesion: 0.67
Nodes (4): Neon SDK Ergonomic Client, Neon TypeScript SDK, Neon SDK Raw Client, Neon SDK Result Model

### Community 73 - "Shadcn Agents Skills"
Cohesion: 0.50
Nodes (4): Component Customization Order, Semantic CSS Token Theming, Semantic Component Styling, shadcn Utility Conventions

### Community 74 - "Agents Skills Vercel"
Cohesion: 0.50
Nodes (4): Preload Based on User Intent, Use Passive Event Listeners for Scrolling Performance, Defer Non-Critical Work with requestIdleCallback, Use Activity Component for Show/Hide

### Community 75 - "Agents Skills Vercel"
Cohesion: 0.50
Nodes (4): Avoid Layout Thrashing, CSS Triggers, Layout-Forcing Operations Gist, Animate SVG Wrapper Instead of SVG Element

### Community 76 - "Agents Skills Vercel"
Cohesion: 0.50
Nodes (4): Cache Property Access in Loops, Early Return from Functions, Early Length Check for Array Comparisons, Use toSorted() Instead of sort() for Immutability

### Community 77 - "Agents Skills Vercel"
Cohesion: 0.50
Nodes (4): Combine Multiple Array Iterations, Use flatMap to Map and Filter in One Pass, Large Array Spread Limit Fiddle, Use Loop for Min/Max Instead of Sort

### Community 81 - "Sync Marketing Scripts"
Cohesion: 0.83
Nodes (3): check_drift(), sync-marketing.sh script, sync_publish()

### Community 82 - "Icons Agents Skills"
Cohesion: 0.67
Nodes (3): Component-Managed Icon Sizing, Configured Icon Library, Icons

### Community 83 - "Swr Agents Skills"
Cohesion: 0.67
Nodes (3): Deduplicate Global Event Listeners, SWR Documentation, Use SWR for Automatic Deduplication

### Community 84 - "Svg Precision Agents"
Cohesion: 0.67
Nodes (3): Optimize SVG Precision, SVG coordinate precision, SVGO

### Community 85 - "Product Operations Accessible"
Cohesion: 0.67
Nodes (3): Accessible Operations UI, Operational Truth, Owner Operations Tool

## Knowledge Gaps
- **489 isolated node(s):** `name`, `private`, `version`, `description`, `sync` (+484 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pool` connect `Migrations Integration Phase02` to `Migrations Phase04 Integration`, `Auth Expansion Migrate`, `Product Workflows Variant`, `Transactions Domain Errors`, `Preflight Phase02 Current`, `Phase02 Reconcile Reconciliation`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `cn()` connect `Sidebar Sheet Menu` to `Dashboard Empty Stock`, `Dialog Alert Actions`, `Password Field Form`, `Form Stock Card`, `Tooltip Layout Ibm`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `requireOwnerSession()` connect `Dashboard Empty Stock` to `Form Stock Card`, `Action Validators Invoice`, `Product Workflows Variant`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _489 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard Empty Stock` be split into smaller, more focused modules?**
  _Cohesion score 0.06550467076782866 - nodes in this community are weakly interconnected._
- **Should `Action Validators Invoice` be split into smaller, more focused modules?**
  _Cohesion score 0.051756785188302123 - nodes in this community are weakly interconnected._
- **Should `Sidebar Sheet Menu` be split into smaller, more focused modules?**
  _Cohesion score 0.08148148148148149 - nodes in this community are weakly interconnected._