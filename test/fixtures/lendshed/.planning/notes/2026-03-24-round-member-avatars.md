---
date: "2026-03-24 09:20"
promoted: true
---

Round member avatars everywhere, push icon included. Today the loan-reminder push (Ana's Android phone) shows the new avatar, which is good, but as a square: web/public/push-worker.js asks for /photos/<id>/avatar-sm, a square 192x192 webp from api/src/photos/resize.ts, and Android draws web-push icons exactly as given. Want: the API also makes an "avatar-round" variant — the same picture masked to a circle with clear corners, saved as PNG so the transparency survives — stored encrypted like the other avatar files and added to the /photos route table; the push worker then uses it as the notification icon. Older avatars have no round variant: make it lazily on first request (or ask members to set the picture again). Decided 2026-03-24: round everywhere — the member menu, the loan counter, the top of the gallery, the avatar drawer. The preset Avatar is already rounded-full, so check each place that shows the picture without it (the big counter image, for one) and turn it into a circle. iPhone notifications always show the app icon, so this only matters on Android. Batch with the crop note — the avatar crop frame is a circle too.
