"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";

interface StoredFile {
  blobId: string;
  name: string;
  size: number;
  type: string;
  storedAt: number;
  wallet: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FileList() {
  const account = useCurrentAccount();
  if (!account) return null;

  const all: StoredFile[] = JSON.parse(
    localStorage.getItem("philes_files") || "[]"
  );
  const files = all.filter((f) => f.wallet === account.address);

  if (files.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <div style={{ fontSize: "32px", marginBottom: "1rem" }}>🗂️</div>
        <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          No files stored yet. Upload your first file above.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "600" }}>Your files</h2>
        <span className="badge badge-success">{files.length} stored</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {files.map((file) => (
          <div key={file.blobId} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem" }}>
            <div style={{ width: "40px", height: "40px", background: "rgba(232,255,71,0.08)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
              {file.type.startsWith("image/") ? "🖼️" : file.type.startsWith("video/") ? "🎬" : file.type.startsWith("audio/") ? "🎵" : file.type.includes("pdf") ? "📄" : "📁"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: "500", fontSize: "14px", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {formatSize(file.size)} · {formatDate(file.storedAt)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <span className="badge badge-success">On Walrus</span>
              <button
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: "12px" }}
                onClick={() => navigator.clipboard.writeText(file.blobId)}
              >
                Copy Blob ID
              </button>
              <button
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: "12px", color: "var(--accent)", borderColor: "var(--accent)" }}
                onClick={() => window.open("https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + file.blobId, "_blank")}
              >
                View on Walrus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}