// Labelore's own plain labels for GSD config keys, behind the settings page (quick-261114-42r, SET-01, sketch 065 variant A). A
// committed data table: each key a person might open this page to find has a short label in sentence case, shown over the mono key.
// Descriptions, types, defaults, allowed values and the sections keys sit in all come from the user's installed gsd-core (its
// planning-config.md and manifests, read on the server); Labelore keeps no copy of them. A key with no label here shows its key as
// its name. The table is data: retuning a label is an edit here and touches no logic.
//
// Nested objects are covered key by key wherever GSD enumerates the children (models.planning, dynamic_routing.tier_models.heavy);
// the parent is then never a leaf. Only a map whose child names GSD leaves open (an agent, a reviewer instance, a phase id, a
// runtime, a block section) is one leaf holding its value whole. This module is pure: no imports, no filesystem, no state.

export interface CatalogueKey {
  /** The dotted path of the key in config.json, matched exactly and case-sensitively. */
  key: string;
  /** A plain label, sentence case: what the setting controls. */
  label: string;
}

/** Where the labels were first written down, for the summary and any future freshness check. */
export const CATALOGUE_SOURCE = 'Labelore-written labels for gsd-core 1.11.0 keys';

export const SETTINGS_CATALOGUE: ReadonlyArray<CatalogueKey> = [
  // How work runs
  { key: 'mode', label: 'How much it asks' },
  { key: 'granularity', label: 'Plan detail' },
  { key: 'model_profile', label: 'Model profile' },
  { key: 'parallelization', label: 'Run plans in parallel' },
  { key: 'context_window', label: 'Context window' },
  { key: 'response_language', label: 'Reply language' },
  { key: 'context', label: 'Context profile' },
  { key: 'resolve_model_ids', label: 'Use full model IDs' },
  { key: 'model_overrides', label: 'Model per agent' },
  { key: 'agent_skills', label: 'Skills per agent' },
  { key: 'runtime', label: 'Runtime' },
  { key: 'effort.default', label: 'Default effort' },
  { key: 'fast_mode.enabled', label: 'Fast mode' },
  { key: 'model_policy.provider', label: 'Model policy: provider' },
  { key: 'model_policy.budget', label: 'Model policy: budget tier' },
  { key: 'model_policy.high', label: 'Model policy: high tier' },
  { key: 'model_policy.medium', label: 'Model policy: medium tier' },
  { key: 'model_policy.low', label: 'Model policy: low tier' },
  // Nested objects GSD 1.11.0 enumerates child by child: each child is its own row, never the parent.
  { key: 'models.planning', label: 'Model for planning' },
  { key: 'models.discuss', label: 'Model for discussion' },
  { key: 'models.research', label: 'Model for research' },
  { key: 'models.execution', label: 'Model for execution' },
  { key: 'models.verification', label: 'Model for verification' },
  { key: 'models.completion', label: 'Model for completion' },
  { key: 'granularities.planning', label: 'Plan detail for planning' },
  { key: 'granularities.discuss', label: 'Plan detail for discussion' },
  { key: 'granularities.research', label: 'Plan detail for research' },
  { key: 'granularities.execution', label: 'Plan detail for execution' },
  { key: 'granularities.verification', label: 'Plan detail for verification' },
  { key: 'granularities.completion', label: 'Plan detail for completion' },
  { key: 'dynamic_routing.enabled', label: 'Dynamic routing' },
  { key: 'dynamic_routing.escalate_on_failure', label: 'Escalate on failure' },
  { key: 'dynamic_routing.max_escalations', label: 'Escalation limit' },
  { key: 'dynamic_routing.provider_escalation', label: 'Escalate to another provider' },
  { key: 'dynamic_routing.tier_models.light', label: 'Routing model, light tier' },
  { key: 'dynamic_routing.tier_models.standard', label: 'Routing model, standard tier' },
  { key: 'dynamic_routing.tier_models.heavy', label: 'Routing model, heavy tier' },
  { key: 'effort.routing_tier_defaults.light', label: 'Effort, light tier' },
  { key: 'effort.routing_tier_defaults.standard', label: 'Effort, standard tier' },
  { key: 'effort.routing_tier_defaults.heavy', label: 'Effort, heavy tier' },
  { key: 'fast_mode.routing_tier_defaults.light', label: 'Fast mode, light tier' },
  { key: 'fast_mode.routing_tier_defaults.standard', label: 'Fast mode, standard tier' },
  { key: 'fast_mode.routing_tier_defaults.heavy', label: 'Fast mode, heavy tier' },
  // Maps whose next segment GSD leaves open (a runtime, an agent id): one row holding the object whole.
  { key: 'model_profile_overrides', label: 'Model profile per runtime' },
  { key: 'model_policy.runtime_tiers', label: 'Model tiers per runtime' },
  { key: 'effort.agent_overrides', label: 'Effort per agent' },
  { key: 'fast_mode.agent_overrides', label: 'Fast mode per agent' },
  // Planning steps
  { key: 'workflow.research', label: 'Research before planning' },
  { key: 'workflow.discuss_mode', label: 'Discussion style' },
  { key: 'workflow.skip_discuss', label: 'Skip the discussion' },
  { key: 'workflow.research_before_questions', label: 'Research before questions' },
  { key: 'workflow.plan_check', label: 'Check plans' },
  { key: 'workflow.pattern_mapper', label: 'Map patterns before planning' },
  { key: 'workflow.ui_phase', label: 'UI design contract' },
  { key: 'workflow.ai_integration_phase', label: 'AI integration step' },
  { key: 'workflow.plan_chunked', label: 'Plan in chunks' },
  { key: 'workflow.post_planning_gaps', label: 'Gap report after planning' },
  { key: 'workflow.mvp_mode', label: 'MVP framing' },
  { key: 'phase_naming', label: 'Phase numbering' },
  { key: 'project_code', label: 'Phase folder prefix' },
  { key: 'phase_id_convention', label: 'Phase ID format' },
  { key: 'planning.commit_docs', label: 'Commit planning docs' },
  { key: 'planning.search_gitignored', label: 'Search ignored planning files' },
  { key: 'planning.sub_repos', label: 'Sub-repositories' },
  { key: 'workflow.max_discuss_passes', label: 'Discussion passes' },
  { key: 'workflow.plan_review_convergence', label: 'Converge plan reviews' },
  { key: 'workflow.specless_probe_fallback', label: 'Probe when there is no spec' },
  // Running plans
  { key: 'workflow.auto_advance', label: 'Move to the next phase on its own' },
  { key: 'workflow.node_repair', label: 'Repair failed tasks' },
  { key: 'workflow.node_repair_budget', label: 'Repair attempts' },
  { key: 'workflow.use_worktrees', label: 'Run in worktrees' },
  { key: 'workflow.context_guard_mode', label: 'Context guard' },
  { key: 'workflow.inline_plan_threshold', label: 'Run small plans inline' },
  { key: 'workflow.subagent_timeout', label: 'Agent timeout (ms)' },
  { key: 'workflow.text_mode', label: 'Plain-text menus' },
  { key: 'workflow.auto_prune_state', label: 'Prune old STATE entries' },
  { key: 'workflow.test_command', label: 'Test command' },
  { key: 'workflow.build_command', label: 'Build command' },
  { key: 'workflow.test_gate_timeout', label: 'Test gate timeout' },
  { key: 'workflow.smart_zone_tokens', label: 'Smart zone (tokens)' },
  { key: 'workflow.worktree_skip_hooks', label: 'Skip hooks in worktrees' },
  { key: 'workflow.agent_hint_routing', label: 'Route by agent hints' },
  { key: 'workflow.cross_ai_execution', label: 'Cross-AI execution' },
  { key: 'workflow.cross_ai_command', label: 'Cross-AI command' },
  { key: 'workflow.cross_ai_timeout', label: 'Cross-AI timeout' },
  { key: 'executor.stall_detect_interval_minutes', label: 'Executor stall check (minutes)' },
  { key: 'executor.stall_threshold_minutes', label: 'Executor stalls after (minutes)' },
  { key: 'planner.stall_detect_interval_minutes', label: 'Planner stall check (minutes)' },
  { key: 'planner.stall_threshold_minutes', label: 'Planner stalls after (minutes)' },
  { key: 'workflow._auto_chain_active', label: 'Auto-advance chain running' },
  // Reviews and checks
  { key: 'workflow.verifier', label: 'Verify after running' },
  { key: 'workflow.nyquist_validation', label: 'Validation strategy' },
  { key: 'workflow.human_verify_mode', label: 'When people verify' },
  { key: 'workflow.ui_safety_gate', label: 'UI safety gate' },
  { key: 'workflow.code_review', label: 'Code review' },
  { key: 'workflow.code_review_depth', label: 'Review depth' },
  { key: 'workflow.code_review_command', label: 'Outside review command' },
  { key: 'workflow.security_enforcement', label: 'Security checks' },
  { key: 'workflow.security_asvs_level', label: 'ASVS level' },
  { key: 'workflow.security_block_on', label: 'Blocks on' },
  { key: 'workflow.plan_bounce', label: 'Plan bounce' },
  { key: 'workflow.plan_bounce_script', label: 'Plan bounce script' },
  { key: 'workflow.plan_bounce_passes', label: 'Plan bounce passes' },
  { key: 'plan_review.source_grounding', label: 'Ground plan reviews in source' },
  { key: 'plan_review.source_grounding_authority', label: 'Source grounding method' },
  { key: 'workflow.context_coverage_gate', label: 'Context coverage gate' },
  { key: 'review.default_reviewers', label: 'Default reviewers' },
  { key: 'review.max_prompt_tokens', label: 'Review prompt limit (tokens)' },
  { key: 'review.max_prompt_tokens_per_reviewer', label: 'Review prompt limit per reviewer' },
  { key: 'code_quality.fallow.enabled', label: 'Fallow code scan' },
  { key: 'code_quality.fallow.scope', label: 'Fallow scope' },
  { key: 'code_quality.fallow.profile', label: 'Fallow profile' },
  { key: 'code_quality.fallow.mcp', label: 'Fallow through MCP' },
  { key: 'security.injection_blocking', label: 'Block prompt injection' },
  { key: 'review.reviewer_instances', label: 'Reviewer instances' },
  // Git and branches
  { key: 'commit_docs', label: 'Commit planning files' },
  { key: 'search_gitignored', label: 'Search ignored files' },
  { key: 'git.branching_strategy', label: 'Branching' },
  { key: 'git.base_branch', label: 'Base branch' },
  { key: 'git.create_tag', label: 'Tag milestones' },
  { key: 'git.phase_branch_template', label: 'Phase branch name' },
  { key: 'git.milestone_branch_template', label: 'Milestone branch name' },
  { key: 'git.quick_branch_template', label: 'Quick-task branch name' },
  { key: 'git.allow_default_branch_commits', label: 'Commit to the default branch' },
  { key: 'ship.pr_body_sections', label: 'Extra PR sections' },
  { key: 'phase_commit_docs', label: 'Commit planning files per phase' },
  // Research tools
  { key: 'brave_search', label: 'Brave search' },
  { key: 'firecrawl', label: 'Firecrawl' },
  { key: 'exa_search', label: 'Exa search' },
  { key: 'tavily_search', label: 'Tavily' },
  { key: 'ref_search', label: 'Ref' },
  { key: 'perplexity', label: 'Perplexity' },
  { key: 'jina', label: 'Jina' },
  { key: 'graphify.build_timeout', label: 'Graph build timeout' },
  { key: 'graphify.auto_update', label: 'Update the graph on its own' },
  { key: 'graphify.graph_path', label: 'Graph file path' },
  // Hooks and extras
  { key: 'hooks.context_warnings', label: 'Context warnings' },
  { key: 'hooks.context_warning_threshold', label: 'Warn at (% left)' },
  { key: 'hooks.context_critical_threshold', label: 'Critical at (% left)' },
  { key: 'features.thinking_partner', label: 'Thinking partner' },
  { key: 'features.global_learnings', label: 'Global learnings' },
  { key: 'learnings.max_inject', label: 'Learnings per session' },
  { key: 'intel.enabled', label: 'Codebase intel' },
  { key: 'manager.flags.discuss', label: 'Manager: discuss flags' },
  { key: 'claude_md_path', label: 'CLAUDE.md path' },
  { key: 'claude_md_assembly.mode', label: 'CLAUDE.md assembly' },
  { key: 'claude_md_assembly.blocks', label: 'CLAUDE.md sections' },
  { key: 'hooks.workflow_guard', label: 'Workflow guard' },
  { key: 'statusline.show_last_command', label: 'Status line: last command' },
  { key: 'statusline.context_position', label: 'Status line: context position' },
  { key: 'statusline.show_context_tokens', label: 'Status line: context tokens' },
  { key: 'statusline.state_format', label: 'Status line: state format' },
  { key: 'statusline.show_git', label: 'Status line: git' },
  { key: 'manager.flags.plan', label: 'Manager: plan flags' },
  { key: 'manager.flags.execute', label: 'Manager: execute flags' },
  { key: 'capabilities.strict_known_registries', label: 'Strict known registries' },
  { key: 'capabilities.auto_update', label: 'Update capabilities on their own' },
  { key: 'agent_skills_security.trusted_global_roots', label: 'Trusted global skill roots' },
];

// ---------------------------------------------------------------------------------------------------------
// Where keys sit on the reference page (quick-261114-42r, sketch 065 A). GSD's own sections are the page's sections; this is the
// Labelore side of that: the order they appear in, the names that differ from GSD's headings, and the homes for keys GSD's schema
// accepts but its reference has no table for.
// ---------------------------------------------------------------------------------------------------------

/** The sections in the order the page lists them, by GSD's heading name (a section absent from the reference is skipped; a section
 * GSD adds that is not named here sits just before Advanced). Gates and Reviews are Labelore's homes for namespaces GSD's
 * reference has no table for. */
export const SETTINGS_SECTION_ORDER: ReadonlyArray<string> = [
  'Core',
  'Workflow',
  'Planner',
  'Ship',
  'Git',
  'Search & API',
  'Features',
  'Hook',
  'Gates',
  'Reviews',
  'Learnings',
  'Intel',
  'Manager',
  'Planning',
  'Advanced',
];

/** The display name where it differs from GSD's heading. */
export const SETTINGS_SECTION_NAMES: Readonly<Record<string, string>> = { Hook: 'Hooks' };

/** The home section of a key GSD's reference does not describe, by its top-level key or namespace. */
export const UNDOCUMENTED_HOMES: Readonly<Record<string, string>> = {
  tavily_search: 'Search & API',
  ref_search: 'Search & API',
  perplexity: 'Search & API',
  jina: 'Search & API',
  gates: 'Gates',
  review: 'Reviews',
  plan_review: 'Reviews',
};
