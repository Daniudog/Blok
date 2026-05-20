"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Upload } from "./components/Upload";
import { FileList } from "./components/FileList";
import { useState } from "react";

export default function Home() {
  const account = useCurrentAccount();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(12px)",
          zIndex: 100,
        }}
      >
        <div>
          <span
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "var(--accent)",
              letterSpacing: "-0.5px",
            }}
          >
            Philes
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              marginLeft: "12px",
            }}
          >
            Encrypted by default. Permanent by design.
          </span>
        </div>
        <ConnectButton />
      </header>

      {/* Body */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "3rem 2rem" }}>
        {!account ? (
          // Not connected
          <div style={{ textAlign: "center", padding: "6rem 0" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "rgba(232,255,71,0.1)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 2rem",
                fontSize: "28px",
              }}
            >
              🔐
            </div>
            <h1
              style={{
                fontSize: "36px",
                fontWeight: "700",
                marginBottom: "1rem",
                lineHeight: 1.2,
              }}
            >
              Your files.
              <br />
              <span style={{ color: "var(--accent)" }}>Owned forever.</span>
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "16px",
                maxWidth: "420px",
                margin: "0 auto 2.5rem",
                lineHeight: 1.7,
              }}
            >
              Encrypt any file locally on your device. Store it permanently on
              Walrus. Access it anywhere with your Sui wallet.
            </p>
            <div
              style={{
                display: "flex",
                gap: "2rem",
                justifyContent: "center",
                marginBottom: "3rem",
                flexWrap: "wrap",
              }}
            >
              {[
                { icon: "🔒", label: "AES-256 Encrypted" },
                { icon: "🌊", label: "Stored on Walrus" },
                { icon: "⛓️", label: "Anchored on Sui" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <ConnectButton />
          </div>
        ) : (
          // Connected
          <div>
            <div style={{ marginBottom: "2.5rem" }}>
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: "600",
                  marginBottom: "0.4rem",
                }}
              >
                Store a file
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Your file is encrypted on this device before it is uploaded.
                Only your wallet can decrypt it.
              </p>
            </div>
            <Upload onSuccess={() => setRefreshKey((k) => k + 1)} />
            <div style={{ marginTop: "3rem" }}>
              <FileList key={refreshKey} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}