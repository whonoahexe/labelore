# Harbor Ledger — Customs Filing Automation

## What This Is

A batch service and review console that turns a broker's shipment manifests into customs filings
for the `ace-gateway` submission API. It replaces the current process, where a filer re-keys each
manifest line into a spreadsheet by hand and uploads it overnight. Each draft filing cites the
manifest row every value came from, and anything the tariff tables can't classify goes to a
visible "Needs a code" lane, so a person makes the judgment calls. From v2.0 the console also
reconciles corrections the gateway sends back.

*Reviewed at v1.0 close — accurate as written.* The one word shipping stress-tested is "every":
three manifests in the pilot carried rows with no HS code at all.

## Core Value

**Every manifest line becomes a cited filing row or a visible exception, with nothing silently
dropped.** If everything else fails, the submitted filing must match what the gateway accepted,
and every exception must carry a recorded human decision.

*Reviewed at v1.0 close — still the right priority.*

## Requirements

### Active

- [ ] Placeholder
