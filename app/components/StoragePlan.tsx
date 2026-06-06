"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";

interface StoredFile {
  size: number;
  wallet: string;
}

const FREE_LIMIT = 500 * 1024 * 1024; // 500MB
const PRO_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB

function fmtSize(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  if (b < 1073741824) return (b / 1048576).toFixed(1) + " MB";
  return (b / 1073741824).toFixed(1) + " GB";
}

export function StoragePlan() {
  const account = useCurrentAccount();

  if (!account) return null;

  const allFiles: StoredFile[] = JSON.parse(localStorage.getItem("blok_files") || "[]")
    .filter((f: StoredFile) => f.wallet === account.address);
  const used = allFiles.reduce((acc, f) => acc + f.size, 0);
  const pct = Math.min((used / FREE_LIMIT) * 100, 100);

  return (
    <div style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}>

      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", letterSpacing: "-0.4px" }}>Storage Plan</h2>
        <p style={{ fontSize: "13px", color: "#8888aa" }}>Manage your storage usage and plan</p>
      </div>

      {/* Current plan */}
      <div style={{ background: "rgba(124,106,255,0.06)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "18px" }}>⚡</span>
              <span style={{ fontSize: "16px", fontWeight: "700" }}>Free Plan</span>
              <span style={{ padding: "2px 8px", borderRadius: "100px", background: "rgba(124,106,255,0.15)", color: "#a78bfa", fontSize: "11px", fontWeight: "600", border: "1px solid rgba(124,106,255,0.3)" }}>Testnet</span>
            </div>
            <div style={{ fontSize: "13px", color: "#8888aa" }}>
              {fmtSize(used)} used of {fmtSize(FREE_LIMIT)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "24px", fontWeight: "800", background: "linear-gradient(135deg, #7c6aff, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {pct.toFixed(1)}%
            </div>
            <div style={{ fontSize: "11px", color: "#55556a" }}>storage used</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: pct + "%",
            background: pct > 80 ? "linear-gradient(90deg, #ff4f6a, #ff7eb3)" : "linear-gradient(90deg, #7c6aff, #a78bfa)",
            borderRadius: "4px",
            transition: "width 0.6s ease",
          }} />
        </div>

        {pct > 80 && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#ff4f6a" }}>
            ⚠️ You are using over 80% of your free storage. Consider upgrading.
          </div>
        )}
      </div>

      {/* Plans */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "1.5rem" }}>
        {[
          {
            name: "Free",
            price: "$0",
            period: "forever",
            storage: "500 MB",
            features: ["500 MB Walrus storage", "Public & Private files", "Locked encryption", "File transfer", "Albums"],
            current: true,
            color: "#a78bfa",
          },
          {
            name: "Pro",
            price: "$9",
            period: "/ month",
            storage: "10 GB",
            features: ["10 GB Walrus storage", "Everything in Free", "Priority support", "Activity analytics", "Extended file history"],
            current: false,
            color: "#4fc3ff",
            badge: "Coming soon",
          },
          {
            name: "Enterprise",
            price: "$49",
            period: "/ month",
            storage: "1 TB",
            features: ["1 TB Walrus storage", "Everything in Pro", "DAO treasury tools", "API access", "SLA guarantee"],
            current: false,
            color: "#4fffb0",
            badge: "Coming soon",
          },
        ].map(plan => (
          <div key={plan.name} style={{
            background: plan.current ? "rgba(124,106,255,0.06)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${plan.current ? "rgba(124,106,255,0.3)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: "16px", padding: "1.25rem",
            position: "relative",
          }}>
            {plan.badge && (
              <div style={{ position: "absolute", top: "12px", right: "12px", padding: "2px 8px", borderRadius: "100px", background: "rgba(255,255,255,0.06)", color: "#8888aa", fontSize: "10px", fontWeight: "600" }}>
                {plan.badge}
              </div>
            )}
            {plan.current && (
              <div style={{ position: "absolute", top: "12px", right: "12px", padding: "2px 8px", borderRadius: "100px", background: "rgba(124,106,255,0.2)", color: "#a78bfa", fontSize: "10px", fontWeight: "600", border: "1px solid rgba(124,106,255,0.3)" }}>
                Current
              </div>
            )}
            <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>{plan.name}</div>
            <div style={{ marginBottom: "1rem" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: plan.color }}>{plan.price}</span>
              <span style={{ fontSize: "12px", color: "#8888aa" }}>{plan.period}</span>
            </div>
            <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600", marginBottom: "10px" }}>{plan.storage} storage</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#8888aa" }}>
                  <span style={{ color: plan.color, flexShrink: 0 }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "1rem 1.25rem", fontSize: "13px", color: "#8888aa", lineHeight: 1.6 }}>
        Blok is currently in testnet. All storage is free during this phase. Mainnet launch will introduce paid plans with the subscription model described above. Your files on Walrus remain permanently yours regardless of plan.
      </div>
    </div>
  );
}