// Phase 12 (12-03, SET-01, D-10), reshaped by quick-261114-42r: the settings catalogue guards itself. The table is committed data, the
// labels Labelore shows over GSD's keys; descriptions, defaults and sections come from the installed gsd-core, so the table carries
// only { key, label } rows. These tests inline the reference lists from the plan and pin that the table holds every one of them,
// holds the 25 enumerated children of the closed-list patterns key by key (never their parents), holds the seven open-ended maps as
// whole-object leaves, has no key that is a dotted prefix of another, and has no duplicates or empty labels. The Labelore side of
// section placement (the order, the display names and the homes of keys GSD does not describe) is checked at the foot.
import { describe, expect, it } from 'vitest';
import {
  CATALOGUE_SOURCE,
  SETTINGS_CATALOGUE,
  SETTINGS_SECTION_NAMES,
  SETTINGS_SECTION_ORDER,
  UNDOCUMENTED_HOMES,
} from '../../src/presentation/settings-catalogue.ts';

/** gsd-core 1.11.0's 107 validKeys plus its runtime-state key workflow._auto_chain_active (config-schema.manifest.json). */
const VALID_KEYS = [
  'mode', 'granularity', 'parallelization', 'commit_docs', 'model_profile', 'search_gitignored', 'brave_search', 'firecrawl',
  'exa_search', 'tavily_search', 'ref_search', 'perplexity', 'jina', 'workflow.plan_check', 'workflow.verifier',
  'workflow.auto_advance', 'workflow.node_repair', 'workflow.node_repair_budget', 'workflow.smart_zone_tokens',
  'workflow.human_verify_mode', 'workflow.text_mode', 'workflow.research_before_questions', 'workflow.discuss_mode',
  'workflow.skip_discuss', 'workflow.auto_prune_state', 'workflow.use_worktrees', 'workflow.worktree_skip_hooks',
  'workflow.code_review_command', 'workflow.plan_bounce', 'workflow.plan_bounce_script', 'workflow.plan_bounce_passes',
  'workflow.plan_chunked', 'workflow.specless_probe_fallback', 'workflow.plan_review_convergence',
  'workflow.agent_hint_routing', 'code_quality.fallow.enabled', 'code_quality.fallow.scope', 'code_quality.fallow.profile',
  'code_quality.fallow.mcp', 'ship.pr_body_sections', 'git.branching_strategy', 'git.base_branch', 'git.create_tag',
  'git.phase_branch_template', 'git.milestone_branch_template', 'git.quick_branch_template', 'planning.commit_docs',
  'planning.search_gitignored', 'planning.sub_repos', 'review.default_reviewers', 'review.max_prompt_tokens',
  'review.max_prompt_tokens_per_reviewer', 'workflow.cross_ai_execution', 'workflow.cross_ai_command',
  'workflow.cross_ai_timeout', 'workflow.subagent_timeout', 'workflow.test_gate_timeout', 'workflow.test_command',
  'workflow.build_command', 'workflow.mvp_mode', 'workflow.context_guard_mode', 'executor.stall_detect_interval_minutes',
  'executor.stall_threshold_minutes', 'planner.stall_detect_interval_minutes', 'planner.stall_threshold_minutes',
  'workflow.inline_plan_threshold', 'hooks.context_warnings', 'hooks.workflow_guard', 'workflow.context_coverage_gate',
  'statusline.show_last_command', 'statusline.context_position', 'statusline.show_context_tokens', 'statusline.state_format',
  'statusline.show_git', 'workflow.max_discuss_passes', 'features.thinking_partner', 'context', 'features.global_learnings',
  'learnings.max_inject', 'project_code', 'phase_id_convention', 'phase_naming', 'manager.flags.discuss', 'manager.flags.plan',
  'manager.flags.execute', 'response_language', 'context_window', 'graphify.build_timeout', 'graphify.auto_update',
  'graphify.graph_path', 'claude_md_path', 'claude_md_assembly.mode', 'runtime', 'resolve_model_ids', 'effort.default',
  'fast_mode.enabled', 'plan_review.source_grounding', 'plan_review.source_grounding_authority', 'model_policy.provider',
  'model_policy.budget', 'model_policy.high', 'model_policy.medium', 'model_policy.low',
  'agent_skills_security.trusted_global_roots', 'capabilities.strict_known_registries', 'capabilities.auto_update',
  'security.injection_blocking', 'workflow._auto_chain_active',
];

/** Sketch 063's 74-key catalogue. */
const SKETCH_KEYS = [
  'mode', 'granularity', 'model_profile', 'parallelization', 'context_window', 'response_language', 'context',
  'resolve_model_ids', 'model_overrides', 'agent_skills', 'workflow.research', 'workflow.discuss_mode',
  'workflow.skip_discuss', 'workflow.research_before_questions', 'workflow.plan_check', 'workflow.pattern_mapper',
  'workflow.ui_phase', 'workflow.ai_integration_phase', 'workflow.plan_chunked', 'workflow.post_planning_gaps',
  'workflow.mvp_mode', 'phase_naming', 'project_code', 'workflow.auto_advance', 'workflow.node_repair',
  'workflow.node_repair_budget', 'workflow.use_worktrees', 'workflow.context_guard_mode', 'workflow.inline_plan_threshold',
  'workflow.subagent_timeout', 'workflow.text_mode', 'workflow.auto_prune_state', 'workflow.test_command',
  'workflow.build_command', 'workflow.verifier', 'workflow.nyquist_validation', 'workflow.human_verify_mode',
  'workflow.ui_safety_gate', 'workflow.code_review', 'workflow.code_review_depth', 'workflow.code_review_command',
  'workflow.security_enforcement', 'workflow.security_asvs_level', 'workflow.security_block_on', 'workflow.plan_bounce',
  'workflow.plan_bounce_script', 'workflow.plan_bounce_passes', 'plan_review.source_grounding', 'commit_docs',
  'search_gitignored', 'git.branching_strategy', 'git.base_branch', 'git.create_tag', 'git.phase_branch_template',
  'git.milestone_branch_template', 'git.quick_branch_template', 'git.allow_default_branch_commits', 'ship.pr_body_sections',
  'brave_search', 'firecrawl', 'exa_search', 'tavily_search', 'ref_search', 'perplexity', 'jina', 'hooks.context_warnings',
  'hooks.context_warning_threshold', 'hooks.context_critical_threshold', 'features.thinking_partner',
  'features.global_learnings', 'learnings.max_inject', 'intel.enabled', 'manager.flags.discuss', 'claude_md_path',
];

/** The 25 children of the 1.11.0 dynamic patterns whose children are a closed list; each is its own leaf, the parent is not. */
const ENUMERATED_CHILDREN = [
  'models.planning', 'models.discuss', 'models.research', 'models.execution', 'models.verification', 'models.completion',
  'granularities.planning', 'granularities.discuss', 'granularities.research', 'granularities.execution',
  'granularities.verification', 'granularities.completion', 'dynamic_routing.enabled', 'dynamic_routing.escalate_on_failure',
  'dynamic_routing.max_escalations', 'dynamic_routing.provider_escalation', 'dynamic_routing.tier_models.light',
  'dynamic_routing.tier_models.standard', 'dynamic_routing.tier_models.heavy', 'effort.routing_tier_defaults.light',
  'effort.routing_tier_defaults.standard', 'effort.routing_tier_defaults.heavy', 'fast_mode.routing_tier_defaults.light',
  'fast_mode.routing_tier_defaults.standard', 'fast_mode.routing_tier_defaults.heavy',
];

/** The five parents of those children: none is a catalogue key of its own. */
const ENUMERATED_PARENTS = ['models', 'granularities', 'dynamic_routing', 'effort.routing_tier_defaults', 'fast_mode.routing_tier_defaults'];

/** The seven maps whose next segment GSD leaves open: each is one whole-object leaf. */
const OPEN_ENDED_MAPS = [
  'model_profile_overrides', 'model_policy.runtime_tiers', 'effort.agent_overrides', 'fast_mode.agent_overrides',
  'review.reviewer_instances', 'phase_commit_docs', 'claude_md_assembly.blocks',
];

const KEYS = SETTINGS_CATALOGUE.map((entry) => entry.key);
const KEY_SET = new Set(KEYS);

describe('the settings catalogue table', () => {
  it('holds each key once, as a bare { key, label } row', () => {
    expect(new Set(KEYS).size).toBe(KEYS.length);
    for (const entry of SETTINGS_CATALOGUE) expect(Object.keys(entry).sort(), entry.key).toEqual(['key', 'label']);
  });

  it('holds every one of the 107 validKeys and the runtime-state key of gsd-core 1.11.0', () => {
    expect(VALID_KEYS.length).toBe(108);
    for (const key of VALID_KEYS) expect(KEY_SET.has(key), key).toBe(true);
  });

  it("holds every one of the sketch's 74 keys", () => {
    expect(SKETCH_KEYS.length).toBe(74);
    for (const key of SKETCH_KEYS) expect(KEY_SET.has(key), key).toBe(true);
  });

  it('holds each of the 25 enumerated children and none of their five parents', () => {
    expect(ENUMERATED_CHILDREN.length).toBe(25);
    for (const key of ENUMERATED_CHILDREN) expect(KEY_SET.has(key), key).toBe(true);
    for (const parent of ENUMERATED_PARENTS) expect(KEY_SET.has(parent), parent).toBe(false);
  });

  it('holds each of the seven open-ended maps as a key and nothing below them', () => {
    expect(OPEN_ENDED_MAPS.length).toBe(7);
    for (const map of OPEN_ENDED_MAPS) {
      expect(KEY_SET.has(map), map).toBe(true);
      expect(
        KEYS.filter((key) => key.startsWith(`${map}.`)),
        map,
      ).toEqual([]);
    }
  });

  it('has no key that is a dotted prefix of another, so a parent with catalogued children is never one row', () => {
    for (const a of KEYS) {
      for (const b of KEYS) expect(b.startsWith(`${a}.`), `${a} is a prefix of ${b}`).toBe(false);
    }
  });

  it('has exactly 158 keys: the 126 distinct sketch and 1.11.0 keys, seven open-ended maps and 25 enumerated children', () => {
    expect(new Set([...SKETCH_KEYS, ...VALID_KEYS]).size).toBe(126);
    expect(SETTINGS_CATALOGUE.length).toBe(158);
  });

  it('gives every key a plain, trimmed, non-empty label', () => {
    for (const entry of SETTINGS_CATALOGUE) {
      expect(entry.label.trim() !== '' && entry.label === entry.label.trim(), entry.key).toBe(true);
    }
  });
});

describe('where keys sit on the reference page', () => {
  it('starts the order with Core and ends it with Advanced, each section once', () => {
    expect(SETTINGS_SECTION_ORDER[0]).toBe('Core');
    expect(SETTINGS_SECTION_ORDER[SETTINGS_SECTION_ORDER.length - 1]).toBe('Advanced');
    expect(new Set(SETTINGS_SECTION_ORDER).size).toBe(SETTINGS_SECTION_ORDER.length);
  });

  it('names only sections in the order, and homes keys only in sections in the order', () => {
    for (const key of Object.keys(SETTINGS_SECTION_NAMES)) expect(SETTINGS_SECTION_ORDER, key).toContain(key);
    for (const [key, home] of Object.entries(UNDOCUMENTED_HOMES)) expect(SETTINGS_SECTION_ORDER, key).toContain(home);
  });

  it('names where the labels came from', () => {
    expect(CATALOGUE_SOURCE).toBe('Labelore-written labels for gsd-core 1.11.0 keys');
  });
});
