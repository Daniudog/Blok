"use client";

import { useState, useRef } from "react";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";

interface UploadProps {
  onSuccess: () => void;
}

async function encryptFile(file: File, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBuffer
  );
  const result = new Uint8Array(12 + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), 12);
  return result.buffer;
}

async function deriveKey(signature: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signature.slice(0, 32).padEnd(32, "0")),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
}

async function uploadToWalrus(data: ArrayBuffer): Promise<string> {
  const response = await fetch(
    "/api/upload",
    {
      method: "PUT",
      body: data,
      headers: { "Content-Type": "application/octet-stream" },
    }
  );
  if (!response.ok) throw new Error("Walrus upload failed");
  const result = await response.json();
  const blobId =
    result?.newlyCreated?.blobObject?.blobId ||
    result?.alreadyCertified?.blobId;
  if (!blobId) throw new Error("No blob ID returned");
  return blobId;
}

export function Upload({ onSuccess }: UploadProps) {
  const account = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();
  const [status, setStatus] = useState("idle");
  const [blobId, setBlobId] = useState("");
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!account) return;
    setFileName(file.name);
    setStatus("encrypting");
    setErrorMsg("");
    try {
      const { signature } = await signMessage({
        message: new TextEncoder().encode(
          "Philes encryption key — " + account.address
        ),
      });
      const key = await deriveKey(signature);
      const encrypted = await encryptFile(file, key);
      setStatus("uploading");
      const id = await uploadToWalrus(encrypted);
      const stored = JSON.parse(localStorage.getItem("philes_files") || "[]");
      stored.unshift({
        blobId: id,
        name: file.name,
        size: file.size,
        type: file.type,
        storedAt: Date.now(),
        wallet: account.address,
      });
      localStorage.setItem("philes_files", JSON.stringify(stored));
      setBlobId(id);
      setStatus("done");
      onSuccess();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function reset() {
    setStatus("idle");
    setBlobId("");
    setFileName("");
    setErrorMsg("");
  }

  if (status === "done") {
    return (
      <div className="card" style={{ borderColor: "rgba(68,255,136,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "24px" }}>✅</div>
          <div>
            <div style={{ fontWeight: "600", marginBottom: "2px" }}>
              {fileName} stored permanently
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Encrypted and written to Walrus successfully
            </div>
          </div>
        </div>
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.875rem 1rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Walrus Blob ID — save this
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--accent)", wordBreak: "break-all" }}>
            {blobId}
          </div>
        </div>
        <button className="btn-secondary" onClick={reset} style={{ width: "100%" }}>
          Store another file
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className="card"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => status === "idle" && inputRef.current?.click()}
        style={{
          borderColor: dragOver ? "var(--accent)" : "var(--border)",
          borderStyle: "dashed",
          borderWidth: "2px",
          textAlign: "center",
          padding: "3rem 2rem",
          cursor: status === "idle" ? "pointer" : "default",
          transition: "all 0.2s",
          background: dragOver ? "rgba(232,255,71,0.03)" : "var(--surface)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {status === "idle" && (
          <>
            <div style={{ fontSize: "36px", marginBottom: "1rem" }}>📁</div>
            <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Drop a file here or click to browse
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Any file type. Encrypted locally before upload. Never seen by Philes.
            </div>
          </>
        )}

        {status === "encrypting" && (
          <>
            <div style={{ fontSize: "36px", marginBottom: "1rem" }}>🔐</div>
            <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Encrypting {fileName}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Happening locally on your device. Philes sees nothing.
            </div>
          </>
        )}

        {status === "uploading" && (
          <>
            <div style={{ fontSize: "36px", marginBottom: "1rem" }}>🌊</div>
            <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Writing to Walrus
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Your encrypted file is being stored permanently on the network.
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: "36px", marginBottom: "1rem" }}>❌</div>
            <div style={{ fontWeight: "600", marginBottom: "0.5rem", color: "var(--danger)" }}>
              Something went wrong
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {errorMsg}
            </div>
            <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); reset(); }}>
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}