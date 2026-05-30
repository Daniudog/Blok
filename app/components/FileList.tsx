"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";

interface StoredFile {
  blobId: string;
  name: string;
  size: number;
  type: string;
  storedAt: number;
  wallet: string;
  isPublic: boolean;
  isPrivate?: boolean;
  isLocked?: boolean;
  isEncrypted: boolean;
  visibility?: "public" | "private" | "locked";
  suiDigest?: string;
}

function fmtSize(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  if (type.includes("zip") || type.includes("rar")) return "🗜️";
  if (type.includes("text") || type.includes("document")) return "📝";
  return "📁";
}

function typeColor(type: string) {
  if (type.startsWith("image/")) return "#ff7eb3";
  if (type.startsWith("video/")) return "#7eb3ff";
  if (type.startsWith("audio/")) return "#b37eff";
  if (type.includes("pdf") || type.includes("text") || type.includes("document")) return "#7effd4";
  return "#8888aa";
}

async function deriveKey(sig: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sig.slice(0, 32).padEnd(32, "0")),
    "AES-GCM", false, ["encrypt", "decrypt"]
  );
}

async function decryptBuffer(buf: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = buf.slice(0, 12);
  const data = buf.slice(12);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, data);
}

function getVisibilityConfig(file: StoredFile) {
  if (file.isPublic || file.visibility === "public") {
    return { label: "Public", icon: "🌐", color: "#4fc3ff", bg: "rgba(79,195,255,0.1)", border: "rgba(79,195,255,0.2)" };
  }
  if (file.isLocked || file.visibility === "locked") {
    return { label: "Locked", icon: "🔒", color: "#4fffb0", bg: "rgba(79,255,176,0.1)", border: "rgba(79,255,176,0.2)" };
  }
  return { label: "Private", icon: "👁️", color: "#a78bfa", bg: "rgba(124,106,255,0.1)", border: "rgba(124,106,255,0.2)" };
}

function isLocked(file: StoredFile) {
  return file.isLocked === true || file.visibility === "locked";
}

export function FileList() {
  const account = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [sort, setSort] = useState<"date" | "size" | "name" | "type">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [shareAddr, setShareAddr] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null);

  useEffect(() => {
    if (!account) return;
    const all: StoredFile[] = JSON.parse(localStorage.getItem("blok_files") || "[]");
    setFiles(all.filter(f => f.wallet === account.address));
  }, [account]);

  if (!account) return null;

  let shown = [...files];
  if (search) shown = shown.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  if (filter !== "all") {
    shown = shown.filter(f => {
      if (filter === "image") return f.type.startsWith("image/");
      if (filter === "video") return f.type.startsWith("video/");
      if (filter === "audio") return f.type.startsWith("audio/");
      if (filter === "document") return f.type.includes("pdf") || f.type.includes("text") || f.type.includes("document");
      if (filter === "public") return f.isPublic || f.visibility === "public";
      if (filter === "private") return !f.isPublic && !isLocked(f);
      if (filter === "locked") return isLocked(f);
      return true;
    });
  }
  shown.sort((a, b) => {
    let v = 0;
    if (sort === "date") v = a.storedAt - b.storedAt;
    if (sort === "size") v = a.size - b.size;
    if (sort === "name") v = a.name.localeCompare(b.name);
    if (sort === "type") v = a.type.localeCompare(b.type);
    return sortDir === "desc" ? -v : v;
  });

  function toggleSort(field: typeof sort) {
    if (sort === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSort(field); setSortDir("desc"); }
  }

  async function download(file: StoredFile) {
    if (!account) return;
    setDownloading(file.blobId);
    try {
      const res = await fetch("/api/upload?blobId=" + file.blobId);
      if (!res.ok) throw new Error("Fetch failed");
      let buf = await res.arrayBuffer();
      if (isLocked(file)) {
        const { signature } = await signMessage({
          message: new TextEncoder().encode("Blok encryption key — " + account.address),
        });
        const key = await deriveKey(signature);
        buf = await decryptBuffer(buf, key);
      }
      const url = URL.createObjectURL(new Blob([buf], { type: file.type }));
      const a = document.createElement("a");
      a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Download failed: " + (e instanceof Error ? e.message : "Unknown"));
    }
    setDownloading(null);
  }

  function copy(blobId: string) {
    navigator.clipboard.writeText(blobId);
    setCopied(blobId);
    setTimeout(() => setCopied(null), 2000);
  }

  function confirmShare() {
    if (!shareAddr.trim() || !sharing) return;
    const all: StoredFile[] = JSON.parse(localStorage.getItem("blok_files") || "[]");
    const file = all.find(f => f.blobId === sharing);
    if (!file) return;
    const shared: StoredFile[] = JSON.parse(localStorage.getItem("blok_shared") || "[]");
    shared.unshift({ ...file, wallet: shareAddr.trim() });
    localStorage.setItem("blok_shared", JSON.stringify(shared));
    alert("Shared with " + shareAddr.slice(0, 10) + "...");
    setSharing(null); setShareAddr("");
  }

  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const publicCount = files.filter(f => f.isPublic || f.visibility === "public").length;
  const privateCount = files.filter(f => !f.isPublic && f.visibility !== "public" && !isLocked(f)).length;
  const lockedCount = files.filter(f => isLocked(f)).length;

  const typeBreakdown = [
    { label: "Images", color: "#ff7eb3", count: files.filter(f => f.type.startsWith("image/")).length },
    { label: "Videos", color: "#7eb3ff", count: files.filter(f => f.type.startsWith("video/")).length },
    { label: "Audio", color: "#b37eff", count: files.filter(f => f.type.startsWith("audio/")).length },
    { label: "Docs", color: "#7effd4", count: files.filter(f => f.type.includes("pdf") || f.type.includes("text") || f.type.includes("document")).length },
    { label: "Other", color: "#8888aa", count: files.filter(f => !f.type.startsWith("image/") && !f.type.startsWith("video/") && !f.type.startsWith("audio/") && !f.type.includes("pdf") && !f.type.includes("text") && !f.type.includes("document")).length },
  ].filter(t => t.count > 0);

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px", color: "#f0f0ff",
    padding: "8px 14px", fontSize: "13px",
    outline: "none", transition: "all 0.2s",
    fontFamily: "inherit",
  };

  return (
    <div style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}>

      {/* Preview modal */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          signMessage={signMessage}
          accountAddress={account.address}
        />
      )}

      {/* Share modal */}
      {sharing && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.2s ease forwards",
        }}>
          <div style={{
            background: "#0f0f1a", border: "1px solid rgba(124,106,255,0.25)",
            borderRadius: "16px", padding: "1.5rem",
            width: "100%", maxWidth: "440px", margin: "1rem",
            boxShadow: "0 0 60px rgba(124,106,255,0.15)",
            animation: "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Share File</h3>
            <p style={{ fontSize: "13px", color: "#8888aa", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Enter the Sui wallet address to share this file with.
            </p>
            <input style={{ ...inputStyle, width: "100%", marginBottom: "1rem" }}
              placeholder="0x... wallet address" value={shareAddr}
              onChange={e => setShareAddr(e.target.value)} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={confirmShare} style={{
                flex: 1, padding: "10px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #7c6aff, #6355e0)",
                color: "white", fontWeight: "600", fontSize: "14px",
                cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)",
              }}>Share File</button>
              <button onClick={() => { setSharing(null); setShareAddr(""); }} style={{
                padding: "10px 20px", borderRadius: "10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#8888aa", cursor: "pointer", fontSize: "14px",
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "3px", letterSpacing: "-0.4px" }}>My Files</h2>
        <p style={{ fontSize: "13px", color: "#8888aa" }}>
          All files stored permanently on Walrus. Private files are hidden from public. Locked files are encrypted.
        </p>
      </div>

      {/* Stats */}
      {files.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "1.5rem" }}>
          {[
            { icon: "📁", value: files.length.toString(), label: "Total files" },
            { icon: "💾", value: fmtSize(totalSize), label: "Total size" },
            { icon: "🌐", value: publicCount.toString(), label: "Public" },
            { icon: "👁️", value: privateCount.toString(), label: "Private" },
            { icon: "🔒", value: lockedCount.toString(), label: "Locked" },
          ].map((s, i) => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px", padding: "12px",
              textAlign: "center",
              animation: `fadeUp 0.3s ease ${i * 60}ms forwards`, opacity: 0,
            }}>
              <div style={{ fontSize: "18px", marginBottom: "5px" }}>{s.icon}</div>
              <div style={{
                fontSize: "18px", fontWeight: "800", letterSpacing: "-0.5px",
                background: "linear-gradient(135deg, #7c6aff, #c084fc)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: "#55556a", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Type chart */}
      {typeBreakdown.length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px", padding: "14px 16px", marginBottom: "1.5rem",
        }}>
          <div style={{ fontSize: "11px", color: "#55556a", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            File breakdown
          </div>
          <div style={{ height: "6px", borderRadius: "3px", overflow: "hidden", display: "flex", gap: "2px", marginBottom: "10px" }}>
            {typeBreakdown.map(t => (
              <div key={t.label} style={{ flex: t.count, background: t.color, borderRadius: "3px", transition: "flex 0.4s ease" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            {typeBreakdown.map(t => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#8888aa" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: t.color }} />
                {t.label} ({t.count})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: "160px" }}
          placeholder="🔍 Search files..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, width: "auto" }} value={filter}
          onChange={e => setFilter(e.target.value)}>
          <option value="all">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="document">Documents</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="locked">Locked</option>
        </select>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["date", "name", "size", "type"] as const).map(f => (
            <button key={f} onClick={() => toggleSort(f)} style={{
              padding: "7px 12px", borderRadius: "8px", border: "none",
              cursor: "pointer", fontSize: "12px", fontWeight: "500",
              background: sort === f ? "rgba(124,106,255,0.15)" : "rgba(255,255,255,0.04)",
              color: sort === f ? "#a78bfa" : "#8888aa", transition: "all 0.15s",
            }}>
              {f} {sort === f ? (sortDir === "desc" ? "↓" : "↑") : ""}
            </button>
          ))}
        </div>
      </div>

      {/* File count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <span style={{ fontSize: "13px", color: "#8888aa" }}>
          {shown.length} {shown.length === 1 ? "file" : "files"}{filter !== "all" || search ? " (filtered)" : ""}
        </span>
        {files.length > 0 && (
          <span style={{
            padding: "3px 10px", borderRadius: "100px",
            background: "rgba(79,255,176,0.08)", border: "1px solid rgba(79,255,176,0.2)",
            color: "#4fffb0", fontSize: "11px", fontWeight: "600",
          }}>
            {files.length} on Walrus
          </span>
        )}
      </div>

      {/* Empty state */}
      {files.length === 0 && (
        <div style={{ textAlign: "center", padding: "5rem 0", animation: "fadeUp 0.4s ease forwards" }}>
          <div style={{ fontSize: "52px", marginBottom: "1rem" }}>🗂️</div>
          <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "6px" }}>No files yet</div>
          <div style={{ fontSize: "13px", color: "#8888aa" }}>Upload your first file to get started</div>
        </div>
      )}

      {/* File list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {shown.map((file, i) => {
          const vis = getVisibilityConfig(file);
          return (
            <div key={file.blobId} style={{
              display: "flex", alignItems: "center", gap: "12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px", padding: "12px 14px",
              transition: "all 0.2s ease",
              animation: `fadeUp 0.3s ease ${i * 40}ms forwards`, opacity: 0,
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,106,255,0.3)";
                (e.currentTarget as HTMLDivElement).style.background = "rgba(124,106,255,0.05)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
              }}
            >
              {/* Icon */}
              <div style={{
                width: "42px", height: "42px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: "20px", flexShrink: 0, color: typeColor(file.type),
              }}>
                {fileIcon(file.type)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "14px", fontWeight: "500",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px",
                  }}>
                    {file.name}
                  </span>
                  <span style={{
                    padding: "2px 8px", borderRadius: "100px", fontSize: "10px", fontWeight: "600",
                    background: vis.bg, color: vis.color,
                    border: `1px solid ${vis.border}`, flexShrink: 0,
                  }}>
                    {vis.icon} {vis.label}
                  </span>
                  {file.suiDigest && (
                    <span
                      onClick={() => window.open("https://suiscan.xyz/testnet/tx/" + file.suiDigest, "_blank")}
                      style={{
                        padding: "2px 8px", borderRadius: "100px", fontSize: "10px", fontWeight: "600",
                        background: "rgba(79,195,255,0.08)", color: "#4fc3ff",
                        border: "1px solid rgba(79,195,255,0.2)",
                        cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                      }}
                    >
                      ⛓ Sui
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#55556a", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span>{fmtSize(file.size)}</span>
                  <span>·</span>
                  <span>{fmtDate(file.storedAt)}</span>
                  <span>·</span>
                  <span style={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }}>
                    {file.blobId.slice(0, 10)}...
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button title="Preview" onClick={() => setPreviewFile(file)}
                  style={{
                    transition: "all 0.15s", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
                    padding: "7px 10px", color: "#8888aa", cursor: "pointer", fontSize: "14px",
                  }}>
                  👁️
                </button>
                <button title="Copy Blob ID" onClick={() => copy(file.blobId)}
                  style={{
                    transition: "all 0.15s",
                    background: copied === file.blobId ? "rgba(79,255,176,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${copied === file.blobId ? "rgba(79,255,176,0.3)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "8px", padding: "7px 10px",
                    color: copied === file.blobId ? "#4fffb0" : "#8888aa",
                    cursor: "pointer", fontSize: "14px",
                  }}>
                  {copied === file.blobId ? "✓" : "⎘"}
                </button>
                <button title="Share with wallet" onClick={() => setSharing(file.blobId)}
                  style={{
                    transition: "all 0.15s", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
                    padding: "7px 10px", color: "#8888aa", cursor: "pointer", fontSize: "14px",
                  }}>↗</button>
                <button title="Download" onClick={() => download(file)}
                  disabled={downloading === file.blobId}
                  style={{
                    transition: "all 0.15s", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
                    padding: "7px 10px", color: "#8888aa", cursor: "pointer", fontSize: "14px",
                    opacity: downloading === file.blobId ? 0.5 : 1,
                  }}>
                  {downloading === file.blobId
                    ? <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                    : "⬇"}
                </button>
                <button title="View on Walrus"
                  onClick={() => window.open("https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + file.blobId, "_blank")}
                  style={{
                  transition: "all 0.15s", background: "rgba(124,106,255,0.08)",
                  border: "1px solid rgba(124,106,255,0.2)", borderRadius: "8px",
                  padding: "7px 10px", color: "#a78bfa", cursor: "pointer", fontSize: "14px",
                }}>🌊</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewModal({ file, onClose, signMessage, accountAddress }: {
  file: StoredFile;
  onClose: () => void;
  signMessage: (args: { message: Uint8Array }) => Promise<{ signature: string }>;
  accountAddress: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsDecrypt, setNeedsDecrypt] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState("");

  const locked = file.isLocked || file.visibility === "locked" || file.isEncrypted;

  useEffect(() => {
    if (locked) {
      setLoading(false);
      setNeedsDecrypt(true);
      return;
    }
    loadFile();
  }, []);

  async function loadFile(key?: CryptoKey) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + file.blobId);
      if (!res.ok) throw new Error("Failed to fetch from Walrus");
      let buf = await res.arrayBuffer();
      if (key) {
        buf = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: new Uint8Array(buf.slice(0, 12)) },
          key,
          buf.slice(12)
        );
      }
      const objectUrl = URL.createObjectURL(new Blob([buf], { type: file.type }));
      setUrl(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load file");
    }
    setLoading(false);
  }

  async function handleDecrypt() {
    setDecrypting(true);
    try {
      const { signature } = await signMessage({
        message: new TextEncoder().encode("Blok encryption key — " + accountAddress),
      });
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(signature.slice(0, 32).padEnd(32, "0")),
        "AES-GCM", false, ["encrypt", "decrypt"]
      );
      setNeedsDecrypt(false);
      await loadFile(key);
    } catch {
      setError("Decryption failed. Please try again.");
    }
    setDecrypting(false);
  }

  useEffect(() => {
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [url]);

  const canPreview = url && (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/") ||
    file.type.includes("text") ||
    file.type.includes("pdf")
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease forwards",
    }} onClick={onClose}>
      <div style={{
        background: "#0f0f1a", border: "1px solid rgba(124,106,255,0.2)",
        borderRadius: "16px", padding: "1.5rem",
        width: "100%", maxWidth: "680px", margin: "1rem",
        boxShadow: "0 0 60px rgba(124,106,255,0.15)",
        animation: "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
        maxHeight: "90vh", display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: "600", fontSize: "15px", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </div>
            <div style={{ fontSize: "12px", color: "#8888aa", display: "flex", gap: "8px" }}>
              <span>{fmtSize(file.size)}</span>
              <span>·</span>
              <span>{fmtDate(file.storedAt)}</span>
              {locked && <><span>·</span><span style={{ color: "#4fffb0" }}>🔒 Locked</span></>}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px", padding: "6px 12px", color: "#8888aa",
            cursor: "pointer", fontSize: "14px", marginLeft: "1rem", flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{
          background: "rgba(0,0,0,0.4)", borderRadius: "12px",
          overflow: "auto", flex: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "200px", maxHeight: "500px",
        }}>
          {/* Needs wallet to decrypt */}
          {needsDecrypt && (
            <div style={{ textAlign: "center", padding: "2.5rem" }}>
              <div style={{ fontSize: "44px", marginBottom: "1rem" }}>🔒</div>
              <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "8px" }}>
                This file is locked
              </div>
              <div style={{ fontSize: "13px", color: "#8888aa", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                Sign with your wallet to decrypt and preview this file.
                Your key never leaves your device.
              </div>
              <button onClick={handleDecrypt} disabled={decrypting} style={{
                padding: "10px 28px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #7c6aff, #6355e0)",
                color: "white", fontWeight: "600", fontSize: "14px",
                cursor: decrypting ? "not-allowed" : "pointer",
                boxShadow: "0 0 20px rgba(124,106,255,0.35)",
                display: "flex", alignItems: "center", gap: "8px", margin: "0 auto",
              }}>
                {decrypting
                  ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Decrypting...</>
                  : "🔑 Sign to Decrypt & Preview"}
              </button>
              {error && <div style={{ fontSize: "12px", color: "#ff4f6a", marginTop: "1rem" }}>{error}</div>}
            </div>
          )}

          {/* Loading */}
          {loading && !needsDecrypt && (
            <div style={{ color: "#8888aa", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
              Loading preview...
            </div>
          )}

          {/* Error */}
          {error && !needsDecrypt && (
            <div style={{ textAlign: "center", padding: "2rem", color: "#ff4f6a" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
              <div style={{ fontSize: "14px" }}>{error}</div>
            </div>
          )}

          {/* Image */}
          {url && file.type.startsWith("image/") && (
            <img src={url} alt={file.name} style={{ maxWidth: "100%", maxHeight: "480px", objectFit: "contain", borderRadius: "8px" }} />
          )}

          {/* Video */}
          {url && file.type.startsWith("video/") && (
            <video src={url} controls style={{ maxWidth: "100%", maxHeight: "480px", borderRadius: "8px" }} />
          )}

          {/* Audio */}
          {url && file.type.startsWith("audio/") && (
            <div style={{ padding: "2rem", width: "100%" }}>
              <div style={{ fontSize: "48px", textAlign: "center", marginBottom: "1rem" }}>🎵</div>
              <audio src={url} controls style={{ width: "100%" }} />
            </div>
          )}

          {/* No preview available */}
          {url && !canPreview && (
            <div style={{ textAlign: "center", padding: "2rem", color: "#8888aa" }}>
              <div style={{ fontSize: "44px", marginBottom: "12px" }}>📄</div>
              <div style={{ fontSize: "14px", marginBottom: "1rem" }}>Preview not available for this file type</div>
              <div style={{ fontSize: "12px", color: "#55556a" }}>Use the download button to open this file</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {url && (
          <div style={{ display: "flex", gap: "8px", marginTop: "1rem" }}>
            <button
              onClick={async () => {
                const res = await fetch("https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + file.blobId);
                const buf = await res.arrayBuffer();
                const a = document.createElement("a");
                a.href = url; a.download = file.name; a.click();
              }}
              style={{
                flex: 1, padding: "10px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #7c6aff, #6355e0)",
                color: "white", fontWeight: "600", fontSize: "13px",
                cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)",
              }}
            >
              ⬇ Download
            </button>
            <button onClick={onClose} style={{
              padding: "10px 20px", borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#8888aa", cursor: "pointer", fontSize: "13px",
            }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}