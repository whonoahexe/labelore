// Verbatim, trimmed excerpts of real RESEARCH documents (quick-260929-3x3), embedded so the
// extractor tests never depend on ~/studio-portal being present. SP02_SHAPE is studio-portal
// v1.0/02 (Storage Health & Status) with long prose cut to `…`; every table row, diagram, tree,
// heading, label and count the extractor tests pin is kept verbatim. NA_AUDIT is studio-portal
// phases/03's "Not applicable" audit section; SP04_NUMBERED_PITFALLS is phases/04's numbered
// pitfall list. SYNTHETIC_SLOP and PITFALL_LABEL_LINES are hand-written to real shapes.

export const SP02_SHAPE = `# Phase 2: Storage Health & Status - Research

**Researched:** 2026-07-17
**Domain:** Host-integrated storage health probing (statvfs / SMART / rclone) with per-tier fault isolation, pushed over WebSocket
**Confidence:** HIGH

> **This research was conducted ON the target host** (\`cinedise\`, Ubuntu 26.04, kernel 7.0.0-27). The four tiers,
> their real devices, \`smartctl\` 7.5, \`rclone\` v1.74.3 and the live \`cloud:\` remote were all probed directly.
> Most findings below are \`[VERIFIED]\` by execution against the real hardware rather than inferred. Where root
> privilege was required and unavailable, findings are explicitly marked \`[ASSUMED]\` and listed in the
> Assumptions Log.

## Summary

This phase is unusual in that **the research could be run against the real production host** — I probed the actual four tiers, the actual Seagate/SanDisk USB bridges, the actual \`cloud:\` remote, and compile-ran the candidate \`statvfs\` API against \`/mnt/archive\`. That converted most of what would …

The most important is **F1**: \`/mnt/vault\` and \`/mnt/archive\` are mounted \`nofail\`. When a USB tier is absent, the mount point degrades to an ordinary empty directory on the root filesystem, and \`statvfs("/mnt/archive")\` then **succeeds in microseconds and returns the root filesystem's capacity** …

The second is **F2**: \`smartctl\`'s exit status is a **bitmask**, and bit 3 (value 8) means "SMART status check returned DISK FAILING". The already-SMART-failed archive drive — the drive this entire project exists for — will therefore make \`smartctl\` exit **non-zero**. Idiomatic Rust (\`if …

**Primary recommendation:** Build one dedicated OS thread per tier (never \`spawn_blocking\`), each running a layered probe — \`/proc/self/mountinfo\` (never blocks) → bounded \`statvfs\` canary (~2 s, vs. a measured 0.002 ms healthy / 30 s SCSI timeout) → SMART on a slower cadence with **bitmask-decoded** exit codes — publishing into a \`watch\`/\`broadcast\` bus that the existing ticket-authorized \`/ws\` handler fans out …

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| \`rustix\` | **1.1.4** | \`statvfs\` for tier capacity + \`ST_RDONLY\` detection | Rust std has no \`statvfs\`. rustix is the maintained, safe, \`1.x\`-stable wrapper (bytecodealliance; 17.4M downloads/week). **Compile-verified in this session** against \`/mnt/archive\` — see Code Examples. Adds exactly **one** new leaf crate to this tree (\`linux-raw-sys\`); \`bitflags\` 2.13.0, \`errno\` 0.3.14 and \`libc\` 0.2.186 are already in \`backend/Cargo.lock\` [VERIFIED: cargo run + Cargo.lock] |
| \`tokio\` | **1.52.3** (already pinned) | Runtime; \`broadcast\` bus; \`time::interval\`; \`process::Command\` for subprocess probes | Already in the tree; \`broadcast\` is ARCHITECTURE.md's chosen fan-out [VERIFIED: Cargo.lock] |
| \`axum\` | **0.8.9** (already pinned) | \`/ws\` handler (already built and hardened in Phase 1) | Already in the tree [VERIFIED: Cargo.lock] |
| \`serde\` / \`serde_json\` | 1.0.228 / 1.0.150 (already pinned) | Tagged \`Event\` enum wire format (D-19); parsing \`smartctl -j\` and \`rclone about --json\` | Already in the tree [VERIFIED: Cargo.lock] |
| \`smartctl\` (host binary) | **7.5 2025-04-30 r5714** | SMART verdict + pending/reallocated sector counts | Installed at \`/usr/sbin/smartctl\`; supports \`-j/--json\` [VERIFIED: \`smartctl --version\`, \`smartctl -h\`] |
| \`rclone\` (host binary) | **v1.74.3** | \`rclone about cloud: --json\` for cloud quota | Installed at \`/usr/local/bin/rclone\`; remote \`cloud:\` (type \`drive\`) configured and authenticated [VERIFIED: \`rclone version\`, \`rclone listremotes\`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| \`std::thread\` (std) | — | One dedicated OS thread per tier prober | **Preferred over \`tokio::task::spawn_blocking\`** for this phase — see F3 / Pitfall 3. tokio's own docs: "Use dedicated threads for long-lived or persistent blocking workloads" [CITED: docs.rs/tokio spawn_blocking] |
| \`tokio::sync::watch\` | bundled with tokio | Per-tier latest-snapshot cell feeding the broadcast bus + the on-connect snapshot (D-19) | ARCHITECTURE.md names \`watch\`/\`broadcast\`; \`watch\` is the natural fit for "latest value per tier" |
| \`tokio-util\` | 0.7.18 (already pinned) | \`CancellationToken\` for clean prober shutdown | Already in the tree [VERIFIED: Cargo.lock] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| \`rustix\` | \`nix\` 0.31.3 | Equally legitimate (11.5M downloads/week, \`nix::sys::statvfs\`). Choose \`nix\` only if the project later wants its broader POSIX surface; \`rustix\` has the smaller footprint here. Both clean per the legitimacy gate |
| \`rustix\` | \`libc::statvfs\` directly | Zero new crates (\`libc\` already transitively present), but requires \`unsafe\` + manual \`errno\` handling for a syscall used on the phase's hot path. Not worth it |
| \`rustix\` | **\`sysinfo\` 0.39.6** | **Actively harmful here — do not use.** Its \`Disks\` API refreshes *every* mounted disk in one call, which structurally recouples all four tiers into a single operation: one wedged mount hangs the whole refresh. That is Pitfall 6 reintroduced by a convenience crate. Rejected on isolation grounds, not maturity |
| Dedicated \`std::thread\` per tier | \`tokio::task::spawn_blocking\` + \`timeout\` | Simpler-looking, but leaks into tokio's *shared* 512-thread blocking pool and makes runtime shutdown wait indefinitely (F3). Acceptable only if D-16's one-in-flight cap is enforced perfectly; the dedicated thread makes that cap structural instead |
| \`smartctl\` subprocess | reading \`smartd\` state | Rejected in D-11 (adds a service, mail-oriented format, decouples freshness from our poll loop) |
| \`rclone about\` subprocess | \`rclone rcd\` RC HTTP API | RC API is ARCHITECTURE.md's documented upgrade path but is scoped to **Phase 4** (job progress). For a single quota read per minute, a bounded subprocess is simpler. Do not pull Phase 4's daemon forward |

**Installation:**

\`\`\`bash
# Backend — one crate, one new transitive leaf
cd backend && cargo add rustix@1.1.4 --features fs

# Frontend — shadcn primitives only (D-05); no new npm dependencies.
# @base-ui/react 1.6.0 + lucide-react 1.24.0 are already installed.
cd frontend && npx shadcn@latest add card badge progress alert skeleton
\`\`\`

**Version verification:** \`rustix 1.1.4\` confirmed via \`cargo search rustix\` and the crates.io API, then **compile-and-run verified** against the real \`/mnt/archive\` mount in this session. Host binaries verified by invoking \`--version\` on the target machine.

## Package Legitimacy Audit

Verdicts from \`gsd-tools query package-legitimacy check --ecosystem crates\`, cross-checked against \`cargo search\` and the crates.io API.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| \`rustix\` | crates.io | since 2021-10-29 (~4.7 yrs) | 17,442,928/wk | github.com/bytecodealliance/rustix | **OK** | **Approved — recommended** |
| \`nix\` | crates.io | since 2014-11-11 (~11.7 yrs) | 11,551,002/wk | github.com/nix-rust/nix | **OK** | Approved — viable alternative |
| \`sysinfo\` | crates.io | since 2015-07-25 (~11 yrs) | 2,943,454/wk | github.com/GuillaumeGomez/sysinfo | **OK** | **Rejected on design grounds, not legitimacy** (couples all tiers — see Alternatives) |
| \`libc\` | crates.io | since 2015-01-15 (~11.5 yrs) | 22,736,502/wk | github.com/rust-lang/libc | **OK** | Already present transitively (0.2.186) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**Postinstall scripts:** N/A (crates ecosystem; seam reported \`postinstall: null\` for all four)

**Frontend:** this phase adds **no new npm packages**. shadcn copies component source into the repo; its peer deps (\`@base-ui/react\` 1.6.0, \`lucide-react\` 1.24.0, \`class-variance-authority\`, \`tailwind-merge\`, \`tw-animate-css\`) are all already in \`frontend/package.json\` [VERIFIED: package.json]. No third-party shadcn registries are declared (\`components.json\` → \`"registries": {}\`), so the UI-SPEC's Registry Safety gate stays untriggered.

## Architecture Patterns


### System Architecture Diagram

\`\`\`
                        ┌──────────────────────────────────────┐
  HOST KERNEL / DEVICES │                                      │
                        │  /proc/self/mountinfo   (procfs —    │
                        │       0.14 ms, NEVER blocks)         │
                        │  /mnt/{stage,vault,archive} (statvfs │
                        │       0.002 ms healthy / ∞ if wedged)│
                        │  /dev/disk/by-id/... (smartctl+sudo) │
                        │  Google Drive API   (rclone about)   │
                        └───┬────────┬────────┬────────┬───────┘
                            │        │        │        │
        ┌───────────────────┴─┐ ┌────┴─────┐ ┌┴───────┐ ┌┴──────────┐
        │ PROBER THREAD:stage │ │ :vault   │ │:archive│ │ :cloud    │   ← one dedicated
        │ (dedicated OS thread│ │          │ │        │ │           │     std::thread each;
        │  NOT spawn_blocking)│ │          │ │        │ │           │     a wedge here is
        └──────────┬──────────┘ └────┬─────┘ └───┬────┘ └─────┬─────┘     CONTAINED
                   │                 │           │            │
                   │  mpsc/watch (non-blocking send; a wedged thread
                   │  simply stops sending — no other tier notices)
                   ▼                 ▼           ▼            ▼
        ┌────────────────────────────────────────────────────────────┐
        │  HEALTH REGISTRY  (async task)                             │
        │  • per-tier latest snapshot map  → on-connect snapshot D-19│
        │  • staleness watchdog: no reading in N → \`unreachable\`     │
        │    (D-15: the TIMEOUT is the signal; thread stays leaked)  │
        │  • change-detect → emit only on change (D-19)              │
        └───────────────────────────┬────────────────────────────────┘
                                    │ Event::TierHealth { tier, state, .. , probed_at }
                                    ▼
        ┌────────────────────────────────────────────────────────────┐
        │  BROADCAST BUS  tokio::broadcast::Sender<Event>  (ws/bus.rs)│
        │  Lagged → receiver survives; resend full snapshot (F12)     │
        └───────────────────────────┬────────────────────────────────┘
                                    │ fan-out
                                    ▼
        ┌────────────────────────────────────────────────────────────┐
        │  /ws HANDLER (axum, EXISTING — ticket-authorized, Phase 1) │
        │  replace placeholder echo loop with: snapshot → subscribe  │
        └───────────────────────────┬────────────────────────────────┘
                                    │ WSS, direct cross-origin (bypasses Vercel)
                                    ▼
        ┌────────────────────────────────────────────────────────────┐
        │  BROWSER  /  (Next.js client component, D-03)              │
        │  4 cards, fixed order (D-04) · skeleton until first frame  │
        │  (D-13) · probed_at ticks client-side (D-20) · reconnect   │
        │  w/ fresh ticket mint + capped backoff (D-21)              │
        └────────────────────────────────────────────────────────────┘
\`\`\`

**The load-bearing property:** every arrow *out* of a prober thread is non-blocking. A prober can hang forever in D-state and the only observable consequence is that its own tier's \`probed_at\` stops advancing — which the registry converts into \`unreachable\` for that tier alone. Nothing downstream ever calls *into* a tier.

### Recommended Project Structure

Follows ARCHITECTURE.md §Recommended Project Structure (CONTEXT.md directs: follow unless there's a concrete reason not to).

\`\`\`
backend/src/
├── health/
│   ├── mod.rs           # TierState enum (healthy|degraded|unreachable — D-12), HealthFrame, probed_at
│   ├── collector.rs     # per-tier dedicated prober threads + registry/staleness watchdog
│   └── smart.rs         # smartctl invocation + BITMASK exit decode (F2) + JSON parse + reason-line composition (D-10)
├── tiers/
│   ├── mod.rs           # TierId, TierConfig (mount path, smart device, smart type), registry. Browse/stat only — NOT transfer (Anti-Pattern 1)
│   ├── local.rs         # LocalTier: mountinfo check → bounded statvfs canary
│   └── rclone_tier.rs   # RcloneTier: bounded \`rclone about --json\` subprocess
├── ws/
│   ├── mod.rs           # EXISTING — replace the placeholder echo loop only
│   └── bus.rs           # NEW: broadcast::Sender<Event> wrapper + tagged Event enum
├── config.rs            # EXTEND: tier config (see Pattern 3)
└── lib.rs               # EXTEND: AppState gains bus + snapshot registry; init_state spawns probers
                         #   (precedent: tickets.spawn_sweeper — same pattern, same place)
\`\`\`

### Pattern 1: Layered probe — cheap-and-safe before bounded-and-dangerous

**What:** Never make a device-touching syscall the *first* question. Order the probe by blast radius:

**When to use:** Every local-tier probe tick, always in this order.

### Pattern 2: One dedicated OS thread per tier, not \`spawn_blocking\`

**What:** \`std::thread::spawn\` one prober per tier at \`init_state\`. Each loops: sleep interval → probe → \`watch::Sender::send\` (never blocks) → repeat. The async side never awaits the thread; it reads the \`watch\` cell and applies a staleness deadline.

### Pattern 3: Explicit tier config — never auto-discover the SMART device

**What:** Declare each tier's mount path, SMART device path, and SMART device type explicitly in config. Do not derive the block device from the mount point at runtime.

### Anti-Patterns to Avoid

- **Treating \`statvfs\` success as proof the tier is alive.** It is not. Proven: an unmounted tier returns the root filesystem's numbers in microseconds (F1). Always ask \`/proc/self/mountinfo\` first.
- **\`output.status.success()\` on \`smartctl\`.** A failing drive exits non-zero *by design* (F2). This single line would break HEALTH-02 on archive.
- **Using \`sysinfo\`/\`Disks::refresh_list()\` for capacity.** Refreshes all disks in one call → recouples the tiers → Pitfall 6 reintroduced through a dependency.
- **\`du\` / recursive walk for capacity.** Explicitly forbidden by D-17; catastrophic on a degraded mount.
- **Unifying transfer behind the tier trait.** ARCHITECTURE.md Anti-Pattern 1 — browse/stat only. This phase reads capacity and health; it never moves bytes.
- **Persisting health to SQLite.** ARCHITECTURE.md §Internal Boundaries: health is ephemeral/live-only. Also protects against the Performance Trap of a continuously-polling dashboard holding long-lived read transactions and starving WAL checkpointing.
- **Relying on \`tokio::process::Child\` drop to kill a subprocess.** It does not (Pitfall 4). \`smartctl\`/\`rclone\` need explicit \`kill().await\` + \`wait().await\`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Filesystem capacity | \`df\` subprocess + stdout parsing | \`rustix::fs::statvfs\` | A subprocess per tier per 5 s, with locale-dependent, column-aligned output — for data available as a µs syscall. The existing \`studio-status\` script parses \`df\` with awk; do not port that pattern into the backend |
| SMART parsing | Regex over \`smartctl -a\` human output | \`smartctl -j\` (JSON) + \`serde_json\` | smartmontools ships structured JSON in 7.5 (verified present). Human output is a redraw-oriented format with no stability contract |
| SMART verdict semantics | Custom "is it failing?" heuristics | **Decode the documented exit bitmask** (F2) | The exit status *is* the machine-readable verdict, specified in the man page. Bits 3/4 are the answer D-08 asks for |
| Cloud quota | Google Drive API client + OAuth | \`rclone about cloud: --json\` | The remote is already configured and authenticated; the OAuth token stays in rclone's config, outside every browsable root (Pitfall 10) |
| Mount liveness | \`mountpoint\`/\`findmnt\` subprocess | Read \`/proc/self/mountinfo\` directly | 0.14 ms, no subprocess, no PATH dependency, and gives \`maj:min\` + \`ro\` flags in the same read |
| Relative time ("4s ago") | Custom tick/format logic sprinkled per card | One shared client hook + \`Intl.RelativeTimeFormat\` | UI-SPEC fixes exact thresholds; centralise so all four cards and the D-14 "last seen" stamp agree |
| Reconnect/backoff | Ad-hoc \`setTimeout\` retry | One capped exponential-backoff helper (D-21) | Tickets are single-use, ~60 s TTL, cleared on restart; reconnect is the steady state, not an edge case |

**Key insight:** every "don't" in this table is a case where the host already exposes a *structured, machine-readable* answer (a syscall, procfs, a JSON flag, an exit bitmask) and the tempting shortcut is to scrape a *human-readable* rendering of that same answer. On this box the human-readable renderings are exactly the ones that go slow or wrong when a drive is dying.

## Common Pitfalls

### Pitfall 1 (CRITICAL — F1): An unmounted tier reports the root filesystem's capacity as its own

**What goes wrong:** \`/mnt/vault\` and \`/mnt/archive\` are mounted with \`nofail\` in \`/etc/fstab\` (verified). When the drive is absent, the mount point is an ordinary empty directory on \`/\`. \`statvfs("/mnt/archive")\` then returns **\`/\`'s numbers** — instantly, with no error. The archive card renders …

**How to avoid:** check \`/proc/self/mountinfo\` for the mount point **before** trusting any capacity reading. Equivalent primitive: \`stat(tier).st_dev != stat(parent).st_dev\` (this is exactly what \`mountpoint -q\` does, and what the existing \`studio-status\` shell script already gets right — while the …

**Warning signs:** a tier card showing ~98 GiB total (that is \`/\`, not any tier); two tiers reporting identical total/free; archive reporting a total that isn't ~4.6 TiB.

### Pitfall 2 (CRITICAL — F2): \`smartctl\` exits non-zero on a failing drive; naive error handling turns \`degraded\` into \`unreachable\`

**What goes wrong:** \`smartctl\`'s exit status is a **bitmask**. From the man page on this host [VERIFIED: \`man smartctl\`, EXIT STATUS]:

**How to avoid:** never branch on \`status.success()\`. Extract the raw code and mask it:

**Warning signs:** archive's card showing \`unreachable\` while \`/mnt/archive\` is mounted and \`statvfs\` returns real numbers; any tier flipping to \`unreachable\` on the SMART cadence (~60 s) rather than the capacity cadence (~5 s).

### Pitfall 3 (CRITICAL — F3): \`spawn_blocking\` is uncancellable *and* blocks runtime shutdown forever

**What goes wrong:** two documented tokio behaviours compound [CITED: docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html]:

**How to avoid:** dedicated \`std::thread\` per tier (Pattern 2). Additionally, set \`TimeoutStopSec\` explicitly in the systemd unit rather than inheriting 90 s, so a genuinely unkillable process is reaped promptly. If \`spawn_blocking\` is used anywhere despite this, pair it with …

**Warning signs:** \`systemctl restart\` taking ~90 s; \`ps -eLo state | grep D\`; probe intervals visibly drifting.

### Pitfall 4 (HIGH — F4): rclone's own timeout flags cannot bound wall-clock; defaults allow multi-minute hangs

**What goes wrong:** rclone's defaults on this host [VERIFIED: \`rclone help flags\`]:

**How to avoid:** bound from the parent, and treat rclone flags as defence-in-depth only:

**Warning signs:** cloud card flapping to \`unreachable\` on a rough hourly cadence; \`pgrep rclone\` showing accumulating processes.

### Pitfall 5 (HIGH — F5): \`/dev/sdX\` names are unstable — SMART can report the wrong drive's health

**What goes wrong:** config pins \`/dev/sdc\` for archive; a replug or reboot re-enumerates and \`/dev/sdc\` is now vault (or nothing). SMART silently reports the *wrong physical drive's* health onto the archive card — the most consequential possible lie for this phase.

**How to avoid:** use \`/dev/disk/by-id/usb-Seagate_One_Touch_w_PW_00000000NAE5C7WW-0:0\` (serial-bound) in both the tier config *and* the sudoers grant. \`/etc/fstab\` on this box already follows this discipline (UUID-based) — match it. Note PITFALLS.md already cites "Constantly changing drive letter …

**Warning signs:** archive's SMART verdict changing after a replug with no physical cause; SMART model/serial in the JSON not matching the expected drive (cheap assertion: verify \`model_name\`/\`serial_number\` in \`-j\` output against config, and refuse the reading on mismatch).

### Pitfall 6 (MEDIUM — F8): \`used/total\` is not the percentage \`df\` shows

**What goes wrong:** ext4 reserves blocks for root. Naive \`used/total\` disagrees with \`df\`, \`studio-status\`, and the member's mental model:

**How to avoid:** compute as \`df\` does — \`used = (f_blocks − f_bfree) × f_frsize\`, \`avail = f_bavail × f_frsize\`, \`pct = used / (used + avail)\`. Note the denominator is **not** \`total\`.

### Pitfall 7 (MEDIUM — F9): Google Drive's \`used\` understates consumed quota

**What goes wrong:** live \`rclone about cloud: --json\` [VERIFIED]:

**How to avoid:** cloud \`used = total − free\`. This is both authoritative and semantically consistent with the local tiers' df-style computation, keeping D-02's uniform card anatomy honest.

### Pitfall 8 (MEDIUM): Reintroducing a banner, an \`unknown\` state, or capacity warnings

## Open Questions

1. **Can \`smartctl\` actually read vault — and is archive genuinely SMART-FAILED?** (blocks HEALTH-02's completeness)
   - *What we know:* \`smartctl --scan\` lists only \`/dev/sdc -d sat\` and \`/dev/nvme0 -d nvme\`; \`/dev/sda\` (vault) is omitted. The SanDisk \`0781:55bb\` bridge is a documented "Unknown USB bridge". \`sudo\` on this box is \`(AL …
   - *What's unclear:* whether vault reports SMART at all; whether archive's verdict is FAILED; what its actual \`Current_Pending_Sector\` count is (D-10's reason line wants a real number).
   - *Recommendation:* **the plan must open with a \`checkpoint:human-verify\` task** — run, with the user present, on the host:
     \`\`\`bash
     sudo smartctl -j -H -A -d sat /dev/disk/by-id/usb-Seagate_One_Touch_w_PW_00000000NAE5C7WW-0:0   # archive
     sudo smartctl -j -H -A -d sat /dev/disk/by-id/usb-SanDisk_Portable_SSD_323530383952343030393134-0:0  # vault
     sudo smartctl -j -H -A -d nvme /dev/disk/by-id/nvme-WDC_PC_SN530_SDBPNPZ-512G-1114_222339802573      # stage
     \`\`\`
     Capture exit codes (\`echo $?\` — the bitmask *is* data, per F2) and the JSON. This one checkpoint resolves A1, A2, and the exact sudoers arg vector simultaneously. **Do not plan SMART parsing tasks before it lands.**
   - *If vault has no SMART:* this is a **user decision, not Claude's** — it changes UI copy. D-12's three states still fit (vault is reachable and not failing → \`healthy\`), but the health line cannot say "SMART PASSED". …

2. **What parent deadline for the cloud probe?** (Claude's discretion, but evidence is incomplete)
   - *What we know:* warm 0.78 s; cold 35.5 s; rclone flags cannot bound wall clock (F4); D-18 targets a ~60 s interval; D-16 skips overlapping ticks.
   - *What's unclear:* whether a *steady-state* hourly token refresh costs ~35 s or ~2 s. The 35.5 s sample conflated token refresh with cold DNS/TLS/page-cache.
   - *Recommendation:* start at **\`CLOUD_PROBE_DEADLINE = 45s\`** with a \`60s\` interval (deadline < interval keeps D-16 from starving the tier) and rclone flags as above. 45 s comfortably covers the observed cold path whi …

3. **Should an exFAT \`errors=remount-ro\` flip surface as \`degraded\`?**
   - *What we know:* both USB tiers are mounted with \`errors=remount-ro\`; a read-only flip is a strong "this drive is misbehaving" signal, it is **free** to detect (already in the mountinfo read / \`StatVfsMountFlags::RDO …
   - *What's unclear:* D-08 defines the \`degraded\` alarm criteria **narrowly and deliberately** (SMART verdict OR pending/reallocated sectors). A read-only flip is neither. Adding it would widen a locked decision.
   - *Recommendation:* **do not add it as an alarm criterion without asking** (consistent with the discretion note that forbade capacity warnings unilaterally). Capture the \`ro\` flag in the frame now (it costs nothing) a …

4. **Should this phase fix WR-04 (\`API_ORIGIN\` hardcoded)?**
   - *What we know:* CONTEXT.md flags it as "opportunistic, not scoped." The file (\`frontend/app/page.tsx\`) is being rewritten anyway; \`frontend/.env.local\` already exists.
   - *Recommendation:* fold it in — reading \`NEXT_PUBLIC_API_ORIGIN\` with the current value as fallback is a few lines in code that is being replaced regardless. Planner's call; do not let it grow scope beyond that.

## Environment Availability

All probed directly on the target host (\`cinedise\`) during this session.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| \`smartctl\` | HEALTH-02 | ✓ | 7.5 2025-04-30 r5714, \`/usr/sbin/smartctl\` | — |
| \`smartctl\` **JSON** (\`-j\`) | HEALTH-02 | ✓ | supported in 7.5 | — |
| **NOPASSWD sudo for \`smartctl\`** | HEALTH-02 (D-11) | ✗ | only \`/usr/bin/smbstatus\` is NOPASSWD; \`cinedise\` has \`(ALL:ALL) ALL\` **with password** | **None — blocking.** The grant is a new artifact this phase must create |
| \`rclone\` | HEALTH-01 (cloud) | ✓ | v1.74.3, \`/usr/local/bin/rclone\` | — |
| rclone remote \`cloud:\` | HEALTH-01 (cloud) | ✓ | type \`drive\`, authenticated, \`about\` returns live quota | — |
| \`/mnt/stage\` | HEALTH-01 | ✓ | ext4 on LVM (\`ubuntu--vg-studio--hot\`), 363.1 GiB, 53% used | — |
| \`/mnt/vault\` | HEALTH-01 | ✓ | **exFAT** on \`/dev/sda2\`, 1863.0 GiB, 85% used | — |
| \`/mnt/archive\` | HEALTH-01/02 | ✓ | **exFAT** on \`/dev/sdc2\`, 4657.2 GiB, 79% used | — |
| Rust toolchain | backend | ✓ | cargo/rustc 1.96.0 | — |
| \`cargo test\` | validation | ✓ | 25 lib tests pass in 0.02 s | — |
| Node/npm + shadcn CLI | D-05/D-06 | ✓ | shadcn 4.13.0, Next 16.2.10, React 19.2.4 | — |
| shadcn preset \`b3Dqcuo4na\` | D-06 | ✓ | already applied; \`components.json\` committed, 0 components installed | — |
| **Frontend test framework** | Nyquist validation | ✗ | none (\`scripts\`: dev/build/start/lint only) | See Validation Architecture — Wave 0 |
| systemd unit for backend | deployment | ✗ | does not exist yet | **None — blocking** for the sudoers/service-user work |
| Dedicated non-root service user | D-11 / Pitfall 10 | ✗ | only \`cinedise\` (uid 1000, full sudo) and \`studio\` (uid 1001, nologin) | **None — blocking.** Backend must not run as \`cinedise\` (full sudo) or root |

**Missing dependencies with no fallback (planner must address):**

- The **NOPASSWD sudoers grant** for \`smartctl\` (D-11) — first such artifact in the repo. Must be scoped to exact read-only args against the \`by-id\` paths in Pattern 3.
- A **dedicated non-root service user** + systemd unit. Running as \`cinedise\` would be worse than root-adjacent — that account has unrestricted passworded sudo. Note the tier mounts are world-accessible (\`drwxrwxrwx\`, \`fmask=0000,dmask=0000\`), so a fresh service user can read capacity without joining \`studio\`/\`disk\`.
- **Frontend test framework** — see Wave 0 below.

**Note on the unit file:** set \`TimeoutStopSec\` explicitly (Pitfall 3), and do **not** copy \`studio-proxy-dashboard.service\` (it runs \`User=root\`). Separately, \`cloudflared.service\` carries its tunnel token inline in \`ExecStart\` (world-readable via \`systemctl cat\`) — already logged in STATE.md; out of scope here but the new unit should not repeat the pattern (use \`EnvironmentFile=\` with restricted permissions).

## Sources

### Primary (HIGH confidence — verified by execution on the target host)

- \`man smartctl\` §EXIT STATUS (smartmontools 7.5, local) — the exit bitmask (F2). **The single most important source for this phase.**
- \`smartctl --version\` / \`--scan\` / \`--scan-open\` / \`-h\` — version, JSON support, and vault's omission from the scan (F6)
- \`rclone version\` / \`rclone about cloud: --json\` / \`rclone about --help\` / \`rclone help flags\` — live quota, JSON shape, default timeouts (F4, F9)
- \`/proc/self/mountinfo\`, \`/proc/mounts\`, \`/etc/fstab\`, \`lsblk\`, \`ls -l /dev/disk/by-id/\`, \`udevadm info\`, \`lsusb\` — tier→device map, \`nofail\`, stable naming, filesystems (F1, F5, F7, F11)
- \`/sys/block/{sda,sdc}/device/timeout\` = **30 s**; \`/proc/sys/kernel/hung_task_timeout_secs\` = 120 — sizes the canary (F15)
- **Executed measurements:** \`statvfs\` 0.002–0.012 ms; \`/proc/self/mountinfo\` 0.14 ms; \`rclone about\` 35.5 s cold / 0.78 s warm; unmounted-dir → root-fs stats (F1, proven)
- **Compile-and-run:** \`rustix 1.1.4\` \`statvfs\` against real \`/mnt/archive\` — field names/types and \`StatVfsMountFlags::RDONLY\` confirmed
- \`cd backend && cargo test --lib\` — 25 tests pass, 0.02 s
- Codebase: \`backend/src/{lib.rs,config.rs,ws/mod.rs}\`, \`backend/Cargo.{toml,lock}\`, \`frontend/{package.json,components.json,AGENTS.md,app/page.tsx}\`, \`.planning/config.json\`
- \`gsd-tools query package-legitimacy check --ecosystem crates\` — OK ×4 with repo URLs + download signals
- \`cargo search\` / crates.io API — rustix 1.1.4, nix 0.31.3, sysinfo 0.39.6

### Secondary (MEDIUM confidence — official docs, fetched)

- [docs.rs/tokio · \`spawn_blocking\`](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html) — uncancellable; shutdown waits indefinitely; "use dedicated threads for long-lived blocking worklo
- [docs.rs/tokio · \`Builder::max_blocking_threads\`](https://docs.rs/tokio/latest/tokio/runtime/struct.Builder.html#method.max_blocking_threads) — default **512**; unbounded queue
- [docs.rs/tokio · \`sync::broadcast\`](https://docs.rs/tokio/latest/tokio/sync/broadcast/index.html) — \`Lagged\` advances the receiver; not permanent (F12)
- [docs.rs/rustix · \`fs::statvfs\`](https://docs.rs/rustix/latest/rustix/fs/fn.statvfs.html) — signature
- Project research: \`.planning/research/{PITFALLS,ARCHITECTURE,STACK}.md\`; \`.planning/phases/02-storage-health-status/{02-CONTEXT,02-UI-SPEC}.md\`

### Tertiary (LOW confidence — WebSearch, corroborating A2 only)

- [smartmontools#526 — SanDisk Extreme Portable SSD support](https://github.com/smartmontools/smartmontools/issues/526)
- [smartmontools#275 — Unknown USB bridge](https://github.com/smartmontools/smartmontools/issues/275)
- [Reading SMART on a Samsung Portable SSD T7 (claudiokuenzler.com)](https://www.claudiokuenzler.com/blog/1368/how-to-read-smart-drive-health-status-samsung-portable-ssd-external-drive)
- [SMART on external USB drives — openmediavault forum](https://forum.openmediavault.org/index.php?thread%2F43669-smart-with-external-usb-drives%2F=)
- [scrutiny#45 — allow device type for devices not found in scan](https://github.com/AnalogJ/scrutiny/issues/45)

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — rustix compile-and-run verified against a real tier; host binaries version-checked in situ; legitimacy gate clean
- Architecture: **HIGH** — the isolation design is grounded in measured numbers (30 s SCSI timeout, 0.002 ms healthy statvfs, 512-thread pool) and official tokio docs, not inference
- Pitfalls: **HIGH for F1/F2/F5/F8/F9** (proven or read from the authoritative man page on this host); **MEDIUM for F3/F4** (official docs + measurement, but the wedge itself was not reproduced); **LOW for A1/A2** (root required — gated behind the Open Q1 checkpoint)
- Capacity probing: **HIGH** — math validated against \`df\` on all three local tiers
- SMART probing: **MEDIUM** — the *mechanism* (bitmask, \`-j\`, device paths) is HIGH; the *actual drive verdicts* are unverified and gated
- UI: **HIGH** — UI-SPEC is approved (6/6) and the installed toolchain matches it exactly

**Research date:** 2026-07-17
**Valid until:** ~2026-08-16 (30 days) for the stack. **Hardware findings are perishable:** device enumeration, mount state, and archive's SMART verdict can change at any moment — the drive is actively failing and being evacuated. Re-verify the Pattern 3 device table at execution time.
`;

export const NA_AUDIT = `## Package Legitimacy Audit

**Not applicable.** This phase installs zero new external packages (backend or frontend). The Package Legitimacy Gate protocol was reviewed and has nothing to check — every capability the phase needs is already a dependency of this crate, verified present in \`backend/Cargo.toml\` (see Standard Stack table above) and \`frontend/package.json\` (verified: \`@base-ui/react\`, \`lucide-react\`, \`next\`, \`react\`, \`tailwind-merge\`, \`class-variance-authority\`, \`clsx\`, \`tw-animate-css\`, \`shadcn\` — no UA-parsing library, no new dialog/confirm library \`[VERIFIED: frontend/package.json:12-24]\`, confirming D-14's "pure \`lib/*.ts\` module" and D-10's "extend the existing \`DestructiveConfirmDialog\`" instructions are the only viable paths, not conveniences).

**Packages removed due to [SLOP] verdict:** none — no packages were proposed.
**Packages flagged as suspicious [SUS]:** none.
`;

export const SP04_NUMBERED_PITFALLS = `## Common Pitfalls

1. **D-05 delete-on-drop contradiction.** Unlinking on early disconnect destroys the bytes a new Range request needs. Detect EOF separately from body drop; keep on early drop.
2. **Using output ZIP size as progress.** Compression makes it incomparable to source total. Count copied source bytes.
3. **Trusting the manifest path.** It is durable work description, not authority. Re-open each local file with \`TierRoot\`; cloud commands retain \`--\` before remote path.
4. **Following symlinks while walking.** This can escape or duplicate trees and produces recipient-specific semantics. Omit/report symlinks.
5. **Duplicate names after normalization.** \`a\\\\b\`, \`a/b\`, repeated selected roots, or case-fold collisions can confuse extractors. Reject deterministic collisions during preflight.
6. **Capacity race.** Health capacity can be stale and ZIP overhead/compression can expand. Require a conservative reserve (manifest bytes plus ZIP overhead and operational headroom), recheck immediately before execution, and still handle ENOSPC with cleanup.
7. **Cloud native documents with negative/unknown size.** Existing cloud parsing clamps negative size to zero [VERIFIED: backend/src/tiers/browse/cloud.rs:90-96], which is unsafe for an authoritative 400 GB preflight. Refuse selections containing entries without a stable downloadable byte size or define/export them explicitly; do not count them as zero.
8. **Recovery using transfer rules.** Current recovery auto-queues plain Copy [VERIFIED: backend/src/jobs/recovery.rs]. Archive must instead become Interrupted and delete \`.partial\`, while a Completed final remains Completed.
9. **Sweep vs active response.** The 24-hour sweeper must skip an artifact with an active collection lease.
10. **Assuming ZIP64 because total is known.** Set \`large_file(true)\` for every file and use a writer configuration that emits ZIP64 central records when entry count crosses its threshold; test both independent thresholds.
11. **Bulk payload amplification.** Bound selected root count, path length, total manifest rows, request body size, and duplicate roots before filesystem work.
`;

// SYNTHETIC — no real RESEARCH.md has a [SLOP] removal yet. A seam table with one SLOP row plus
// the "Packages removed due to [SLOP] verdict" line, exactly as the gate would print them.
export const SYNTHETIC_SLOP = `## Package Legitimacy Audit

The seam output for the proposed packages.

| Package | Registry | Age | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----|--------------|-------------|---------|-------------|
| left-pad | npm | 10y | 1,000,000 | github.com/left-pad/left-pad | OK | Approved |
| left-pad-ng | npm | 3d | 212 | — | SLOP (\`slop-name\`) | Removed |

**Packages removed due to [SLOP] verdict:** \`left-pad-ng\` — typosquat of left-pad; use \`left-pad\` instead.

**Packages flagged as suspicious [SUS]:** none.
`;

// The dense-fixture shape: the four labelled rows on consecutive lines with no blank line between.
export const PITFALL_LABEL_LINES = `## Common Pitfalls

### Pitfall 1: Overfitting to one real project
**What goes wrong:** A parser assumes shapes only one project happens to have
**Why it happens:** It's the only real project on the machine
**How to avoid:** Derive shapes from templates instead (D-01)
**Warning signs:** Code comments like "always has..."
`;
