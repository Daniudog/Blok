"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Upload } from "./components/Upload";
import { FileList } from "./components/FileList";
import { Albums } from "./components/Albums";
import { Help } from "./components/Help";
import { Transfer } from "./components/Transfer";
import { useState, useEffect } from "react";

interface PublicFile {
  blobId: string;
  name: string;
  size: number;
  type: string;
  storedAt: number;
  wallet: string;
  isPublic: boolean;
  isEncrypted: boolean;
}

function fmtSize(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function fmtDate(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

export default function Home() {
  const account = useCurrentAccount();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "files" | "albums" | "transfer" | "help">("upload");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#08080f",
      color: "#f0f0ff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      overflowX: "hidden",
    }}>
      {/* Ambient */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99,76,255,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(99,76,255,0.07) 0%, transparent 60%)",
      }} />

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,8,15,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 2rem", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "30px", height: "30px",
            background: "linear-gradient(135deg, #7c6aff, #a78bfa)",
            borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(124,106,255,0.4)", flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" fill="white"/>
              <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" fill="white"/>
            </svg>
          </div>
          <span style={{ fontWeight: "700", fontSize: "17px", letterSpacing: "-0.4px" }}>Blok</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {account && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(79,255,176,0.08)", border: "1px solid rgba(79,255,176,0.15)",
              borderRadius: "100px", padding: "4px 12px",
            }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#4fffb0", boxShadow: "0 0 8px #4fffb0",
                animation: "pulse 2s ease infinite",
              }} />
              <span style={{ fontSize: "12px", color: "#4fffb0", fontWeight: "500" }}>
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </span>
            </div>
          )}
          <ConnectButton />
        </div>
      </header>

      {/* Body */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {!account ? (
          <PublicPage />
        ) : (
          <Dashboard
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            refreshKey={refreshKey}
            onRefresh={() => { setRefreshKey(k => k + 1); setActiveTab("files"); }}
          />
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .fade-up { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
        .d1{animation-delay:80ms;opacity:0}
        .d2{animation-delay:160ms;opacity:0}
        .d3{animation-delay:240ms;opacity:0}
        .d4{animation-delay:320ms;opacity:0}
        .d5{animation-delay:400ms;opacity:0}
        .file-row { transition: background 0.15s, border-color 0.15s; }
        .file-row:hover { background: rgba(124,106,255,0.06) !important; border-color: rgba(124,106,255,0.25) !important; }
        .act-btn { transition: all 0.15s; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 7px 10px; color: #8888aa; cursor: pointer; font-size: 14px; }
        .act-btn:hover { background: rgba(124,106,255,0.15); border-color: rgba(124,106,255,0.35); color: #a78bfa; }
        input:focus,select:focus { outline: none; border-color: rgba(124,106,255,0.5) !important; box-shadow: 0 0 0 3px rgba(124,106,255,0.1) !important; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
      `}</style>
    </div>
  );
}

function PublicPage() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PublicFile[]>([]);
  const [searched, setSearched] = useState(false);
  const [publicFiles, setPublicFiles] = useState<PublicFile[]>([]);
  const [previewFile, setPreviewFile] = useState<PublicFile | null>(null);

  useEffect(() => {
    const all: PublicFile[] = JSON.parse(localStorage.getItem("blok_files") || "[]");
    setPublicFiles(all.filter(f => f.isPublic).sort((a, b) => b.storedAt - a.storedAt));
  }, []);

  function handleSearch() {
    if (!search.trim()) return;
    const all: PublicFile[] = JSON.parse(localStorage.getItem("blok_files") || "[]");
    const results = all.filter(f =>
      f.isPublic && (
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.blobId.toLowerCase().includes(search.toLowerCase())
      )
    );
    setSearchResults(results);
    setSearched(true);
  }

  return (
    <div>
      {/* Hero */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "5rem 2rem 3rem", textAlign: "center" }}>

        <div className="fade-up" style={{ marginBottom: "1.5rem" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)",
            borderRadius: "100px", padding: "5px 14px",
            fontSize: "12px", color: "#a78bfa", fontWeight: "500",
          }}>
            ⚡ Built on Sui · Powered by Walrus
          </span>
        </div>

        <h1 className="fade-up d1" style={{
          fontSize: "clamp(38px, 7vw, 66px)", fontWeight: "800",
          lineHeight: 1.05, letterSpacing: "-2px", marginBottom: "1.25rem",
        }}>
          Your files.{" "}
          <span style={{
            background: "linear-gradient(135deg, #7c6aff, #c084fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Owned forever.
          </span>
        </h1>

        <p className="fade-up d2" style={{
          color: "#8888aa", fontSize: "clamp(14px, 2vw, 17px)",
          maxWidth: "480px", margin: "0 auto 2.5rem", lineHeight: 1.7,
        }}>
          Store any file permanently on Walrus. Encrypt privately or share publicly.
          Owned entirely by your Sui wallet — not by us.
        </p>

        {/* Pills */}
        <div className="fade-up d3" style={{
          display: "flex", gap: "10px", justifyContent: "center",
          flexWrap: "wrap", marginBottom: "2.5rem",
        }}>
          {[
            { icon: "🔒", label: "AES-256 Encrypted" },
            { icon: "🌊", label: "Stored on Walrus" },
            { icon: "⛓️", label: "Anchored on Sui" },
            { icon: "👁️", label: "Public or Private" },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "7px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "100px", fontSize: "13px", color: "#8888aa",
            }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="fade-up d4">
          <ConnectButton />
        </div>

        {/* Stats */}
        <div className="fade-up d5" style={{
          display: "flex", gap: "3rem", justifyContent: "center",
          marginTop: "4rem", flexWrap: "wrap",
        }}>
          {[
            { value: "∞", label: "Permanent storage" },
            { value: "0", label: "Files we can read" },
            { value: "100%", label: "User owned" },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{
                fontSize: "32px", fontWeight: "800", letterSpacing: "-1px",
                background: "linear-gradient(135deg, #7c6aff, #c084fc)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{stat.value}</div>
              <div style={{ fontSize: "12px", color: "#55556a", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search section */}
      <div style={{
        maxWidth: "760px", margin: "0 auto", padding: "0 2rem 3rem",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "16px", padding: "1.5rem",
          marginBottom: "2rem",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px", letterSpacing: "-0.3px" }}>
            🔍 Search Public Files
          </h2>
          <p style={{ fontSize: "13px", color: "#8888aa", marginBottom: "1rem" }}>
            Search by filename or blob ID — no wallet required
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search by filename or blob ID..."
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px", color: "#f0f0ff",
                padding: "10px 14px", fontSize: "14px",
                outline: "none", fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                padding: "10px 20px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #7c6aff, #6355e0)",
                color: "white", fontWeight: "600", fontSize: "14px",
                cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)",
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}
            >
              Search
            </button>
          </div>

          {/* Search results */}
          {searched && (
            <div style={{ marginTop: "1.25rem" }}>
              {searchResults.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#8888aa", fontSize: "14px" }}>
                  No public files found for "{search}"
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#55556a", marginBottom: "4px" }}>
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                  </div>
                  {searchResults.map(file => (
                    <PublicFileCard key={file.blobId} file={file} onPreview={() => setPreviewFile(file)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Explore section */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.3px", marginBottom: "3px" }}>
                🌐 Explore Public Files
              </h2>
              <p style={{ fontSize: "13px", color: "#8888aa" }}>
                Recently stored public files on Blok — viewable by anyone
              </p>
            </div>
            {publicFiles.length > 0 && (
              <span style={{
                padding: "4px 12px", borderRadius: "100px",
                background: "rgba(79,255,176,0.08)",
                border: "1px solid rgba(79,255,176,0.2)",
                color: "#4fffb0", fontSize: "11px", fontWeight: "600",
              }}>
                {publicFiles.length} public file{publicFiles.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {publicFiles.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "4rem 2rem",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "16px",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "1rem", animation: "float 3s ease infinite" }}>🌊</div>
              <div style={{ fontWeight: "600", marginBottom: "6px" }}>No public files yet</div>
              <div style={{ fontSize: "13px", color: "#8888aa", marginBottom: "1.5rem" }}>
                Connect your wallet and upload the first public file to Blok
              </div>
              <ConnectButton />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {publicFiles.map((file, i) => (
                <div key={file.blobId} style={{ animation: `fadeUp 0.3s ease ${i * 50}ms forwards`, opacity: 0 }}>
                  <PublicFileCard file={file} onPreview={() => setPreviewFile(file)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewFile && (
        <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}

function PublicFileCard({ file, onPreview }: { file: PublicFile; onPreview: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(file.blobId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="file-row" style={{
      display: "flex", alignItems: "center", gap: "12px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "12px", padding: "12px 14px",
    }}>
      <div style={{
        width: "40px", height: "40px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "20px", flexShrink: 0, color: typeColor(file.type),
      }}>
        {fileIcon(file.type)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
          <span style={{
            fontSize: "14px", fontWeight: "500",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: "200px",
          }}>
            {file.name}
          </span>
          <span style={{
            padding: "2px 8px", borderRadius: "100px",
            background: "rgba(79,195,255,0.1)", color: "#4fc3ff",
            border: "1px solid rgba(79,195,255,0.2)",
            fontSize: "10px", fontWeight: "600", flexShrink: 0,
          }}>
            🌐 Public
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#55556a", display: "flex", gap: "8px" }}>
          <span>{fmtSize(file.size)}</span>
          <span>·</span>
          <span>{fmtDate(file.storedAt)}</span>
          <span>·</span>
          <span style={{ fontFamily: "monospace" }}>{file.blobId.slice(0, 10)}...</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <button className="act-btn" title="Preview" onClick={onPreview}>👁️</button>
        <button
          className="act-btn"
          title={copied ? "Copied!" : "Copy Blob ID"}
          onClick={copy}
          style={{ color: copied ? "#4fffb0" : undefined }}
        >
          {copied ? "✓" : "⎘"}
        </button>
        <button
          className="act-btn"
          title="View on Walrus"
          onClick={() => window.open("https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + file.blobId, "_blank")}
          style={{ color: "#a78bfa", borderColor: "rgba(124,106,255,0.2)", background: "rgba(124,106,255,0.08)" }}
        >
          🌊
        </button>
        <button
          className="act-btn"
          title="Download"
          onClick={async () => {
            const res = await fetch("https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + file.blobId);
            const buf = await res.arrayBuffer();
            const url = URL.createObjectURL(new Blob([buf], { type: file.type }));
            const a = document.createElement("a");
            a.href = url; a.download = file.name; a.click();
            URL.revokeObjectURL(url);
          }}
        >
          ⬇
        </button>
      </div>
    </div>
  );
}

function PreviewModal({ file, onClose }: { file: PublicFile; onClose: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + file.blobId);
        const buf = await res.arrayBuffer();
        const url = URL.createObjectURL(new Blob([buf], { type: file.type }));
        setPreviewUrl(url);
      } catch {
        setPreviewUrl(null);
      }
      setLoading(false);
    }
    load();
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [file.blobId]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease forwards",
    }} onClick={onClose}>
      <div style={{
        background: "#0f0f1a", border: "1px solid rgba(124,106,255,0.2)",
        borderRadius: "16px", padding: "1.5rem",
        width: "100%", maxWidth: "600px", margin: "1rem",
        boxShadow: "0 0 60px rgba(124,106,255,0.15)",
        animation: "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontWeight: "600", fontSize: "15px", marginBottom: "3px" }}>{file.name}</div>
            <div style={{ fontSize: "12px", color: "#8888aa" }}>{fmtSize(file.size)} · {fmtDate(file.storedAt)}</div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px", padding: "6px 12px", color: "#8888aa",
            cursor: "pointer", fontSize: "14px",
          }}>✕</button>
        </div>

        <div style={{
          background: "rgba(0,0,0,0.4)", borderRadius: "12px",
          overflow: "hidden", minHeight: "200px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {loading ? (
            <div style={{ color: "#8888aa", fontSize: "14px" }}>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: "8px" }}>⟳</span>
              Loading preview...
            </div>
          ) : previewUrl && file.type.startsWith("image/") ? (
            <img src={previewUrl} alt={file.name} style={{ maxWidth: "100%", maxHeight: "400px", objectFit: "contain" }} />
          ) : previewUrl && file.type.startsWith("video/") ? (
            <video src={previewUrl} controls style={{ maxWidth: "100%", maxHeight: "400px" }} />
          ) : previewUrl && file.type.startsWith("audio/") ? (
            <audio src={previewUrl} controls style={{ width: "100%" }} />
          ) : (
            <div style={{ textAlign: "center", padding: "2rem", color: "#8888aa" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
              <div style={{ fontSize: "14px" }}>Preview not available for this file type</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "1rem" }}>
          <button
            onClick={() => window.open("https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + file.blobId, "_blank")}
            style={{
              flex: 1, padding: "10px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #7c6aff, #6355e0)",
              color: "white", fontWeight: "600", fontSize: "13px",
              cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)",
            }}
          >
            🌊 View on Walrus
          </button>
          <button onClick={onClose} style={{
            padding: "10px 20px", borderRadius: "10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#8888aa", cursor: "pointer", fontSize: "13px",
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ activeTab, setActiveTab, refreshKey, onRefresh }: {
 activeTab: "upload" | "files" | "albums" | "transfer" | "help";
  setActiveTab: (t: "upload" | "files" | "albums" | "transfer" | "help") => void;
  refreshKey: number;
  onRefresh: () => void;
}) {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>
      <div style={{
        display: "flex", gap: "4px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px", padding: "4px",
        width: "fit-content", marginBottom: "2rem",
      }}>
        {[
        { id: "upload", icon: "⬆️", label: "Upload" },
        { id: "files", icon: "📁", label: "My Files" },
        { id: "albums", icon: "🗂️", label: "Albums" },
        { id: "transfer", icon: "📤", label: "Transfer" },
        { id: "help", icon: "❓", label: "Help" },
      ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as "upload" | "files" | "albums")} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "7px 18px", borderRadius: "9px", border: "none",
            cursor: "pointer", fontSize: "13px", fontWeight: "500",
            background: activeTab === tab.id ? "linear-gradient(135deg, #7c6aff, #6355e0)" : "transparent",
            color: activeTab === tab.id ? "white" : "#8888aa",
            boxShadow: activeTab === tab.id ? "0 0 20px rgba(124,106,255,0.35)" : "none",
            transition: "all 0.2s ease",
          }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="scale-in" key={activeTab}>
        {activeTab === "upload" && <Upload onSuccess={onRefresh} />}
        {activeTab === "files" && <FileList key={refreshKey} />}
        {activeTab === "albums" && <Albums />}
        {activeTab === "transfer" && <Transfer />}
        {activeTab === "help" && <Help />}
      </div>
    </div>
  );
}