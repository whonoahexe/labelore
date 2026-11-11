// The curated GSD key catalogue behind the settings page (Phase 12, 12-03, SET-01, D-10): a committed data table, hand-copied from
// gsd-core 1.11.0 (Labelore has no runtime dependency on gsd-core). Every known key has a plain label and one of seven groups, and
// carries `options` only where GSD documents a closed set of values. The options are catalogue data used to draw a scale of the
// allowed values; they never mark, imply or supply a default. A key the file does not set reads "not set" on the page, never a value.
// The table is data: retuning a label or a group is an edit here and touches no logic.
//
// Nested objects are covered key by key wherever GSD enumerates the children (models.planning, dynamic_routing.tier_models.heavy);
// the parent is then never a leaf. Only a map whose child names GSD leaves open (an agent, a reviewer instance, a phase id, a
// runtime, a block section) is one leaf holding its value whole. This module is pure: no imports, no filesystem, no state.

/** The seven groups a key belongs to; the id is stable, the name is the page's working name. */
export type SettingsGroupId = 'run' | 'plan' | 'exec' | 'check' | 'git' | 'tools' | 'extra';

export interface SettingsGroup {
  id: SettingsGroupId;
  name: string;
}

export interface CatalogueKey {
  /** The dotted path of the key in config.json, matched exactly and case-sensitively. */
  key: string;
  /** A plain label, sentence case: what the setting controls. */
  label: string;
  group: SettingsGroupId;
  /** The documented closed set of values, only where GSD documents one. Never a default. */
  options?: ReadonlyArray<string | number>;
}

/** A family of keys whose last segment is open (`features.<name>`): matched by prefix, shown as set in the group. */
export interface SettingsPattern {
  /** Ends with a dot; matches a key one segment below it. */
  prefix: string;
  group: SettingsGroupId;
  /** Names the kind of key; the page appends the key's own segment. */
  label: string;
}

/** Where the table came from, for the summary and any future freshness check. */
export const CATALOGUE_SOURCE = 'gsd-core 1.11.0, hand-copied';

export const SETTINGS_GROUPS: ReadonlyArray<SettingsGroup> = [
  { id: 'run', name: 'How work runs' },
  { id: 'plan', name: 'Planning steps' },
  { id: 'exec', name: 'Running plans' },
  { id: 'check', name: 'Reviews and checks' },
  { id: 'git', name: 'Git and branches' },
  { id: 'tools', name: 'Research tools' },
  { id: 'extra', name: 'Hooks and extras' },
];

export const SETTINGS_PATTERNS: ReadonlyArray<SettingsPattern> = [
  { prefix: 'features.', group: 'extra', label: 'Feature flag' },
];

export const SETTINGS_CATALOGUE: ReadonlyArray<CatalogueKey> = [
  // How work runs
  { key: 'mode', label: 'How much it asks', group: 'run', options: ['interactive', 'yolo'] },
  { key: 'granularity', label: 'Plan detail', group: 'run', options: ['coarse', 'standard', 'fine'] },
  { key: 'model_profile', label: 'Model profile', group: 'run', options: ['quality', 'balanced', 'budget', 'adaptive', 'inherit'] },
  { key: 'parallelization', label: 'Run plans in parallel', group: 'run' },
  { key: 'context_window', label: 'Context window', group: 'run' },
  { key: 'response_language', label: 'Reply language', group: 'run' },
  { key: 'context', label: 'Context profile', group: 'run', options: ['dev', 'research', 'review'] },
  { key: 'resolve_model_ids', label: 'Use full model IDs', group: 'run' },
  { key: 'model_overrides', label: 'Model per agent', group: 'run' },
  { key: 'agent_skills', label: 'Skills per agent', group: 'run' },
  { key: 'runtime', label: 'Runtime', group: 'run' },
  { key: 'effort.default', label: 'Default effort', group: 'run' },
  { key: 'fast_mode.enabled', label: 'Fast mode', group: 'run' },
  { key: 'model_policy.provider', label: 'Model policy: provider', group: 'run' },
  { key: 'model_policy.budget', label: 'Model policy: budget tier', group: 'run' },
  { key: 'model_policy.high', label: 'Model policy: high tier', group: 'run' },
  { key: 'model_policy.medium', label: 'Model policy: medium tier', group: 'run' },
  { key: 'model_policy.low', label: 'Model policy: low tier', group: 'run' },
  // Nested objects GSD 1.11.0 enumerates child by child: each child is its own row, never the parent.
  { key: 'models.planning', label: 'Model for planning', group: 'run' },
  { key: 'models.discuss', label: 'Model for discussion', group: 'run' },
  { key: 'models.research', label: 'Model for research', group: 'run' },
  { key: 'models.execution', label: 'Model for execution', group: 'run' },
  { key: 'models.verification', label: 'Model for verification', group: 'run' },
  { key: 'models.completion', label: 'Model for completion', group: 'run' },
  { key: 'granularities.planning', label: 'Plan detail for planning', group: 'run' },
  { key: 'granularities.discuss', label: 'Plan detail for discussion', group: 'run' },
  { key: 'granularities.research', label: 'Plan detail for research', group: 'run' },
  { key: 'granularities.execution', label: 'Plan detail for execution', group: 'run' },
  { key: 'granularities.verification', label: 'Plan detail for verification', group: 'run' },
  { key: 'granularities.completion', label: 'Plan detail for completion', group: 'run' },
  { key: 'dynamic_routing.enabled', label: 'Dynamic routing', group: 'run' },
  { key: 'dynamic_routing.escalate_on_failure', label: 'Escalate on failure', group: 'run' },
  { key: 'dynamic_routing.max_escalations', label: 'Escalation limit', group: 'run' },
  { key: 'dynamic_routing.provider_escalation', label: 'Escalate to another provider', group: 'run' },
  { key: 'dynamic_routing.tier_models.light', label: 'Routing model, light tier', group: 'run' },
  { key: 'dynamic_routing.tier_models.standard', label: 'Routing model, standard tier', group: 'run' },
  { key: 'dynamic_routing.tier_models.heavy', label: 'Routing model, heavy tier', group: 'run' },
  { key: 'effort.routing_tier_defaults.light', label: 'Effort, light tier', group: 'run' },
  { key: 'effort.routing_tier_defaults.standard', label: 'Effort, standard tier', group: 'run' },
  { key: 'effort.routing_tier_defaults.heavy', label: 'Effort, heavy tier', group: 'run' },
  { key: 'fast_mode.routing_tier_defaults.light', label: 'Fast mode, light tier', group: 'run' },
  { key: 'fast_mode.routing_tier_defaults.standard', label: 'Fast mode, standard tier', group: 'run' },
  { key: 'fast_mode.routing_tier_defaults.heavy', label: 'Fast mode, heavy tier', group: 'run' },
  // Maps whose next segment GSD leaves open (a runtime, an agent id): one row holding the object whole.
  { key: 'model_profile_overrides', label: 'Model profile per runtime', group: 'run' },
  { key: 'model_policy.runtime_tiers', label: 'Model tiers per runtime', group: 'run' },
  { key: 'effort.agent_overrides', label: 'Effort per agent', group: 'run' },
  { key: 'fast_mode.agent_overrides', label: 'Fast mode per agent', group: 'run' },
  // Planning steps
  { key: 'workflow.research', label: 'Research before planning', group: 'plan' },
  { key: 'workflow.discuss_mode', label: 'Discussion style', group: 'plan', options: ['discuss', 'assumptions'] },
  { key: 'workflow.skip_discuss', label: 'Skip the discussion', group: 'plan' },
  { key: 'workflow.research_before_questions', label: 'Research before questions', group: 'plan' },
  { key: 'workflow.plan_check', label: 'Check plans', group: 'plan' },
  { key: 'workflow.pattern_mapper', label: 'Map patterns before planning', group: 'plan' },
  { key: 'workflow.ui_phase', label: 'UI design contract', group: 'plan' },
  { key: 'workflow.ai_integration_phase', label: 'AI integration step', group: 'plan' },
  { key: 'workflow.plan_chunked', label: 'Plan in chunks', group: 'plan' },
  { key: 'workflow.post_planning_gaps', label: 'Gap report after planning', group: 'plan' },
  { key: 'workflow.mvp_mode', label: 'MVP framing', group: 'plan' },
  { key: 'phase_naming', label: 'Phase numbering', group: 'plan', options: ['sequential', 'custom'] },
  { key: 'project_code', label: 'Phase folder prefix', group: 'plan' },
  { key: 'phase_id_convention', label: 'Phase ID format', group: 'plan' },
  { key: 'planning.commit_docs', label: 'Commit planning docs', group: 'plan' },
  { key: 'planning.search_gitignored', label: 'Search ignored planning files', group: 'plan' },
  { key: 'planning.sub_repos', label: 'Sub-repositories', group: 'plan' },
  { key: 'workflow.max_discuss_passes', label: 'Discussion passes', group: 'plan' },
  { key: 'workflow.plan_review_convergence', label: 'Converge plan reviews', group: 'plan' },
  { key: 'workflow.specless_probe_fallback', label: 'Probe when there is no spec', group: 'plan' },
  // Running plans
  { key: 'workflow.auto_advance', label: 'Move to the next phase on its own', group: 'exec' },
  { key: 'workflow.node_repair', label: 'Repair failed tasks', group: 'exec' },
  { key: 'workflow.node_repair_budget', label: 'Repair attempts', group: 'exec' },
  { key: 'workflow.use_worktrees', label: 'Run in worktrees', group: 'exec' },
  { key: 'workflow.context_guard_mode', label: 'Context guard', group: 'exec', options: ['auto', 'warn', 'off'] },
  { key: 'workflow.inline_plan_threshold', label: 'Run small plans inline', group: 'exec' },
  { key: 'workflow.subagent_timeout', label: 'Agent timeout (ms)', group: 'exec' },
  { key: 'workflow.text_mode', label: 'Plain-text menus', group: 'exec' },
  { key: 'workflow.auto_prune_state', label: 'Prune old STATE entries', group: 'exec' },
  { key: 'workflow.test_command', label: 'Test command', group: 'exec' },
  { key: 'workflow.build_command', label: 'Build command', group: 'exec' },
  { key: 'workflow.test_gate_timeout', label: 'Test gate timeout', group: 'exec' },
  { key: 'workflow.smart_zone_tokens', label: 'Smart zone (tokens)', group: 'exec' },
  { key: 'workflow.worktree_skip_hooks', label: 'Skip hooks in worktrees', group: 'exec' },
  { key: 'workflow.agent_hint_routing', label: 'Route by agent hints', group: 'exec' },
  { key: 'workflow.cross_ai_execution', label: 'Cross-AI execution', group: 'exec' },
  { key: 'workflow.cross_ai_command', label: 'Cross-AI command', group: 'exec' },
  { key: 'workflow.cross_ai_timeout', label: 'Cross-AI timeout', group: 'exec' },
  { key: 'executor.stall_detect_interval_minutes', label: 'Executor stall check (minutes)', group: 'exec' },
  { key: 'executor.stall_threshold_minutes', label: 'Executor stalls after (minutes)', group: 'exec' },
  { key: 'planner.stall_detect_interval_minutes', label: 'Planner stall check (minutes)', group: 'exec' },
  { key: 'planner.stall_threshold_minutes', label: 'Planner stalls after (minutes)', group: 'exec' },
  { key: 'workflow._auto_chain_active', label: 'Auto-advance chain running', group: 'exec' },
  // Reviews and checks
  { key: 'workflow.verifier', label: 'Verify after running', group: 'check' },
  { key: 'workflow.nyquist_validation', label: 'Validation strategy', group: 'check' },
  { key: 'workflow.human_verify_mode', label: 'When people verify', group: 'check' },
  { key: 'workflow.ui_safety_gate', label: 'UI safety gate', group: 'check' },
  { key: 'workflow.code_review', label: 'Code review', group: 'check' },
  { key: 'workflow.code_review_depth', label: 'Review depth', group: 'check', options: ['quick', 'standard', 'deep'] },
  { key: 'workflow.code_review_command', label: 'Outside review command', group: 'check' },
  { key: 'workflow.security_enforcement', label: 'Security checks', group: 'check' },
  { key: 'workflow.security_asvs_level', label: 'ASVS level', group: 'check', options: [1, 2, 3] },
  { key: 'workflow.security_block_on', label: 'Blocks on', group: 'check', options: ['critical', 'high', 'medium', 'low', 'none'] },
  { key: 'workflow.plan_bounce', label: 'Plan bounce', group: 'check' },
  { key: 'workflow.plan_bounce_script', label: 'Plan bounce script', group: 'check' },
  { key: 'workflow.plan_bounce_passes', label: 'Plan bounce passes', group: 'check' },
  { key: 'plan_review.source_grounding', label: 'Ground plan reviews in source', group: 'check' },
  { key: 'plan_review.source_grounding_authority', label: 'Source grounding method', group: 'check' },
  { key: 'workflow.context_coverage_gate', label: 'Context coverage gate', group: 'check' },
  { key: 'review.default_reviewers', label: 'Default reviewers', group: 'check' },
  { key: 'review.max_prompt_tokens', label: 'Review prompt limit (tokens)', group: 'check' },
  { key: 'review.max_prompt_tokens_per_reviewer', label: 'Review prompt limit per reviewer', group: 'check' },
  { key: 'code_quality.fallow.enabled', label: 'Fallow code scan', group: 'check' },
  { key: 'code_quality.fallow.scope', label: 'Fallow scope', group: 'check' },
  { key: 'code_quality.fallow.profile', label: 'Fallow profile', group: 'check' },
  { key: 'code_quality.fallow.mcp', label: 'Fallow through MCP', group: 'check' },
  { key: 'security.injection_blocking', label: 'Block prompt injection', group: 'check' },
  { key: 'review.reviewer_instances', label: 'Reviewer instances', group: 'check' },
  // Git and branches
  { key: 'commit_docs', label: 'Commit planning files', group: 'git' },
  { key: 'search_gitignored', label: 'Search ignored files', group: 'git' },
  { key: 'git.branching_strategy', label: 'Branching', group: 'git', options: ['none', 'phase', 'milestone'] },
  { key: 'git.base_branch', label: 'Base branch', group: 'git' },
  { key: 'git.create_tag', label: 'Tag milestones', group: 'git' },
  { key: 'git.phase_branch_template', label: 'Phase branch name', group: 'git' },
  { key: 'git.milestone_branch_template', label: 'Milestone branch name', group: 'git' },
  { key: 'git.quick_branch_template', label: 'Quick-task branch name', group: 'git' },
  { key: 'git.allow_default_branch_commits', label: 'Commit to the default branch', group: 'git' },
  { key: 'ship.pr_body_sections', label: 'Extra PR sections', group: 'git' },
  { key: 'phase_commit_docs', label: 'Commit planning files per phase', group: 'git' },
  // Research tools
  { key: 'brave_search', label: 'Brave search', group: 'tools' },
  { key: 'firecrawl', label: 'Firecrawl', group: 'tools' },
  { key: 'exa_search', label: 'Exa search', group: 'tools' },
  { key: 'tavily_search', label: 'Tavily', group: 'tools' },
  { key: 'ref_search', label: 'Ref', group: 'tools' },
  { key: 'perplexity', label: 'Perplexity', group: 'tools' },
  { key: 'jina', label: 'Jina', group: 'tools' },
  { key: 'graphify.build_timeout', label: 'Graph build timeout', group: 'tools' },
  { key: 'graphify.auto_update', label: 'Update the graph on its own', group: 'tools' },
  { key: 'graphify.graph_path', label: 'Graph file path', group: 'tools' },
  // Hooks and extras
  { key: 'hooks.context_warnings', label: 'Context warnings', group: 'extra' },
  { key: 'hooks.context_warning_threshold', label: 'Warn at (% left)', group: 'extra' },
  { key: 'hooks.context_critical_threshold', label: 'Critical at (% left)', group: 'extra' },
  { key: 'features.thinking_partner', label: 'Thinking partner', group: 'extra' },
  { key: 'features.global_learnings', label: 'Global learnings', group: 'extra' },
  { key: 'learnings.max_inject', label: 'Learnings per session', group: 'extra' },
  { key: 'intel.enabled', label: 'Codebase intel', group: 'extra' },
  { key: 'manager.flags.discuss', label: 'Manager: discuss flags', group: 'extra' },
  { key: 'claude_md_path', label: 'CLAUDE.md path', group: 'extra' },
  { key: 'claude_md_assembly.mode', label: 'CLAUDE.md assembly', group: 'extra' },
  { key: 'claude_md_assembly.blocks', label: 'CLAUDE.md sections', group: 'extra' },
  { key: 'hooks.workflow_guard', label: 'Workflow guard', group: 'extra' },
  { key: 'statusline.show_last_command', label: 'Status line: last command', group: 'extra' },
  { key: 'statusline.context_position', label: 'Status line: context position', group: 'extra' },
  { key: 'statusline.show_context_tokens', label: 'Status line: context tokens', group: 'extra' },
  { key: 'statusline.state_format', label: 'Status line: state format', group: 'extra' },
  { key: 'statusline.show_git', label: 'Status line: git', group: 'extra' },
  { key: 'manager.flags.plan', label: 'Manager: plan flags', group: 'extra' },
  { key: 'manager.flags.execute', label: 'Manager: execute flags', group: 'extra' },
  { key: 'capabilities.strict_known_registries', label: 'Strict known registries', group: 'extra' },
  { key: 'capabilities.auto_update', label: 'Update capabilities on their own', group: 'extra' },
  { key: 'agent_skills_security.trusted_global_roots', label: 'Trusted global skill roots', group: 'extra' },
];
