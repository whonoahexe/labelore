# Quick Task 260912-lfi: Scroll to blocker in project state from source link, and render markdown without raw asterisks in dashboard - Context

**Gathered:** 2026-09-12
**Status:** Ready for planning

<domain>
## Task Boundary

Scroll to the blockers section in the project state document from the "View state source" link on blocker items, and render inline Markdown (bold, code, etc.) properly in the dashboard without displaying raw markdown delimiters like `**`.

</domain>

<decisions>
## Implementation Decisions

### Markdown Handling in Dashboard Items
- Render inline Markdown formatting (e.g. `<strong>`, `<code>`, `<em>`) rather than leaving raw markdown syntax (such as `**` or backticks) or stripping everything to plain text.
- Applies to dashboard item descriptions and details (NextWork description, AttentionItem detail, discrepancy details).
- Preserve existing emoji stripping where applicable (`stripEmoji`), while parsing and safely rendering inline markdown.

### Blocker Source Link Destination & Scroll Target
- In `sourceDestination` and attention blocker provenance, preserve and resolve hash anchors for artifact URLs.
- When generating blocker provenance from STATE.md, include the heading anchor for the blockers section (e.g. `#${stableSlug(blocker.heading)}` or `buildArtifactUrl(null, blocker.sourcePath, stableSlug(blocker.heading))`).
- "View state source" link navigates to the STATE.md artifact with `#blockersconcerns` (or corresponding heading anchor), triggering `scrollWhenSettled` to scroll smoothly to that section.

### the agent's Discretion
- Component implementation for inline markdown (a lightweight safe inline markdown parser or component, e.g. supporting bold, code, italics without heavy dependencies).
- Ensure `buildArtifactUrl` and `sourceDestination` handle anchors cleanly and keep route parsing tests passing.
- Rebuild production assets (`npm run build`) upon completion so live server serves updated bundles.

</decisions>

<specifics>
## Specific Ideas

- Blocker detail in studio-portal STATE.md contains `**Vercel TLS cert for `studio.cinedise.com` expires 2026-10-14, and renewal will fail silently.** ...`.
- Dashboard currently renders this via `<p>{stripEmoji(item.detail)}</p>` or `<p>{item.description}</p>`, outputting raw `**`.
- SourceLink on the blocker row in the attention panel renders `View state source` pointing to `/artifacts/a~.planning~STATE.md`. It must point to `/artifacts/a~.planning~STATE.md#blockersconcerns` (or matching heading slug) so the page scrolls to the blocker heading.

</specifics>

<canonical_refs>
## Canonical References

- `src/presentation/dashboard.ts` (sourceDestination, blockerWork, attentionItems)
- `src/presentation/routes.ts` (buildArtifactUrl)
- `src/rendering/slug.ts` (stableSlug)
- `src/web/pages/dashboard-page.tsx` (NextWork, AttentionItem rendering, SourceLink)
- `src/web/pages/artifact-page.tsx` (scrollWhenSettled on window.location.hash)

</canonical_refs>
