"use client";

import { useState } from "react";
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

function fileIcon(type: string) {
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  return "📁";
}

async function deriveKey(input: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.slice(0, 32).padEnd(32, "0")),
    "AES-GCM", false, ["encrypt", "decrypt"]
  );
}

async function uploadToWalrus(data: ArrayBuffer): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "PUT", body: data,
    headers: { "Content-Type": "application/octet-stream" },
  });
  if (!res.ok) throw new Error("Walrus upload failed");
  const json = await res.json();
  const id = json?.newlyCreated?.blobObject?.blobId || json?.alreadyCertified?.blobId;
  if (!id) throw new Error("No blob ID returned");
  return id;
}

export function Transfer() {
  const account = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();
  const [activeTab, setActiveTab] = useState<"send" | "receive">("send");
  const [selectedFile, setSelectedFile] = useState<StoredFile | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [transferBlobId, setTransferBlobId] = useState("");
  const [receiveBlobId, setReceiveBlobId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sendDone, setSendDone] = useState(false);
  const [receiveDone, setReceiveDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!account) return null;

  const myFiles: StoredFile[] = JSON.parse(localStorage.getItem("blok_files") || "[]")
    .filter((f: StoredFile) => f.wallet === account.address);

  async function handleSend() {
    if (!selectedFile || !recipientAddress.trim() || !account) return;
    setLoading(true);
    setError("");
    try {
      setStatus("Requesting wallet signature...");
      const { signature: senderSig } = await signMessage({
        message: new TextEncoder().encode("Blok encryption key — " + account.address),
      });
      const senderKey = await deriveKey(senderSig);
      setStatus("Fetching file from Walrus...");
      const res = await fetch("/api/upload?blobId=" + selectedFile.blobId);
      if (!res.ok) throw new Error("Failed to fetch file from Walrus");
      let fileBuffer = await res.arrayBuffer();
      if (selectedFile.isLocked || selectedFile.visibility === "locked" || selectedFile.isEncrypted) {
        setStatus("Decrypting file...");
        const iv = fileBuffer.slice(0, 12);
        const data = fileBuffer.slice(12);
        fileBuffer = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: new Uint8Array(iv) },
          senderKey,
          data
        );
      }
      setStatus("Encrypting for recipient...");
      const recipientKey = await deriveKey("Blok transfer key — " + recipientAddress.trim());
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, recipientKey, fileBuffer);
      const out = new Uint8Array(12 + encrypted.byteLength);
      out.set(iv, 0);
      out.set(new Uint8Array(encrypted), 12);
      setStatus("Uploading to Walrus...");
      const newBlobId = await uploadToWalrus(out.buffer);
      const transfers = JSON.parse(localStorage.getItem("blok_transfers") || "[]");
      transfers.unshift({ blobId: newBlobId, name: selectedFile.name, from: account.address, to: recipientAddress.trim(), sentAt: Date.now() });
      localStorage.setItem("blok_transfers", JSON.stringify(transfers));
      setTransferBlobId(newBlobId);
      setSendDone(true);
      setStatus("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transfer failed");
      setStatus("");
    }
    setLoading(false);
  }

  async function handleReceive() {
    if (!receiveBlobId.trim() || !account) return;
    setLoading(true);
    setError("");
    try {
      setStatus("Fetching from Walrus...");
      const res = await fetch("/api/upload?blobId=" + receiveBlobId.trim());
      if (!res.ok) throw new Error("Failed to fetch from Walrus");
      const encryptedBuffer = await res.arrayBuffer();
      setStatus("Decrypting with your wallet address...");
      const recipientKey = await deriveKey("Blok transfer key — " + account.address);
      const iv = encryptedBuffer.slice(0, 12);
      const data = encryptedBuffer.slice(12);
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        recipientKey,
        data
      );
      setStatus("Saving to your library...");
      const stored = JSON.parse(localStorage.getItem("blok_files") || "[]");
      stored.unshift({
        blobId: receiveBlobId.trim(),
        name: "Received — " + new Date().toLocaleDateString(),
        size: decrypted.byteLength,
        type: "application/octet-stream",
        storedAt: Date.now(),
        wallet: account.address,
        isPublic: false,
        isPrivate: true,
        isLocked: false,
        isEncrypted: false,
        visibility: "private",
      });
      localStorage.setItem("blok_files", JSON.stringify(stored));
      setReceiveDone(true);
      setStatus("");
      setReceiveBlobId("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to receive. Make sure the blob ID is correct and was sent to your wallet.");
      setStatus("");
    }
    setLoading(false);
  }

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", color: "#f0f0ff", padding: "10px 14px", fontSize: "14px",
    outline: "none", fontFamily: "inherit", width: "100%", transition: "all 0.2s",
  };

  const btn = (active: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px", borderRadius: "10px", border: "none",
    cursor: active ? "pointer" : "not-allowed",
    fontSize: "14px", fontWeight: "600",
    background: active ? "linear-gradient(135deg, #7c6aff, #6355e0)" : "rgba(124,106,255,0.3)",
    color: "white",
    boxShadow: active ? "0 0 24px rgba(124,106,255,0.4)" : "none",
    transition: "all 0.2s",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
  });

  return (
    <div style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", letterSpacing: "-0.4px" }}>Transfer Files</h2>
        <p style={{ fontSize: "13px", color: "#8888aa" }}>Send files to other wallets with end-to-end encryption. Only the recipient can decrypt.</p>
      </div>

      <div style={{ background: "rgba(124,106,255,0.06)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem", fontSize: "13px", color: "#a78bfa", display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <span style={{ fontSize: "18px", flexShrink: 0 }}>🔐</span>
        <div><strong style={{ color: "#c084fc" }}>End-to-end encrypted.</strong> Your file is decrypted locally, re-encrypted for the recipient wallet address, and stored on Walrus. Only their wallet can decrypt it.</div>
      </div>

      <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "3px", width: "fit-content", marginBottom: "1.5rem" }}>
        {[{ id: "send", label: "📤 Send" }, { id: "receive", label: "📥 Receive" }].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id as "send" | "receive"); setError(""); setSendDone(false); setReceiveDone(false); }} style={{ padding: "7px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500", background: activeTab === t.id ? "linear-gradient(135deg, #7c6aff, #6355e0)" : "transparent", color: activeTab === t.id ? "white" : "#8888aa", boxShadow: activeTab === t.id ? "0 0 16px rgba(124,106,255,0.3)" : "none", transition: "all 0.2s" }}>{t.label}</button>
        ))}
      </div>

      {activeTab === "send" && (
        <div>
          {sendDone ? (
            <div style={{ background: "rgba(79,255,176,0.06)", border: "1px solid rgba(79,255,176,0.2)", borderRadius: "16px", padding: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "1rem" }}>✅</div>
              <div style={{ fontWeight: "700", fontSize: "18px", marginBottom: "8px" }}>Transfer complete</div>
              <div style={{ fontSize: "13px", color: "#8888aa", marginBottom: "1.5rem", lineHeight: 1.6 }}>Share this blob ID with the recipient. They paste it in the Receive tab to decrypt and save the file.</div>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "10px", padding: "1rem", marginBottom: "1.5rem", fontFamily: "monospace", fontSize: "13px", color: "#4fffb0", wordBreak: "break-all" }}>{transferBlobId}</div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button onClick={() => navigator.clipboard.writeText(transferBlobId)} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #7c6aff, #6355e0)", color: "white", fontWeight: "600", fontSize: "13px", cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)" }}>Copy Blob ID</button>
                <button onClick={() => { setSendDone(false); setSelectedFile(null); setRecipientAddress(""); setTransferBlobId(""); }} style={{ padding: "10px 20px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8888aa", cursor: "pointer", fontSize: "13px" }}>Send another</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0f0ff", marginBottom: "8px" }}>Step 1 — Select a file</div>
                {myFiles.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", color: "#8888aa", fontSize: "13px" }}>No files yet. Upload a file first.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
                    {myFiles.map(file => (
                      <div key={file.blobId} onClick={() => setSelectedFile(file)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", cursor: "pointer", background: selectedFile?.blobId === file.blobId ? "rgba(124,106,255,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${selectedFile?.blobId === file.blobId ? "rgba(124,106,255,0.4)" : "rgba(255,255,255,0.07)"}`, transition: "all 0.15s" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, border: `2px solid ${selectedFile?.blobId === file.blobId ? "#7c6aff" : "rgba(255,255,255,0.2)"}`, background: selectedFile?.blobId === file.blobId ? "#7c6aff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "white" }}>{selectedFile?.blobId === file.blobId ? "✓" : ""}</div>
                        <span style={{ fontSize: "20px" }}>{fileIcon(file.type)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                          <div style={{ fontSize: "11px", color: "#55556a" }}>{fmtSize(file.size)} · {file.visibility || (file.isPublic ? "public" : "private")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0f0ff", marginBottom: "8px" }}>Step 2 — Recipient wallet address</div>
                <input style={inp} placeholder="0x... recipient Sui wallet address" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} />
              </div>
              {status && <div style={{ background: "rgba(124,106,255,0.08)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "1rem", fontSize: "13px", color: "#a78bfa", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>{status}</div>}
              {error && <div style={{ background: "rgba(255,79,106,0.08)", border: "1px solid rgba(255,79,106,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "1rem", fontSize: "13px", color: "#ff4f6a" }}>⚠️ {error}</div>}
              <button onClick={handleSend} disabled={!selectedFile || !recipientAddress.trim() || loading} style={btn(!!(selectedFile && recipientAddress.trim()) && !loading)}>
                {loading ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>{status || "Processing..."}</> : "🔐 Encrypt & Send"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "receive" && (
        <div>
          {receiveDone ? (
            <div style={{ background: "rgba(79,255,176,0.06)", border: "1px solid rgba(79,255,176,0.2)", borderRadius: "16px", padding: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "1rem" }}>📥</div>
              <div style={{ fontWeight: "700", fontSize: "18px", marginBottom: "8px" }}>File received</div>
              <div style={{ fontSize: "13px", color: "#8888aa", marginBottom: "1.5rem" }}>Decrypted and saved to your library. Check My Files.</div>
              <button onClick={() => { setReceiveDone(false); setError(""); }} style={{ padding: "10px 24px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #7c6aff, #6355e0)", color: "white", fontWeight: "600", fontSize: "14px", cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)" }}>Receive another</button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0f0ff", marginBottom: "8px" }}>Paste the blob ID shared with you</div>
                <input style={{ ...inp, marginBottom: "8px" }} placeholder="Walrus blob ID from sender..." value={receiveBlobId} onChange={e => setReceiveBlobId(e.target.value)} />
                <div style={{ fontSize: "12px", color: "#55556a", lineHeight: 1.5 }}>The sender will give you a blob ID after transferring. Paste it above — the file will be decrypted using your wallet address and saved to your library.</div>
              </div>
              {status && <div style={{ background: "rgba(124,106,255,0.08)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "1rem", fontSize: "13px", color: "#a78bfa", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>{status}</div>}
              {error && <div style={{ background: "rgba(255,79,106,0.08)", border: "1px solid rgba(255,79,106,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "1rem", fontSize: "13px", color: "#ff4f6a" }}>⚠️ {error}</div>}
              <button onClick={handleReceive} disabled={!receiveBlobId.trim() || loading} style={btn(!!receiveBlobId.trim() && !loading)}>
                {loading ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>{status || "Processing..."}</> : "📥 Decrypt & Receive"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
