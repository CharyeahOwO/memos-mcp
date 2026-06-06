const baseUrl = process.env.MEMOS_BASE_URL?.replace(/\/+$/, "");
const token = process.env.MEMOS_ACCESS_TOKEN;
const writeEnabled = ["1", "true", "yes", "on"].includes(
  (process.env.MEMOS_MCP_SMOKE_WRITE ?? "").toLowerCase()
);

if (!baseUrl) {
  throw new Error("MEMOS_BASE_URL is required for smoke:memos");
}

if (!token) {
  throw new Error("MEMOS_ACCESS_TOKEN is required for smoke:memos");
}

const response = await fetch(`${baseUrl}/api/v1/memos?pageSize=1`, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  },
});

if (!response.ok) {
  const body = await response.text().catch(() => "");
  throw new Error(`Memos API smoke test failed with HTTP ${response.status}: ${body.trim()}`);
}

await response.json();

if (!writeEnabled) {
  console.log("Memos API read smoke test passed");
} else {
  await runWriteSmoke();
}

async function runWriteSmoke() {
  const marker = `memos-mcp smoke ${new Date().toISOString()}`;
  const createResponse = await fetch(`${baseUrl}/api/v1/memos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: `${marker}\n\ninitial`,
      visibility: "PRIVATE",
    }),
  });

  if (!createResponse.ok) {
    const body = await createResponse.text().catch(() => "");
    throw new Error(`Memos API create smoke failed with HTTP ${createResponse.status}: ${body.trim()}`);
  }

  const created = await createResponse.json();
  const memoName = created?.name;
  if (typeof memoName !== "string" || !memoName.startsWith("memos/")) {
    throw new Error(`Memos API create smoke returned invalid memo name: ${JSON.stringify(created)}`);
  }

  const updateResponse = await fetch(
    `${baseUrl}/api/v1/${memoName}?updateMask=${encodeURIComponent("content,visibility,pinned")}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: memoName,
        content: `${marker}\n\nupdated`,
        visibility: "PRIVATE",
        pinned: false,
      }),
    }
  );

  if (!updateResponse.ok) {
    const body = await updateResponse.text().catch(() => "");
    throw new Error(`Memos API update smoke failed with HTTP ${updateResponse.status}: ${body.trim()}`);
  }

  const archiveResponse = await fetch(
    `${baseUrl}/api/v1/${memoName}?updateMask=${encodeURIComponent("state")}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: memoName,
        state: "ARCHIVED",
      }),
    }
  );

  if (!archiveResponse.ok) {
    const body = await archiveResponse.text().catch(() => "");
    throw new Error(`Memos API archive smoke failed with HTTP ${archiveResponse.status}: ${body.trim()}`);
  }

  console.log(`Memos API write smoke test passed (${memoName} created and archived)`);
}
