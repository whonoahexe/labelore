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
  // Research tools
  { key: 'brave_search', label: 'Brave search', group: 'tools' },
  { key: 'firecrawl', label: 'Firecrawl', group: 'tools' },
  { key: 'exa_search', label: 'Exa search', group: 'tools' },
  { key: 'tavily_search', label: 'Tavily', group: 'tools' },
  { key: 'ref_search', label: 'Ref', group: 'tools' },
  { key: 'perplexity', label: 'Perplexity', group: 'tools' },
  { key: 'jina', label: 'Jina', group: 'tools' },
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
];
