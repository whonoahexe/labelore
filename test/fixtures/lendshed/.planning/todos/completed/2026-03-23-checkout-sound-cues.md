---
created: 2026-03-23T06:14:52.771Z
title: Add synthesised checkout sound cues
area: ui
severity: cosmetic
order: 6
files:
  - web/lib/kiosk/tones.ts
notes:
  - .planning/notes/2026-03-23-checkout-sound-cues.md
---

## Problem

The only sound is the overdue ringer; scanning, returning, confirming, rejecting and recording a spoken note are all silent.

## Solution

WebAudio-synthesised cues reusing tones.ts's AudioContext and unlockAudio: scan pop, return chime while the desk screen is open (throttled during a rush), loan confirmed / rejected / sensor dropped, reminder tick, spoken-note start and stop, reminder chime and overdue sound (after the reminders todo). Sounds on/off toggle in the ⋮ menu. Limits: the iPhone silent switch mutes it; nothing when the kiosk tab is closed; audio only after the first tap.

## Resolution

Done in quick task 260325-q9v. Per Maya, there is no Sounds on/off switch: cues are always on, with no menu item and no stored preference. The ⋮ and + menus were grouped into labelled sections in the same task.
