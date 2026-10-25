---
date: "2026-03-23 05:50"
promoted: true
---

Bug: on the desk tablet, pressing Android back while an item photo is open in the lightbox closes the whole kiosk instead of the lightbox. Cause: the kiosk never touches browser history (no pushState or popstate anywhere under web/), so back has nowhere inside the app to go. Probably the same for every overlay: lightbox, upload tray, loan actions, reminders drawer, permission drawer (and the future gallery). Fix: one shared hook — on open, push a history entry; on popstate, close the overlay; when it is closed some other way (X, swipe, Escape), pop the entry it pushed so entries do not pile up. Use it in every overlay. Check on the tablet's home-screen app.
