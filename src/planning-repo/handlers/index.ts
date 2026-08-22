// The ordered handler registry. Typed handlers come first, most-specific-to-least; the
// unconditionally-matching GenericMarkdownHandler is the final element and MUST stay there — see
// the load-bearing comment at its own declaration. Every handler's match() inspects only the
// ArtifactRef's filename and location, never file content, per DATA-02.
import type { ArtifactHandler } from '../types.ts';
import { PlanHandler } from './plan.ts';
import { SummaryHandler } from './summary.ts';
import { RoadmapHandler } from './roadmap.ts';
import { StateHandler } from './state.ts';
import { RequirementsHandler } from './requirements.ts';
import { ProjectHandler } from './project.ts';
import { ContextHandler } from './context.ts';
import { FrontmatterOnlyHandler } from './frontmatter-only.ts';
import { JsonConfigHandler } from './json-config.ts';
import { WindowsHandler } from './windows.ts';
import { GenericMarkdownHandler } from './generic.ts';

export const HANDLERS: ArtifactHandler[] = [
  PlanHandler,
  SummaryHandler,
  RoadmapHandler,
  StateHandler,
  RequirementsHandler,
  ProjectHandler,
  ContextHandler,
  FrontmatterOnlyHandler,
  JsonConfigHandler,
  WindowsHandler,
  GenericMarkdownHandler,
];
