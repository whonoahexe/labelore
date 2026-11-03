# API Coverage — Phase 4: Bulk loan export (Postwing mail relay)

> Full coverage by default: every capability of the relay this export touches is integrated unless a row below
> opts out, and each opt-out names its reason.
> Reviewed against the relay's v3 reference during planning.

| Capability | Decision | Reason |
|------------|----------|--------|
| `POST /messages` send one message | INTEGRATE | |
| `POST /messages/batch` send a batch | INTEGRATE | |
| `GET /messages/{id}` read delivery status | INTEGRATE | |
| Inbound reply webhooks | OPT-OUT | Lendshed does not take replies by mail; members answer inside the app. |
| Suppression list sync | OPT-OUT | |
