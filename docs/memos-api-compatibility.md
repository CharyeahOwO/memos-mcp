# Memos API Compatibility

The target baseline is Memos v0.24+.

## Known Drift Points

- Memos has changed field names across versions, such as `rowStatus` to `state`.
- Resource names may appear as `memos/{id}` instead of bare ids.
- Search/filter syntax has changed; current keyword search uses `content.contains("...")`.
- Tag filtering is documented in Memos MCP wrapper examples as `tags.contains("tag")`, but this project currently aggregates tags locally to reduce version risk.
- Update uses `PATCH /api/v1/{memo.name}` with an `updateMask` query parameter. The project verifies create/update/archive against a real Memos instance through optional write smoke testing.

## Normalization Layer

All raw memo responses are converted in `src/memos/normalize.ts` into `NormalizedMemo`.

If an upstream response changes, fix it in the normalization layer first instead of leaking raw API shapes into tools.

## Local Aggregation

Time, tag, and resource tools call `listMemos` over one or more pages and aggregate locally. This is less efficient than server-side filters but more stable across Memos versions.

Use `pageSize` and `maxPages` tool inputs to control how much data is scanned.

## Write Compatibility

`memos_create` sends `content` and explicit `visibility` in the request body.

`memos_update` sends only the changed memo fields and adds `updateMask=content,visibility,pinned,state` as needed. `memos_archive` is a focused update that sends `state=ARCHIVED`.
