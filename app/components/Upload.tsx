"use client";

import { useState, useRef, useCallback } from "react";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";

interface UploadProps {
  onSuccess: () => void;
}

interface FileItem {
  id: string;
  file: File;
  status: "waiting" | "encrypting" | "uploading" | "done" | "error";
  progress: number;
  blobId: string;
  error: string;
  isPublic: boolean;
}

async function encryptFile(file: File, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await file.arrayBuffer();
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buf);
  const out = new Uint8Array(12 + enc.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(enc), 12);
  return out.buffer;
}

async function deriveKey(sig: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sig.slice(0, 32).padEnd(32, "0")),
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

function fileIcon(type: string) {
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  if (type.includes("zip") || type.includes("rar")) return "🗜️";
  if (type.includes("text") || type.includes("document")) return "📝";
  return "📁";
}

function fmtSize(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

export function Upload({ onSuccess }: UploadProps) {
  const account = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();
  const [items, setItems] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [defaultPublic, setDefaultPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"file" | "camera">("file");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo");
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [cameraError, setCameraError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);

  const update = useCallback((id: string, patch: Partial<FileItem>) => {
    setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));
  }, []);

  function addFiles(files: File[]) {
    const newItems: FileItem[] = files.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f, status: "waiting", progress: 0,
      blobId: "", error: "", isPublic: defaultPublic,
    }));
    setItems(p => [...p, ...newItems]);
    setMode("file");
  }

  async function switchToCamera() {
    setCameraError("");
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      setCameraReady(true);
      setMode("camera");
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setCameraError("Camera access denied. Please allow camera permissions in your browser settings and try again.");
      setMode("file");
      setCameraReady(false);
    }
  }

  function switchToFile() {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraReady(false);
    setRecording(false);
    setMode("file");
    setCameraError("");
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      addFiles([new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })]);
      switchToFile();
    }, "image/jpeg", 0.92);
  }

  function startRecording() {
    if (!cameraStream) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(cameraStream);
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      addFiles([new File([blob], `video-${Date.now()}.webm`, { type: "video/webm" })]);
      switchToFile();
    };
    rec.start();
    setMediaRecorder(rec);
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorder?.stop();
    setRecording(false);
  }

  async function uploadAll() {
    if (!account || uploading) return;
    const waiting = items.filter(i => i.status === "waiting");
    if (!waiting.length) return;
    setUploading(true);
    const { signature } = await signMessage({
      message: new TextEncoder().encode("Blok encryption key — " + account.address),
    });
    const key = await deriveKey(signature);
    for (const item of waiting) {
      try {
        update(item.id, { status: "encrypting", progress: 25 });
        const data = item.isPublic
          ? await item.file.arrayBuffer()
          : await encryptFile(item.file, key);
        update(item.id, { status: "uploading", progress: 65 });
        const blobId = await uploadToWalrus(data);
        update(item.id, { status: "done", progress: 100, blobId });
        const stored = JSON.parse(localStorage.getItem("blok_files") || "[]");
        stored.unshift({
          blobId, name: item.file.name, size: item.file.size,
          type: item.file.type, storedAt: Date.now(),
          wallet: account.address, isPublic: item.isPublic,
          isEncrypted: !item.isPublic,
        });
        localStorage.setItem("blok_files", JSON.stringify(stored));
      } catch (e: unknown) {
        update(item.id, { status: "error", error: e instanceof Error ? e.message : "Failed" });
      }
    }
    setUploading(false);
    onSuccess();
  }

  const hasWaiting = items.some(i => i.status === "waiting");
  const allSettled = items.length > 0 && items.every(i => i.status === "done" || i.status === "error");

  return (
    <div style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", letterSpacing: "-0.4px" }}>
          Upload to Blok
        </h2>
        <p style={{ fontSize: "13px", color: "#8888aa" }}>
          Files encrypted on your device before upload. Only your wallet can decrypt private files.
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{
        display: "flex", gap: "4px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "10px", padding: "3px",
        width: "fit-content", marginBottom: "1.25rem",
      }}>
        <button
          onClick={switchToFile}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 16px", borderRadius: "8px", border: "none",
            cursor: "pointer", fontSize: "13px", fontWeight: "500",
            background: mode === "file" ? "linear-gradient(135deg, #7c6aff, #6355e0)" : "transparent",
            color: mode === "file" ? "white" : "#8888aa",
            boxShadow: mode === "file" ? "0 0 16px rgba(124,106,255,0.3)" : "none",
            transition: "all 0.2s",
          }}
        >
          📂 Choose Files
        </button>
        <button
          onClick={switchToCamera}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 16px", borderRadius: "8px", border: "none",
            cursor: "pointer", fontSize: "13px", fontWeight: "500",
            background: mode === "camera" ? "linear-gradient(135deg, #7c6aff, #6355e0)" : "transparent",
            color: mode === "camera" ? "white" : "#8888aa",
            boxShadow: mode === "camera" ? "0 0 16px rgba(124,106,255,0.3)" : "none",
            transition: "all 0.2s",
          }}
        >
          📷 Camera & Video
        </button>
      </div>

      {/* Camera error */}
      {cameraError && (
        <div style={{
          background: "rgba(255,79,106,0.08)",
          border: "1px solid rgba(255,79,106,0.2)",
          borderRadius: "10px", padding: "12px 16px",
          marginBottom: "1rem", fontSize: "13px", color: "#ff4f6a",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span>⚠️</span> {cameraError}
        </div>
      )}

      {/* Camera panel */}
      {mode === "camera" && cameraReady && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px", overflow: "hidden",
          marginBottom: "1.25rem",
          animation: "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
        }}>
          {/* Camera mode toggle */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {["photo", "video"].map(m => (
                <button key={m} onClick={() => setCameraMode(m as "photo" | "video")} style={{
                  padding: "5px 12px", borderRadius: "6px", border: "none",
                  cursor: "pointer", fontSize: "12px", fontWeight: "500",
                  background: cameraMode === m ? "rgba(124,106,255,0.2)" : "transparent",
                  color: cameraMode === m ? "#a78bfa" : "#8888aa",
                  transition: "all 0.15s",
                }}>
                  {m === "photo" ? "📷 Photo" : "🎬 Video"}
                </button>
              ))}
            </div>
            <button onClick={switchToFile} style={{
              background: "rgba(255,79,106,0.08)",
              border: "1px solid rgba(255,79,106,0.15)",
              borderRadius: "6px", padding: "5px 10px",
              color: "#ff4f6a", fontSize: "12px", cursor: "pointer",
            }}>
              ✕ Close camera
            </button>
          </div>

          {/* Video preview */}
          <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
            <video
              ref={videoRef} muted playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {recording && (
              <div style={{
                position: "absolute", top: "12px", right: "12px",
                display: "flex", alignItems: "center", gap: "6px",
                background: "rgba(220,38,38,0.9)", borderRadius: "100px",
                padding: "4px 10px", fontSize: "12px", color: "white", fontWeight: "600",
              }}>
                <div style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: "white", animation: "pulse 1s ease infinite",
                }} />
                REC
              </div>
            )}
          </div>

          {/* Camera controls */}
          <div style={{ padding: "14px 16px", display: "flex", gap: "10px", justifyContent: "center" }}>
            {cameraMode === "photo" ? (
              <button onClick={capturePhoto} style={{
                padding: "10px 28px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #7c6aff, #6355e0)",
                color: "white", fontWeight: "600", fontSize: "14px",
                cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.35)",
                transition: "all 0.2s",
              }}>
                📷 Capture Photo
              </button>
            ) : (
              <button onClick={recording ? stopRecording : startRecording} style={{
                padding: "10px 28px", borderRadius: "10px", border: "none",
                background: recording
                  ? "linear-gradient(135deg, #ff4f6a, #c0392b)"
                  : "linear-gradient(135deg, #7c6aff, #6355e0)",
                color: "white", fontWeight: "600", fontSize: "14px", cursor: "pointer",
                boxShadow: recording
                  ? "0 0 20px rgba(255,79,106,0.4)"
                  : "0 0 20px rgba(124,106,255,0.35)",
                transition: "all 0.2s",
              }}>
                {recording ? "⏹ Stop & Save" : "⏺ Start Recording"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* File drop zone — always visible in file mode */}
      {mode === "file" && (
        <div>
          <div
            onClick={() => items.length === 0 && fileInput.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              addFiles(Array.from(e.dataTransfer.files));
            }}
            style={{
              border: `2px dashed ${dragOver ? "#7c6aff" : "rgba(255,255,255,0.09)"}`,
              borderRadius: "16px",
              background: dragOver ? "rgba(124,106,255,0.07)" : "rgba(255,255,255,0.02)",
              padding: items.length > 0 ? "1rem" : "3.5rem 2rem",
              textAlign: items.length === 0 ? "center" : "left",
              cursor: items.length === 0 ? "pointer" : "default",
              transition: "all 0.2s", marginBottom: "1rem",
            }}
          >
            <input
              ref={fileInput} type="file" multiple style={{ display: "none" }}
              onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); }}
            />

            {items.length === 0 && (
              <>
                <div style={{ fontSize: "44px", marginBottom: "1rem" }}>☁️</div>
                <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "8px" }}>
                  Drop files here or click to browse
                </div>
                <div style={{ fontSize: "13px", color: "#8888aa" }}>
                  Any file type · Multiple files · Encrypted locally before upload
                </div>
              </>
            )}

            {items.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map(item => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${
                      item.status === "done" ? "rgba(79,255,176,0.2)"
                      : item.status === "error" ? "rgba(255,79,106,0.2)"
                      : "rgba(255,255,255,0.07)"
                    }`,
                    borderRadius: "12px", padding: "12px 14px",
                    transition: "all 0.2s",
                    animation: "fadeUp 0.3s ease forwards",
                  }}>
                    <span style={{ fontSize: "22px", flexShrink: 0 }}>{fileIcon(item.file.type)}</span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: "5px", gap: "8px",
                      }}>
                        <span style={{
                          fontSize: "13px", fontWeight: "500",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.file.name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span style={{ fontSize: "11px", color: "#55556a" }}>{fmtSize(item.file.size)}</span>

                          {item.status === "waiting" && (
                            <button
                              onClick={() => update(item.id, { isPublic: !item.isPublic })}
                              style={{
                                padding: "3px 10px", borderRadius: "100px", border: "none",
                                cursor: "pointer", fontSize: "11px", fontWeight: "600",
                                background: item.isPublic ? "rgba(79,195,255,0.12)" : "rgba(124,106,255,0.12)",
                                color: item.isPublic ? "#4fc3ff" : "#a78bfa",
                                transition: "all 0.15s",
                              }}
                            >
                              {item.isPublic ? "🌐 Public" : "🔒 Private"}
                            </button>
                          )}

                          {item.status === "done" && (
                            <span style={{
                              padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "600",
                              background: "rgba(79,255,176,0.1)", color: "#4fffb0",
                              border: "1px solid rgba(79,255,176,0.2)",
                            }}>✓ Stored</span>
                          )}

                          {item.status === "error" && (
                            <span style={{
                              padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "600",
                              background: "rgba(255,79,106,0.1)", color: "#ff4f6a",
                              border: "1px solid rgba(255,79,106,0.2)",
                            }}>✗ Failed</span>
                          )}

                          {(item.status === "encrypting" || item.status === "uploading") && (
                            <span style={{
                              padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "600",
                              background: "rgba(124,106,255,0.12)", color: "#a78bfa",
                              border: "1px solid rgba(124,106,255,0.2)",
                              animation: "pulse 1.5s ease infinite",
                            }}>
                              {item.status === "encrypting" ? "🔐 Encrypting..." : "🌊 Uploading..."}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.status !== "waiting" && item.status !== "error" && (
                        <div style={{
                          height: "3px", background: "rgba(255,255,255,0.06)",
                          borderRadius: "2px", overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%", width: item.progress + "%",
                            background: item.status === "done"
                              ? "linear-gradient(90deg, #4fffb0, #00d4aa)"
                              : "linear-gradient(90deg, #7c6aff, #a78bfa)",
                            borderRadius: "2px", transition: "width 0.4s ease",
                          }} />
                        </div>
                      )}

                      {item.status === "done" && item.blobId && (
                        <div style={{
                          fontSize: "10px", color: "#55556a", fontFamily: "monospace",
                          marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.blobId}
                        </div>
                      )}

                      {item.status === "error" && (
                        <div style={{ fontSize: "11px", color: "#ff4f6a", marginTop: "3px" }}>
                          {item.error}
                        </div>
                      )}
                    </div>

                    {item.status === "waiting" && (
                      <button
                        onClick={() => setItems(p => p.filter(i => i.id !== item.id))}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#55556a", fontSize: "16px", flexShrink: 0,
                          padding: "4px", borderRadius: "4px", transition: "color 0.15s",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px", padding: "7px 14px",
            }}>
              <span style={{ fontSize: "12px", color: "#8888aa" }}>New files:</span>
              <button
                onClick={() => setDefaultPublic(p => !p)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "12px", fontWeight: "600",
                  color: defaultPublic ? "#4fc3ff" : "#a78bfa",
                  transition: "color 0.15s",
                }}
              >
                {defaultPublic ? "🌐 Public" : "🔒 Private"}
              </button>
            </div>

            {items.length > 0 && (
              <button
                onClick={() => fileInput.current?.click()}
                style={{
                  padding: "8px 16px", borderRadius: "10px", fontSize: "13px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#8888aa", cursor: "pointer", fontWeight: "500",
                  transition: "all 0.15s",
                }}
              >
                + Add more
              </button>
            )}

            {hasWaiting && (
              <button
                onClick={uploadAll}
                disabled={uploading}
                style={{
                  marginLeft: "auto", padding: "10px 24px",
                  borderRadius: "10px", border: "none",
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: "600",
                  background: uploading
                    ? "rgba(124,106,255,0.4)"
                    : "linear-gradient(135deg, #7c6aff, #6355e0)",
                  color: "white",
                  boxShadow: uploading ? "none" : "0 0 24px rgba(124,106,255,0.4)",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: "8px",
                }}
              >
                {uploading ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    ⬆ Upload {items.filter(i => i.status === "waiting").length} file
                    {items.filter(i => i.status === "waiting").length !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            )}

            {allSettled && (
              <button
                onClick={() => setItems([])}
                style={{
                  marginLeft: "auto", padding: "10px 24px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#8888aa", cursor: "pointer", fontSize: "13px",
                  fontWeight: "500", transition: "all 0.15s",
                }}
              >
                Upload more
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}