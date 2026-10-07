export async function uploadMediaFile(file: File, onState: (state: string) => void) {
  onState("Checking image…");
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const checksumSha256 = [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("");
  const start = await fetch("/api/admin/media/uploads", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: file.name, mimeType: file.type, byteSize: file.size, checksumSha256 }),
  });
  const grant = await start.json();
  if (!start.ok) throw new Error(grant.error ?? "Could not start upload");
  onState("Uploading…");
  const put = await fetch(grant.uploadUrl, { method: "PUT", headers: grant.requiredHeaders, body: file });
  if (!put.ok) throw new Error(`Object storage rejected the upload (${put.status})`);
  onState("Validating…");
  const complete = await fetch("/api/admin/media/uploads", {
    method: "PUT", headers: { "content-type": "application/json" },
    body: JSON.stringify({ completionToken: grant.completionToken }),
  });
  const result = await complete.json();
  if (!complete.ok) throw new Error(result.error ?? "Image validation failed");
  return result as { item: { id: string; width: number; height: number; byteSize: number }; url: string };
}
