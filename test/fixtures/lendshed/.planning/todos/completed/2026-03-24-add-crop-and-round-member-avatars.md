---
created: 2026-03-24T09:47:31.208Z
title: Add crop and round member avatars
area: media
severity: minor
order: 7
priority: low
files:
  - api/src/photos/resize.ts
  - api/src/photos/avatar.ts
  - api/src/photos/routes.ts
  - web/public/push-worker.js
  - web/components/tray/photo-tray.tsx
notes:
  - .planning/notes/2026-03-24-crop-tool-photos-and-member-avatars.md
  - .planning/notes/2026-03-24-round-member-avatars.md
---

## Problem

Tool photos can't be cropped before they are posted, avatars are always cut to the middle automatically, and the Android loan reminder shows the avatar as a square.

## Solution

One quick task, low priority. Crop (photos only, no turning): a hand-written cropper (pointer-event drag and pinch, preset tokens, no crop library). The avatar uses a fixed circle frame in place of the API's middle cut; the upload tray gets a Crop button per photo with Free / Square. The browser sends the original plus a normalised crop rectangle; the API applies it with sharp (rotate() then extract) before the thumbnails, so the stored original is the cropped picture. Round everywhere: the API adds an encrypted PNG "avatar-round" variant (circle, clear corners; made the first time it is asked for on older avatars) that the push worker uses as the notification icon, and every in-app avatar (member menu, loan counter, gallery top, avatar drawer) is a circle.

## Resolution

Done in quick task 260326-m3d (2026-03-26). What shipped:

- A hand-written cropper (`web/components/tray/cropper.tsx`): pointer-event drag, corner handles and pinch, preset components only, no crop library.
- Avatars: a picked or taken picture is framed in a fixed circle before upload; Cancel uploads nothing.
- Upload tray: a Crop button on every photo the browser can show (single view and each strip tile), with Free / Square; each photo in a batch is cropped on its own and the tray stays open.
- API crop at finish: the browser sends the untouched original plus a normalised crop rectangle; the API checks it (strict schema) and applies it with sharp (rotate() then extract) before any variant, so the encrypted stored original is the cropped picture.
- An encrypted 192 px `avatar-round` PNG (circle, clear corners) written next to the other avatar sizes and made on first request for older avatars; the push worker uses it as the notification icon.
- The loan counter's member tile is now round, like every other in-app avatar.
