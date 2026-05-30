"use client";

import { useState } from "react";

interface HelpItem {
  question: string;
  answer: string;
  icon: string;
}

const FAQ: HelpItem[] = [
  {
    icon: "🌊",
    question: "What is Walrus and why does Blok use it?",
    answer: "Walrus is a decentralized storage network built natively on Sui. When you store a file on Blok, it is written to Walrus — a network of independent storage nodes with economic incentives to keep your data permanently. Unlike storing files on a company server, Walrus means your files survive even if Blok shuts down. The file exists on the network forever, retrievable by anyone with the blob ID.",
  },
  {
    icon: "🔒",
    question: "What is the difference between Private, Public and Locked?",
    answer: "Public files are stored on Walrus unencrypted and are searchable and viewable by anyone on Blok without connecting a wallet. Private files are stored on Walrus unencrypted but are only visible to you inside the Blok app after you connect your wallet — they do not appear in public search. Locked files are encrypted with your Sui wallet key before upload — only your wallet can decrypt them. Even Blok cannot read locked files.",
  },
  {
    icon: "🔑",
    question: "How does encryption work for Locked files?",
    answer: "When you upload a locked file, Blok asks your Sui wallet to sign a message. That signature is used to derive an AES-256 encryption key locally in your browser. The file is encrypted before it ever leaves your device. The encrypted blob is stored on Walrus. To view or download a locked file, your wallet signs the same message again, the same key is derived, and the file is decrypted locally. Your key never leaves your device and Blok never sees the unencrypted file.",
  },
  {
    icon: "⛓️",
    question: "What is the Sui on-chain anchoring?",
    answer: "When you upload a file, Blok records the Walrus blob ID in a Sui blockchain transaction. This creates a permanent, timestamped, publicly verifiable proof that your file existed at that exact moment and was stored by your wallet address. Click the ⛓ Sui badge on any file to view the transaction on Suiscan. This proof cannot be altered or deleted by anyone.",
  },
  {
    icon: "🗂️",
    question: "What happens if I lose my wallet?",
    answer: "Public and Private files can be retrieved from Walrus by anyone with the blob ID — you do not need your wallet to download them. However, Locked files are encrypted with your wallet key. If you permanently lose access to your wallet, locked files cannot be decrypted. This is intentional — it means nobody else can access your locked files, but it also means you must keep your wallet safe.",
  },
  {
    icon: "👁️",
    question: "Can anyone see my Private files?",
    answer: "Private files are not indexed in Blok's public search and do not appear in the Explore section. However, they are stored unencrypted on Walrus — so someone who somehow obtained the blob ID directly could retrieve the raw file. If you need your file to be truly unreadable to anyone except yourself, use Locked instead of Private.",
  },
  {
    icon: "💾",
    question: "Are my files stored forever?",
    answer: "Files on Walrus are stored for a paid epoch duration. Blok handles the storage payment as part of the upload process. In the current testnet version, files are stored for the duration of the testnet epoch. In the production version, Blok's fee model funds long-term storage renewals so your files persist indefinitely.",
  },
  {
    icon: "💳",
    question: "How does payment work? Is Blok free?",
    answer: "During the testnet phase, Blok is completely free. Storage is funded by testnet SUI which has no real-world value. When Blok launches on mainnet, Blok will operate on a subscription model — similar to Google Drive or Dropbox. Users pay a simple monthly or annual fee for a storage quota. Blok handles all the underlying Walrus storage costs, epoch renewals, and blockchain fees on your behalf. You never need to understand epoch pricing or interact with raw blockchain storage — you just pay a familiar subscription and your files are stored permanently. Plans will range from a free tier with limited storage to paid tiers for power users, DAOs, and enterprise teams. Full pricing will be published before mainnet launch.",
  },
  {
    icon: "📱",
    question: "What file types does Blok support?",
    answer: "Blok supports any file type — images, videos, audio, documents, PDFs, code files, archives, and any other digital file. Images and videos can be previewed directly inside the app. Audio files have a built-in player. Other file types can be downloaded. File size is limited only by the Walrus testnet upload limits.",
  },
];

export function Help() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", letterSpacing: "-0.4px" }}>
          Help & Support
        </h2>
        <p style={{ fontSize: "13px", color: "#8888aa" }}>
          Everything you need to know about how Blok works
        </p>
      </div>

      {/* How it works overview */}
      <div style={{
        background: "rgba(124,106,255,0.06)",
        border: "1px solid rgba(124,106,255,0.2)",
        borderRadius: "16px", padding: "1.5rem",
        marginBottom: "2rem",
      }}>
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "1rem", color: "#a78bfa" }}>
          ⚡ How Blok works in 4 steps
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {[
            { step: "01", icon: "🔗", title: "Connect wallet", desc: "Your Sui wallet is your identity. No username or password." },
            { step: "02", icon: "📂", title: "Choose your file", desc: "Upload any file. Set it as Public, Private, or Locked." },
            { step: "03", icon: "🌊", title: "Stored on Walrus", desc: "Your file is written permanently to the Walrus decentralized network." },
            { step: "04", icon: "⛓️", title: "Anchored on Sui", desc: "A proof of existence is recorded on the Sui blockchain forever." },
          ].map(item => (
            <div key={item.step} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px", padding: "1rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "#7c6aff", fontWeight: "700" }}>{item.step}</span>
                <span style={{ fontSize: "20px" }}>{item.icon}</span>
              </div>
              <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>{item.title}</div>
              <div style={{ fontSize: "12px", color: "#8888aa", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "1rem", color: "#f0f0ff" }}>
          Frequently asked questions
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${open === i ? "rgba(124,106,255,0.3)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: "12px", overflow: "hidden",
              transition: "all 0.2s",
            }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%", padding: "14px 16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "none", border: "none", cursor: "pointer",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#f0f0ff", textAlign: "left", lineHeight: 1.4 }}>
                    {item.question}
                  </span>
                </div>
                <span style={{
                  fontSize: "16px", color: "#8888aa", flexShrink: 0,
                  transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}>
                  ↓
                </span>
              </button>
              {open === i && (
                <div style={{
                  padding: "0 16px 16px 44px",
                  fontSize: "13px", color: "#8888aa", lineHeight: 1.7,
                  animation: "fadeUp 0.2s ease forwards",
                }}>
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact / Support */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px", padding: "1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
      }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>
            Still have questions?
          </div>
          <div style={{ fontSize: "13px", color: "#8888aa", lineHeight: 1.5 }}>
            Reach out to the Blok team on X. We respond to every message.
          </div>
        </div>
        <button
          onClick={() => window.open("https://x.com/Blok_org", "_blank")}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "10px 24px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #7c6aff, #6355e0)",
            color: "white", fontWeight: "600", fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(124,106,255,0.3)",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          X Contact Support
        </button>
      </div>
    </div>
  );
}