---
date: "2026-03-23 08:05"
promoted: true
---

Checkout sound cues. Decided: all of these — a "pop" when an item is scanned in; a chime when a return is accepted while the desk screen is open (not on every scan during a rush); a blip when the loan is confirmed; a low tone when a scan is rejected or the sensor drops; a tick when a reminder is dismissed; start and stop clicks when a spoken note is recorded; a reminder chime and an overdue sound (once the reminders and overdue notes land). Decided: made with WebAudio in code, the same way as web/lib/kiosk/tones.ts (no asset files, no licences) — reuse its AudioContext and unlockAudio instead of opening a second context. Suggested: a Sounds on/off toggle in the ⋮ menu. Limits: an iPhone's silent switch mutes web audio; cues only play while the kiosk page is open (a closed tab falls back to the OS default notification sound, because web push cannot pick a custom one); audio starts only after the first tap in a session, so the first scan after opening may be silent.
