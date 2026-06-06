"use client";

import { useState } from "react";

interface HelpItem { question: string; answer: string; icon: string; }

const FAQ: HelpItem[] = [
  { icon: "🔌", question: "How is Tatum integrated in Blok?", answer: "Blok uses Tatum as its Sui blockchain infrastructure provider. All wallet connections, transaction submissions, and on-chain queries route through Tatum's Sui RPC Gateway (sui-testnet.gateway.tatum.io) via a secure server-side proxy at /api/rpc. This prevents CORS issues and keeps credentials safe. Every time you upload a file and see the Sui transaction confirmed, that confirmation goes through Tatum's high-performance node network — providing enterprise-grade uptime, load balancing, and failover." },
  { icon: "🌊", question: "What is Walrus and why does Blok use it?", answer: "Walrus is a decentralized storage network built natively on Sui. When you store a file on Blok, it is written to Walrus — a network of independent storage nodes with economic incentives to keep your data permanently. Unlike storing files on a company server, Walrus means your files survive even if Blok shuts down. The file exists on the network forever, retrievable by anyone with the blob ID." },
  { icon: "👁️", question: "What is the difference between Public, Private and Locked?", answer: "Public files are stored on Walrus unencrypted and are searchable and viewable by anyone on Blok without connecting a wallet. Private files are stored on Walrus unencrypted but only visible to you inside Blok after connecting your wallet. Locked files are encrypted with your Sui wallet key before upload — only your wallet can decrypt them. Even Blok cannot read locked files." },
  { icon: "🔑", question: "How does encryption work for Locked files?", answer: "When you upload a locked file, Blok asks your Sui wallet to sign a message. That signature derives an AES-256 encryption key locally in your browser. The file is encrypted before it leaves your device. The encrypted blob is stored on Walrus. To view or download a locked file, your wallet signs the same message again, the same key is derived, and the file is decrypted locally. Your key never leaves your device." },
  { icon: "📤", question: "How does the Transfer feature work?", answer: "Transfer lets you send any file to another Sui wallet with end-to-end encryption. Your wallet signs to decrypt the file locally. The file is then re-encrypted using a key derived from the recipient wallet address — only their wallet can decrypt it. The re-encrypted file is uploaded to Walrus as a new blob. You share the blob ID with the recipient. They open the Receive tab, paste the blob ID, and Blok decrypts it using their wallet address key and saves it to their library. Blok never sees the unencrypted file." },
  { icon: "⛓️", question: "What is the Sui on-chain anchoring?", answer: "When you upload a file, Blok submits a Sui transaction via Tatum's RPC recording the Walrus blob ID permanently on-chain. This creates a timestamped, publicly verifiable proof that your file existed at that exact moment and was stored by your wallet address. Click the Sui badge on any file to view the transaction on Suiscan." },
  { icon: "🛡️", question: "What is Seal encryption and how will Blok use it?", answer: "Seal is Mysten Labs' threshold encryption protocol built natively for Sui. Unlike the current encryption which derives a key from your wallet signature, Seal uses a distributed key management system where no single party holds the full decryption key. This enables sharing locked files with other wallets without re-encrypting and setting time-based access policies. Blok plans to migrate locked file encryption to Seal when the SDK reaches production stability." },
  { icon: "🔐", question: "What is ZK Login and will Blok support it?", answer: "ZK Login lets users create a Sui wallet using their existing Google, Apple, or Facebook account without ever seeing a seed phrase or installing a wallet extension. For Blok, ZK Login means a new user could store their first file on Walrus using just their Google account. Blok plans to integrate ZK Login as an alternative sign-in method at mainnet launch." },
  { icon: "💳", question: "How does payment work? Is Blok free?", answer: "During testnet, Blok is completely free. Storage is funded by testnet SUI which has no real-world value. When Blok launches on mainnet, it will operate on a subscription model similar to Google Drive or Dropbox. Users pay a simple monthly or annual fee for a storage quota. Blok handles all underlying Walrus storage costs, epoch renewals, and blockchain fees. Plans will range from a free tier to paid tiers for power users, DAOs, and enterprise teams." },
  { icon: "💾", question: "Are my files stored forever?", answer: "Files on Walrus are stored for a paid epoch duration. Blok handles the storage payment during upload. During testnet, files are stored for the testnet epoch duration. In production, subscription fees fund long-term storage renewals so files persist indefinitely." },
  { icon: "🗂️", question: "What are Albums?", answer: "Albums let you organize your Blok files into named collections with custom emoji icons. Create an album, then add files from your library to it. Albums are private and only visible to you after connecting your wallet." },
  { icon: "📱", question: "What file types does Blok support?", answer: "Blok supports any file type — images, videos, audio, documents, PDFs, code files, archives, and any other digital file. Images and videos preview directly in the app. Audio files have a built-in player. Locked files require wallet signature to preview. File size is limited only by Walrus testnet upload limits." },
];

export function Help() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}>

      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", letterSpacing: "-0.4px" }}>Help & Support</h2>
        <p style={{ fontSize: "13px", color: "#8888aa" }}>Everything you need to know about how Blok works</p>
      </div>

      {/* How it works */}
      <div style={{ background: "rgba(124,106,255,0.06)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "1rem", color: "#a78bfa" }}>How Blok works</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
          {[
            { step: "01", icon: "🔗", title: "Connect wallet", desc: "Your Sui wallet is your identity. No username or password." },
            { step: "02", icon: "📂", title: "Upload any file", desc: "Choose Public, Private, or Locked. Camera capture supported." },
            { step: "03", icon: "🌊", title: "Stored on Walrus", desc: "File written permanently to Walrus decentralized storage." },
            { step: "04", icon: "⛓️", title: "Anchored on Sui", desc: "Blob ID recorded as a Sui transaction via Tatum RPC." },
            { step: "05", icon: "📤", title: "Transfer to wallets", desc: "Re-encrypt any file for a recipient. Only they can decrypt." },
            { step: "06", icon: "🗂️", title: "Organize in Albums", desc: "Group your files into named collections." },
          ].map(item => (
            <div key={item.step} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1rem" }}>
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

      {/* Tatum banner */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.25rem", marginBottom: "2rem" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "0.75rem", color: "#a78bfa" }}>Powered by Tatum</div>
        <div style={{ fontSize: "13px", color: "#8888aa", lineHeight: 1.7 }}>
          All Sui blockchain interactions route through <strong style={{ color: "#f0f0ff" }}>Tatum RPC Gateway</strong> (sui-testnet.gateway.tatum.io) via a secure server-side proxy. Wallet connections, transaction submissions, and on-chain confirmations all use Tatum infrastructure — providing enterprise-grade uptime and failover for every Blok upload.
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "1rem" }}>Frequently asked questions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${open === i ? "rgba(124,106,255,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: "12px", overflow: "hidden", transition: "all 0.2s" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#f0f0ff", textAlign: "left", lineHeight: 1.4 }}>{item.question}</span>
                </div>
                <span style={{ fontSize: "16px", color: "#8888aa", flexShrink: 0, transform: open === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>↓</span>
              </button>
              {open === i && (
                <div style={{ padding: "0 16px 16px 44px", fontSize: "13px", color: "#8888aa", lineHeight: 1.7, animation: "fadeUp 0.2s ease forwards" }}>
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Coming soon */}
      <div style={{ background: "rgba(79,255,176,0.04)", border: "1px solid rgba(79,255,176,0.15)", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "1rem", color: "#4fffb0" }}>What to expect from Blok</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { icon: "🔐", title: "ZK Login", desc: "Sign into Blok with your Google, Apple, or Facebook account. Zero-knowledge proofs verify your identity on Sui without exposing it. No seed phrase. No wallet setup. Just your existing account — and your files are permanently yours on Walrus." },
            { icon: "🛡️", title: "Seal Encryption", desc: "Blok will upgrade locked file encryption to Seal — Mysten Labs threshold encryption protocol. This enables sharing locked files with multiple wallets simultaneously, time-based access policies, and access revocation — all without re-encrypting the file." },
            { icon: "🔌", title: "Third-Party App Integration", desc: "Save directly to Blok from any app. Working inside a video editor, design tool, PDF editor, or coding environment — you will be able to save directly to Blok without switching apps. Implemented via a browser extension that intercepts save dialogs and routes files to your Blok vault." },
            { icon: "🔍", title: "OCR and Content Search", desc: "Search inside your files. Blok will use optical character recognition to extract text from images, scanned documents, and PDFs. Search for any word and Blok finds the file containing it — even if the word is inside a photo of a handwritten note." },
            { icon: "🔄", title: "File Conversion", desc: "Convert files directly in Blok. PDF to Word, JPEG to PNG, MP4 to MP3, and dozens more conversions — without leaving the platform. Converted files are automatically stored back to your Blok vault on Walrus." },
            { icon: "📱", title: "Mobile App", desc: "A native iOS and Android app for Blok — with camera integration, background uploads, push notifications for file activity, and offline access to your recently viewed files." },
          ].map(item => (
            <div key={item.title} style={{ display: "flex", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" }}>
              <span style={{ fontSize: "20px", flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px", color: "#f0f0ff" }}>{item.title}</div>
                <div style={{ fontSize: "12px", color: "#8888aa", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Contact */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>Still have questions?</div>
          <div style={{ fontSize: "13px", color: "#8888aa" }}>Reach out to the Blok team on X. We respond to every message.</div>
        </div>
        <button onClick={() => window.open("https://x.com/Blok_org", "_blank")} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 24px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #7c6aff, #6355e0)", color: "white", fontWeight: "600", fontSize: "14px", cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)", flexShrink: 0 }}>
          X Contact Support
        </button>
      </div>
    </div>
  );
}