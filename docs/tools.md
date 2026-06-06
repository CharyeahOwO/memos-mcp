# Tools

All tools return JSON text in the MCP tool result. Errors return `isError: true` and a Chinese user-facing message.

## Read Tools

### `memos_list`

List recent memos by creation time.

Input:

- `pageSize` optional, default 20, max 200.
- `pageToken` optional.

### `memos_get`

Get one memo.

Input:

- `id` required. Accepts `123` or `memos/123`.

### `memos_search`

Search memos.

Input:

- `query` required.
- `mode` optional: `auto`, `semantic`, or `keyword`. Default `auto`.
- `limit` optional for semantic mode, default 20, max 100.
- `minScore` optional for semantic mode, range -1 to 1.
- `pageSize` optional for keyword mode, default 20, max 200.

Behavior:

- If semantic search is enabled and `mode` is `auto`, this tool uses the local semantic index.
- If semantic search is disabled and `mode` is `auto`, this tool uses Memos native keyword search.
- Use `mode: "keyword"` to force keyword search.
- Use `mode: "semantic"` to require semantic search and fail if the semantic profile is not configured.

### `memos_get_day`

Get memos created on a calendar day in a timezone.

Input:

- `date` required, `YYYY-MM-DD`.
- `timezone` optional.
- `pageSize` optional, default 100.
- `maxPages` optional, default 20.

### `memos_get_range`

Get memos created in an inclusive date range.

Input:

- `startDate` required, `YYYY-MM-DD`.
- `endDate` required, `YYYY-MM-DD`.
- `timezone` optional.
- `pageSize` optional, default 100.
- `maxPages` optional, default 20.

### `memos_on_this_day`

Get historical memos from the same month/day.

Input:

- `month` optional, 1-12.
- `day` optional, 1-31.
- `timezone` optional.
- `pageSize` optional, default 100.
- `maxPages` optional, default 20.

### `memos_get_by_tag`

Get memos with a tag.

Input:

- `tag` required. Accepts `work` or `#work`.
- `pageSize` optional, default 100.
- `maxPages` optional, default 20.

### `tags_list`

Aggregate tags and counts from scanned memos.

Input:

- `pageSize` optional, default 100.
- `maxPages` optional, default 20.

### `resources_list`

Aggregate resources/attachments from scanned memos.

Input:

- `pageSize` optional, default 100.
- `maxPages` optional, default 20.

## Semantic Index Tools

These tools are registered only when `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=true`.

### `memos_sync_index`

Sync Memos data into the local semantic index.

Input:

- `pageSize` optional, default 100.
- `maxPages` optional, default 20.

The tool reads Memos pages, sends memo content to the configured OpenAI-compatible embedding endpoint, and writes the local JSON index at `MEMOS_MCP_INDEX_DB`.

### `memos_index_status`

Inspect semantic index status.

Input:

- none.

Returns whether the semantic profile is enabled, whether the index is ready, memo count, index path, embedding model, dimensions, and update time.

## Write Tools

### `memos_create`

Create a memo.

Input:

- `content` required.
- `visibility` required: `PRIVATE`, `PROTECTED`, or `PUBLIC`.

When `MEMOS_MCP_READONLY=true`, this tool is not registered.

### `memos_update`

Update an existing memo.

Input:

- `name` required. Accepts `123` or `memos/123`.
- `content` optional.
- `visibility` optional: `PRIVATE`, `PROTECTED`, or `PUBLIC`.
- `pinned` optional boolean.
- `state` optional: `NORMAL` or `ARCHIVED`.

At least one of `content`, `visibility`, `pinned`, or `state` is required.

This tool is only registered when `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true` and `MEMOS_MCP_READONLY=false`.

### `memos_archive`

Archive an existing memo by setting `state` to `ARCHIVED`.

Input:

- `name` required. Accepts `123` or `memos/123`.

This tool is only registered when `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true` and `MEMOS_MCP_READONLY=false`.

## Local Aggregation Caveat

Time, tag, and resource tools use paginated `memos_list` data and aggregate locally for compatibility across Memos versions. Increase `maxPages` if the result set is too small.
