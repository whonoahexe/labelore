---
phase: 04-camera-strip-ui-controls-netflix-coexistence
verified: 2026-07-05T23:30:00Z
status: human_needed
score: 11/15 requirements met via code; 4 require live Netflix / two-browser verification (Phase 5)
behavior_unverified: 4
overrides_applied: 0
behavior_unverified_items:
  - truth: "CALL-04 — the local user's own avatar lights a passive speaking ring when they speak (VU-meter reinterpreted as the audioLevel-driven ring per the user-approved discussion decision)"
    test: "Join an OTT room on a live Netflix /watch page, enable mic, speak. Confirm your own avatar in the Members panel 'On call' section shows the pulsing --sb-success ring (and stops within ~500ms of silence)."
    expected: "Own avatar ring pulses on speech; no ring on any camera tile. Confirms mic is working (CALL-04 intent)."
    why_human: "Depends on the SFU AudioLevelObserver emitting an audioLevel event keyed to the LOCAL participantId AND that id matching a roster member — neither is exercisable by a unit test. Ring wiring (audioLevel -> threshold -> decay -> speakingParticipantIds) is present and correct in use-media.ts, but runtime emission for self is unproven."
  - truth: "CALL-03 — mirrored 'You' self-view reflects live mute/camera state"
    test: "Enable camera; confirm the pinned index-0 self tile shows a horizontally-mirrored video labeled 'You'. Turn camera off; confirm it falls back to the avatar tile at stable dimensions."
    expected: "Self tile mirrored (scaleX(-1)), labeled, avatar fallback on camera-off."
    why_human: "Mirror orientation and avatar-fallback appearance over a live video element render only in a real browser session; tsc/build prove it compiles, not that it looks correct."
  - truth: "PRES-01 — Members panel splits in-room vs in-call with per-participant mic-muted/camera-off glyphs"
    test: "With 2 browsers in the room, both in-call, open the Members panel. Confirm an 'On call (N)' section lists both participants (self + remote) with correct mic/camera glyphs, above the 'Members (N)' section."
    expected: "On-call section shows every in-call participant mapped to their display name; muted/camera-off glyphs match device state."
    why_human: "Requires the sync roster's OverlayMember.participantId to equal the SFU opaque participantId (RESEARCH Open Question 1). splitPresence degrades gracefully (unmatched ids drop to in-room, no crash), but whether the ids actually line up end-to-end is a live two-browser integration check only Phase 5 can exercise."
  - truth: "PRES-02 — passive speaking ring highlights the current remote speaker(s), no tile reordering"
    test: "With 2 browsers in-call, have the remote peer speak. Confirm their Members-panel avatar rings, tiles do not reorder or promote, and the ring never appears on a camera tile."
    expected: "Remote speaker avatar rings passively; strip order unchanged."
    why_human: "Remote audioLevel emission + ring pulse render only across a real two-browser SFU session."
human_verification:
  - test: "CALL-04 local speaking ring lights own avatar (see behavior_unverified_items)"
    expected: "Own avatar ring pulses on speech"
    why_human: "SFU audioLevel emission for the local participant is not unit-testable"
  - test: "CALL-03 mirrored self-view + avatar fallback appearance"
    expected: "Mirrored 'You' tile; avatar fallback on camera-off"
    why_human: "Visual/live browser only"
  - test: "PRES-01 On-call/In-room split maps SFU ids to roster names across 2 browsers"
    expected: "On-call section lists in-call participants with correct glyphs"
    why_human: "Live roster<->SFU participantId matching; Phase-5 two-browser UAT"
  - test: "PRES-02 remote speaking ring, no tile reorder"
    expected: "Remote speaker avatar rings passively"
    why_human: "Two-browser live SFU audioLevel"
  - test: "STRIP-01/03 visual dock clearance of Netflix chrome + stable tile dimensions (no reflow)"
    expected: "Strip docks top-right clear of Netflix controls; camera-off/muted tiles keep stable footprint"
    why_human: "Visual layout over the live Netflix player; Phase-5 UAT"
---

# Phase 4: Camera Strip UI, Controls & Netflix Coexistence Verification Report

**Phase Goal:** In-call participants render as a compact, collapsible camera strip with self controls, a VU meter, and in-call presence that survives Netflix fullscreen and degrades cleanly on device failures — the movie stays primary and the user controls the intrusion.
**Verified:** 2026-07-05T23:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

The phase is **structurally complete and sound**. Every artifact declared across the 6 plans exists on disk, is substantive (not a stub), is wired into `App.tsx`, and passes its checks:

- `npx vitest run` → **94/94 tests pass** (10 files, incl. the 5 new pure-helper suites: strip-state, strip-view, presence, fullscreen, strip-visibility)
- `npx tsc --noEmit` → **exactly 12 errors, all pre-existing baseline** (background.ts:546, contentScript.ts:48, overlay-content.tsx `process` refs ×3, watcher.ts globals ×7). Zero errors in any phase-4 file. Confirmed unchanged from the 04-01 baseline.
- `npm run build` → **succeeds**, emits `dist/overlay-content.js` (642 KB) + `dist/background.js`
- `CallTiles.tsx` deleted; `grep -rn "CallTiles" src/` returns nothing; `grep "isCameraActive &&" App.tsx` empty (strip correctly gated on `isInCall`)

What remains is **live/visual/two-browser verification** — explicitly Phase-5 UAT scope. Per the decision tree, any human-verification item forces `status: human_needed` even when all static checks pass.

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Self controls: mute/unmute mic, camera on/off (avatar fallback), mirrored "You" self-view, live local mic signal | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Controls wired (App.tsx onToggleMic/onToggleCamera → enable/disable); CameraStripTile mirrored `scaleX(-1)` + avatar fallback present. "VU meter" delivered as the user-approved speaking ring (see note). Mirror + ring live appearance = human. |
| 2 | Compact deterministic strip (self pinned), docked clear, three-state collapse/expand/hide persisted never dropping audio, stable avatar tiles, +N overflow | ✓ VERIFIED (persistence/audio) / ⚠️ (visual) | STRIP-02 fully verified (per-tab SW bridge, independent RemoteAudio gate). Self-pinned join-order render, +N chip unit-tested. Visual dock clearance + tile-dimension stability = human. |
| 3 | Strip+overlay survive native Netflix fullscreen + F11 via `fullscreenchange` re-parenting, Shadow-DOM + keyboard isolation intact | ✓ VERIFIED | `fullscreen.ts` + mount/unmount wiring; **live-verified on real Netflix /watch in the 04-03 human checkpoint (operator-approved 2026-07-05)**; no new keydown listener (COEX-03). |
| 4 | Members pill in-room vs in-call, mic-muted/camera-off per participant, passive speaking ring via AudioLevelObserver, no reorder | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | MembersPanel split via `splitPresence`, ring keyed to `speakingParticipantIds` (avatar-only, absent from tiles — grep-confirmed). Live ring pulse + roster↔SFU-id matching = human. |
| 5 | Permission-denied → clear message + retry (never silent); no-device/device-busy → voice-only degrade | ✓ VERIFIED | `classifyMediaError` (allowlisted codes, unit-tested) → micError/cameraError → inline `.control-error` chip; re-click = retry. Mic/camera independence unit-verified (STATE-02 voice-only inherent). |

**Score:** 2/5 fully verified with no human leg (SC3, SC5); 3/5 present + wired with live-only legs. Per-requirement: **11/15 met via code, 4 human_needed** (see below).

### VU-meter note (CALL-04 / SC1) — user-approved reinterpretation, not a gap

The ROADMAP SC1 and CALL-04 wording says "live local mic VU meter". The discussion log (lines 78–89) records an explicit user decision to **"mimic the watch party web app exactly"**, which has *no literal VU bar* — its "mic works" signal is the SDK `audioLevel`-driven green pulsing ring on member-list avatars (v1.4 "B-04a"). One ring satisfies both CALL-04 (own avatar) and PRES-02 (remote). This is a documented, user-confirmed reinterpretation; the intent (confirm mic is working) is met. Not counted as a gap.

**Optional:** to make this explicit in the record, add to this file's frontmatter:
```yaml
overrides:
  - must_have: "CALL-04 live local mic VU meter"
    reason: "User chose watch-party parity in discussion (2026-07-05): no VU bar; the audioLevel-driven speaking ring on member avatars is the mic-working signal. Intent preserved."
    accepted_by: "whonoahexe"
    accepted_at: "2026-07-05T00:00:00Z"
```

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/strip-state.ts` | StripState + stripStateOrDefault + nextStripState | ✓ VERIFIED | Pure, unit-tested; single source of truth |
| `src/background/background.ts` handlers | STRIP_STATE_GET/SET keyed by sender.tab.id | ✓ VERIFIED | Validates via stripStateOrDefault; keyed `strip_state_${tabId}`; never trusts content-script tabId (line 1432–1448) |
| `src/content/media/use-media.ts` | classifyMediaError, micError/cameraError, speakingParticipantIds | ✓ VERIFIED | Allowlisted classification; audioLevel→threshold(-65dBov)→decay(500ms)→Set wiring is real (line 278–354) |
| `src/content/overlay/types.ts` | MediaControlError (code-only) | ✓ VERIFIED | No message field (T-04-02) |
| `src/content/overlay/fullscreen.ts` | installFullscreenReparenting + computeReparentTarget | ✓ VERIFIED | Wired in overlay-content.tsx mount/unmount (line 176, 221–223) |
| `src/content/media/strip-view.ts` | computeStripView, VISIBLE_CAP=4 | ✓ VERIFIED | Unit-tested (5 cases) |
| `src/content/media/CameraStripTile.tsx` | GUARD-03 srcObject tile, avatar/mic-glyph, collapsed rail | ✓ VERIFIED | Track-identity guard preserved; mirrored self; glyph gated on `isOff && isAudioMuted` |
| `src/content/media/CameraStrip.tsx` | self-pinned join-order column, 4+N | ✓ VERIFIED | No `.sort`/`.filter`; self tile before remote map; +N chip |
| `src/content/media/use-strip-state.ts` | useStripState (state/cycle/setExpanded) | ✓ VERIFIED | Imports nextStripState from shared; optimistic + fire-and-forget |
| `src/content/overlay/presence.ts` | splitPresence | ✓ VERIFIED | Pure, unit-tested (4 cases incl. unmatched/missing-pid guards) |
| `src/content/overlay/PillBar.tsx` | mic/camera/leave cluster + inline error + restore caret | ✓ VERIFIED | 3 controls, errorCopy allowlist (no error.message), leave gated isInCall, caret gated `hidden && isInCall` |
| `src/content/overlay/MembersPanel.tsx` | On-call/In-room split + ring + glyphs | ✓ VERIFIED | onCall.length guard; ring on `.member-avatar` only |
| `src/content/overlay/strip-visibility.ts` | shouldRenderStrip | ✓ VERIFIED | Pure `isInCall && stripState !== 'hidden'`, unit-tested |
| `src/content/overlay/App.tsx` | full integration | ✓ VERIFIED | CameraStrip mount, split callbacks, independent RemoteAudio gate, onCallParticipantIds/callState useMemos |
| `src/content/media/CallTiles.tsx` | DELETED | ✓ VERIFIED | Absent; no references in src/ |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| App.tsx | CameraStrip | `shouldRenderStrip(isInCall, stripState) && <CameraStrip>` | ✓ WIRED |
| App.tsx | RemoteAudio | `{isMicActive && <RemoteAudio>}` — separate conditional, no stripState ref | ✓ WIRED (independent — STRIP-02) |
| App.tsx | PillBar | micError/cameraError/onToggleMic/onToggleCamera/onLeaveCall/onRestoreStrip | ✓ WIRED |
| App.tsx | MembersPanel | speakingParticipantIds/onCallParticipantIds/callState | ✓ WIRED |
| use-strip-state.ts | background SW | STRIP_STATE_GET/SET round-trip | ✓ WIRED |
| use-media.ts | SDK | `session.on('audioLevel', ...)` → speakingParticipantIds | ✓ WIRED (live emission = human) |
| overlay-content.tsx | fullscreen.ts | installFullscreenReparenting in mountOverlay, cleanup in unmountOverlay | ✓ WIRED |
| MembersPanel | presence.ts | splitPresence(members, onCallIds) | ✓ WIRED (roster↔SFU id match = human) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| CameraStrip | remoteParticipants | use-media.ts session snapshot + participantJoined/trackSubscribed | Yes (live SDK) | ✓ FLOWING |
| MembersPanel | speakingParticipantIds | SDK audioLevel event → threshold/decay | Yes (real handler, not hardcoded) | ✓ FLOWING (self/remote emission = human) |
| MembersPanel | onCallParticipantIds | remoteParticipants[].participantId + localParticipantId | Yes | ✓ FLOWING |
| PillBar | micError/cameraError | classifyMediaError in enable catch blocks | Yes | ✓ FLOWING |
| strip state | stripState | background SW chrome.storage.local per tab | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npx vitest run` | 94 passed (10 files) | ✓ PASS |
| Type baseline | `npx tsc --noEmit` | 12 pre-existing, 0 in phase-4 files | ✓ PASS |
| Bundle emits | `npm run build` | dist/overlay-content.js 642KB | ✓ PASS |
| CallTiles removed | `grep -rn CallTiles src/` | empty | ✓ PASS |
| Ring absent from tiles | `grep speaking-ring\|--sb-success` in CameraStrip*.tsx | empty | ✓ PASS |
| Live Netflix mirror / ring / fullscreen visual | (requires browser + SFU + 2 peers) | — | ? SKIP → human |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|------------|--------|----------|
| CALL-01 mute/unmute mic | 04-05/06 | ✓ met | onToggleMic → enable/disableMic wired to PillBar |
| CALL-02 camera on/off + avatar fallback | 04-04/06 | ✓ met | onToggleCamera + CameraStripTile avatar on isOff |
| CALL-03 mirrored "You" self-view | 04-04 | ? human_needed | Mirror/appearance live-only |
| CALL-04 mic-working signal (VU→ring) | 04-05 | ? human_needed | Ring wired; own-avatar pulse live-only; VU→ring user-approved |
| STRIP-01 compact deterministic strip, self pinned, docked | 04-04 | ✓ met (visual dock = human) | Self-pinned join order, no sort; top-right dock styles |
| STRIP-02 three-state persist, never drop audio | 04-01/06 | ✓ met | SW bridge + independent RemoteAudio gate; fully verified |
| STRIP-03 camera-off/muted avatar+name+glyph stable dims | 04-04 | ✓ met (visual stability = human) | Filter dropped; mic glyph gated; fixed tile dims |
| STRIP-04 +N overflow under cap | 04-04 | ✓ met | computeStripView unit-tested, +N chip |
| COEX-01 native fullscreen re-parent | 04-03 | ✓ met | fullscreen.ts + live-verified checkpoint |
| COEX-02 native+F11+SPA-nav | 04-03 | ✓ met | Operator-approved live verification |
| COEX-03 keyboard isolation, no new listener | 04-03 | ✓ met | No new keydown listener; bubble-phase isolation covers controls |
| PRES-01 in-room vs in-call split + glyphs | 04-05/06 | ? human_needed | Split code present; roster↔SFU id match live-only |
| PRES-02 passive speaking ring, no reorder | 04-05 | ? human_needed | Ring wired avatar-only; live pulse two-browser |
| STATE-01 permission-denied message + retry | 04-02/05/06 | ✓ met | classifyMediaError + inline chip + re-click retry |
| STATE-02 voice-only degrade | 04-02/06 | ✓ met | Independent toggles; unit-verified no cross-writes |

**11 met via code · 4 human_needed · 0 gaps · 0 orphaned requirements**

### Anti-Patterns Found

None. No TBD/FIXME/XXX/PLACEHOLDER markers in any phase-4 file. No stubs (every component wired to live `use-media.ts` state — 04-05's transitional optional-props posture fully resolved by 04-06). The only noted dead code is the harmless unused `.call-tiles-temp` CSS rules in styles.ts (the mount they styled is gone) — cosmetic, out of scope.

### Human Verification Required

All four human items are **live Netflix / two-browser (Phase 5 UAT)** checks, plus the visual dock/stability leg of STRIP-01/03. See the `human_verification` and `behavior_unverified_items` frontmatter for the trigger/expected/why for each: CALL-03 mirror, CALL-04 own-avatar ring, PRES-01 On-call split with correct roster mapping, PRES-02 remote speaking ring, and STRIP-01/03 visual dock clearance + tile stability.

The most integration-sensitive item is **PRES-01**: it depends on the sync roster's `OverlayMember.participantId` matching the SFU opaque `participantId`. `splitPresence` degrades gracefully (unmatched ids fall to in-room, never crash — unit-verified), so a mismatch is a *silent under-population* of the On-call section, not a break. Confirm the ids line up end-to-end in the two-browser session.

### Gaps Summary

**No blocking gaps.** Every deliverable across 04-01…04-06 exists, is substantive, is wired, builds green, and passes 94 tests at the unchanged 12-error tsc baseline. COEX-01/02/03 were already live-verified via the 04-03 human checkpoint. The remaining unverified surface is exclusively runtime visual/behavioral quality over a live Netflix player with a real SFU session and (for PRES-01/02) a second browser — which the phase design and the ROADMAP explicitly assign to Phase 5 (UAT-01/02). Status is `human_needed`, not `gaps_found`.

---

_Verified: 2026-07-05T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
