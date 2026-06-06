"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

interface ActivityItem {
  action: string;
  blobId: string;
  timestamp: number;
  viewer?: string;
  from?: string;
  to?: string;
  fileName?: string;
}

function fmtTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function actionIcon(action: string) {
  if (action === "view") return "👁️";
  if (action === "download") return "⬇";
  if (action === "transfer") return "📤";
  if (action === "upload") return "⬆";
  return "📋";
}

function actionLabel(action: string) {
  if (action === "view") return "File viewed";
  if (action === "download") return "File downloaded";
  if (action === "transfer") return "File transferred";
  if (action === "upload") return "File uploaded";
  return "Activity";
}

export function Activity() {
  const account = useCurrentAccount();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("blok_activity") || "[]");
    setActivity(stored);
  }, []);

  if (!account) return null;

  const filtered = filter === "all" ? activity : activity.filter(a => a.action === filter);

  // Detect suspicious activity — multiple views of same file in short time
  const suspiciousBlobs = activity.reduce((acc: Record<string, number>, item) => {
    if (item.action === "view") {
      acc[item.blobId] = (acc[item.blobId] || 0) + 1;
    }
    return acc;
  }, {});
  const suspicious = Object.entries(suspiciousBlobs).filter(([, count]) => count > 5);

  const downloads = activity.filter(a => a.action === "download").length;
  const views = activity.filter(a => a.action === "view").length;
  const transfers = activity.filter(a => a.action === "transfer").length;

  return (
    <div style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}>

      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", letterSpacing: "-0.4px" }}>Activity</h2>
        <p style={{ fontSize: "13px", color: "#8888aa" }}>Track file views, downloads, and transfers across your Blok library</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "1.5rem" }}>
        {[
          { icon: "👁️", value: views, label: "Views" },
          { icon: "⬇", value: downloads, label: "Downloads" },
          { icon: "📤", value: transfers, label: "Transfers" },
          { icon: "📋", value: activity.length, label: "Total events" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "18px", marginBottom: "5px" }}>{s.icon}</div>
            <div style={{ fontSize: "20px", fontWeight: "800", background: "linear-gradient(135deg, #7c6aff, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: "#55556a", marginTop: "2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Suspicious activity alert */}
      {suspicious.length > 0 && (
        <div style={{ background: "rgba(255,184,79,0.08)", border: "1px solid rgba(255,184,79,0.25)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <span style={{ fontSize: "20px", flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffb84f", marginBottom: "4px" }}>Suspicious activity detected</div>
            <div style={{ fontSize: "12px", color: "#8888aa", lineHeight: 1.5 }}>
              {suspicious.length} file{suspicious.length !== 1 ? "s have" : " has"} been viewed unusually often. This could indicate unauthorized access attempts.
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {["all", "view", "download", "transfer", "upload"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: "100px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "500", background: filter === f ? "rgba(124,106,255,0.2)" : "rgba(255,255,255,0.04)", color: filter === f ? "#a78bfa" : "#8888aa", outline: filter === f ? "1px solid rgba(124,106,255,0.4)" : "none", transition: "all 0.15s" }}>
            {f === "all" ? "All" : actionLabel(f)}
          </button>
        ))}
      </div>

      {/* Activity list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div style={{ fontSize: "48px", marginBottom: "1rem" }}>📋</div>
          <div style={{ fontWeight: "600", marginBottom: "6px" }}>No activity yet</div>
          <div style={{ fontSize: "13px", color: "#8888aa" }}>Activity will appear here as you and others interact with your files</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "12px 14px", transition: "all 0.2s", animation: `fadeUp 0.3s ease ${i * 30}ms forwards`, opacity: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,106,255,0.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <div style={{ width: "36px", height: "36px", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                {actionIcon(item.action)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: "500", marginBottom: "3px" }}>
                  {actionLabel(item.action)}
                  {item.from && <span style={{ color: "#8888aa", fontWeight: "400" }}> from {item.from.slice(0, 8)}...</span>}
                  {item.to && <span style={{ color: "#8888aa", fontWeight: "400" }}> to {item.to.slice(0, 8)}...</span>}
                </div>
                <div style={{ fontSize: "11px", color: "#55556a", fontFamily: "monospace" }}>
                  {item.blobId.slice(0, 16)}...
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "#55556a", flexShrink: 0 }}>
                {fmtTime(item.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}

      {activity.length > 0 && (
        <button onClick={() => { localStorage.removeItem("blok_activity"); setActivity([]); }} style={{ marginTop: "1rem", padding: "8px 16px", borderRadius: "8px", background: "rgba(255,79,106,0.08)", border: "1px solid rgba(255,79,106,0.2)", color: "#ff4f6a", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>
          Clear activity log
        </button>
      )}
    </div>
  );
}