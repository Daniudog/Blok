"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

interface StoredFile {
  blobId: string;
  name: string;
  size: number;
  type: string;
  storedAt: number;
  wallet: string;
  isPublic: boolean;
  isEncrypted: boolean;
}

interface Album {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
  wallet: string;
  fileIds: string[];
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
  if (type.includes("zip") || type.includes("rar")) return "🗜️";
  if (type.includes("text") || type.includes("document")) return "📝";
  return "📁";
}

const EMOJIS = ["📁", "🎨", "🎵", "🎬", "📸", "📝", "💼", "🔬", "🏠", "⭐", "🔒", "🌊"];

export function Albums() {
  const account = useCurrentAccount();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📁");
  const [addingFiles, setAddingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    if (!account) return;
    const allFiles: StoredFile[] = JSON.parse(localStorage.getItem("blok_files") || "[]");
    setFiles(allFiles.filter(f => f.wallet === account.address));
    const allAlbums: Album[] = JSON.parse(localStorage.getItem("blok_albums") || "[]");
    setAlbums(allAlbums.filter(a => a.wallet === account.address));
  }, [account]);

  if (!account) return null;

  function saveAlbums(updated: Album[]) {
    const all: Album[] = JSON.parse(localStorage.getItem("blok_albums") || "[]");
    const others = all.filter(a => a.wallet !== account!.address);
    localStorage.setItem("blok_albums", JSON.stringify([...others, ...updated]));
    setAlbums(updated);
  }

  function createAlbum() {
    if (!newName.trim()) return;
    const album: Album = {
      id: Math.random().toString(36).slice(2),
      name: newName.trim(),
      emoji: newEmoji,
      createdAt: Date.now(),
      wallet: account!.address,
      fileIds: [],
    };
    const updated = [...albums, album];
    saveAlbums(updated);
    setNewName("");
    setNewEmoji("📁");
    setCreating(false);
  }

  function deleteAlbum(id: string) {
    saveAlbums(albums.filter(a => a.id !== id));
    if (activeAlbum?.id === id) setActiveAlbum(null);
  }

  function addFilesToAlbum() {
    if (!activeAlbum || !selectedFiles.length) return;
    const updated = albums.map(a =>
      a.id === activeAlbum.id
        ? { ...a, fileIds: [...new Set([...a.fileIds, ...selectedFiles])] }
        : a
    );
    saveAlbums(updated);
    setActiveAlbum(updated.find(a => a.id === activeAlbum.id) || null);
    setSelectedFiles([]);
    setAddingFiles(false);
  }

  function removeFileFromAlbum(blobId: string) {
    if (!activeAlbum) return;
    const updated = albums.map(a =>
      a.id === activeAlbum.id
        ? { ...a, fileIds: a.fileIds.filter(id => id !== blobId) }
        : a
    );
    saveAlbums(updated);
    setActiveAlbum(updated.find(a => a.id === activeAlbum.id) || null);
  }

  const albumFiles = activeAlbum
    ? files.filter(f => activeAlbum.fileIds.includes(f.blobId))
    : [];

  const unaddedFiles = files.filter(f =>
    !activeAlbum?.fileIds.includes(f.blobId)
  );

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", color: "#f0f0ff",
    padding: "9px 14px", fontSize: "14px",
    outline: "none", fontFamily: "inherit",
    width: "100%", transition: "all 0.2s",
  };

  return (
    <div style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}>

      {/* Add files modal */}
      {addingFiles && activeAlbum && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.2s ease forwards",
        }}>
          <div style={{
            background: "#0f0f1a", border: "1px solid rgba(124,106,255,0.25)",
            borderRadius: "16px", padding: "1.5rem",
            width: "100%", maxWidth: "500px", margin: "1rem",
            boxShadow: "0 0 60px rgba(124,106,255,0.15)",
            animation: "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
            maxHeight: "80vh", display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>
                Add files to {activeAlbum.emoji} {activeAlbum.name}
              </h3>
              <button onClick={() => { setAddingFiles(false); setSelectedFiles([]); }} style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", padding: "5px 10px", color: "#8888aa",
                cursor: "pointer", fontSize: "13px",
              }}>✕</button>
            </div>

            {unaddedFiles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#8888aa", fontSize: "14px" }}>
                All your files are already in this album
              </div>
            ) : (
              <>
                <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1rem" }}>
                  {unaddedFiles.map(file => (
                    <div
                      key={file.blobId}
                      onClick={() => setSelectedFiles(p =>
                        p.includes(file.blobId) ? p.filter(id => id !== file.blobId) : [...p, file.blobId]
                      )}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "10px 14px", borderRadius: "10px", cursor: "pointer",
                        background: selectedFiles.includes(file.blobId)
                          ? "rgba(124,106,255,0.12)"
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selectedFiles.includes(file.blobId)
                          ? "rgba(124,106,255,0.35)"
                          : "rgba(255,255,255,0.07)"}`,
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${selectedFiles.includes(file.blobId) ? "#7c6aff" : "rgba(255,255,255,0.2)"}`,
                        background: selectedFiles.includes(file.blobId) ? "#7c6aff" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", color: "white",
                      }}>
                        {selectedFiles.includes(file.blobId) ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: "18px" }}>{fileIcon(file.type)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "13px", fontWeight: "500",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{file.name}</div>
                        <div style={{ fontSize: "11px", color: "#55556a" }}>{fmtSize(file.size)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={addFilesToAlbum}
                    disabled={!selectedFiles.length}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "10px", border: "none",
                      background: selectedFiles.length
                        ? "linear-gradient(135deg, #7c6aff, #6355e0)"
                        : "rgba(124,106,255,0.3)",
                      color: "white", fontWeight: "600", fontSize: "14px",
                      cursor: selectedFiles.length ? "pointer" : "not-allowed",
                      boxShadow: selectedFiles.length ? "0 0 20px rgba(124,106,255,0.3)" : "none",
                    }}
                  >
                    Add {selectedFiles.length > 0 ? selectedFiles.length : ""} file{selectedFiles.length !== 1 ? "s" : ""}
                  </button>
                  <button
                    onClick={() => { setAddingFiles(false); setSelectedFiles([]); }}
                    style={{
                      padding: "10px 16px", borderRadius: "10px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#8888aa", cursor: "pointer", fontSize: "14px",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          {activeAlbum ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => setActiveAlbum(null)}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px", padding: "6px 12px",
                  color: "#8888aa", cursor: "pointer", fontSize: "13px",
                  transition: "all 0.15s",
                }}
              >
                ← Back
              </button>
              <h2 style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.4px" }}>
                {activeAlbum.emoji} {activeAlbum.name}
              </h2>
              <span style={{
                padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "600",
                background: "rgba(124,106,255,0.1)", color: "#a78bfa",
                border: "1px solid rgba(124,106,255,0.2)",
              }}>
                {albumFiles.length} file{albumFiles.length !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "3px", letterSpacing: "-0.4px" }}>
                Albums
              </h2>
              <p style={{ fontSize: "13px", color: "#8888aa" }}>
                Organize your files into collections
              </p>
            </div>
          )}
        </div>

        {!activeAlbum && (
          <button
            onClick={() => setCreating(true)}
            style={{
              padding: "9px 18px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #7c6aff, #6355e0)",
              color: "white", fontWeight: "600", fontSize: "13px",
              cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)",
              transition: "all 0.2s",
            }}
          >
            + New Album
          </button>
        )}

        {activeAlbum && (
          <button
            onClick={() => setAddingFiles(true)}
            style={{
              padding: "9px 18px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #7c6aff, #6355e0)",
              color: "white", fontWeight: "600", fontSize: "13px",
              cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)",
              transition: "all 0.2s",
            }}
          >
            + Add Files
          </button>
        )}
      </div>

      {/* Create album form */}
      {creating && (
        <div style={{
          background: "rgba(124,106,255,0.06)",
          border: "1px solid rgba(124,106,255,0.2)",
          borderRadius: "14px", padding: "1.25rem",
          marginBottom: "1.5rem",
          animation: "scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards",
        }}>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "1rem" }}>
            New Album
          </div>

          {/* Emoji picker */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "12px", color: "#8888aa", marginBottom: "8px" }}>Choose icon</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setNewEmoji(e)}
                  style={{
                    width: "36px", height: "36px", borderRadius: "8px", border: "none",
                    cursor: "pointer", fontSize: "18px",
                    background: newEmoji === e ? "rgba(124,106,255,0.25)" : "rgba(255,255,255,0.04)",
                    outline: newEmoji === e ? "2px solid rgba(124,106,255,0.6)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <input
            style={{ ...inputStyle, marginBottom: "1rem" }}
            placeholder="Album name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createAlbum()}
            autoFocus
          />

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={createAlbum}
              disabled={!newName.trim()}
              style={{
                flex: 1, padding: "9px", borderRadius: "9px", border: "none",
                background: newName.trim()
                  ? "linear-gradient(135deg, #7c6aff, #6355e0)"
                  : "rgba(124,106,255,0.3)",
                color: "white", fontWeight: "600", fontSize: "13px",
                cursor: newName.trim() ? "pointer" : "not-allowed",
              }}
            >
              Create Album
            </button>
            <button
              onClick={() => { setCreating(false); setNewName(""); setNewEmoji("📁"); }}
              style={{
                padding: "9px 16px", borderRadius: "9px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#8888aa", cursor: "pointer", fontSize: "13px",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Album grid view */}
      {!activeAlbum && (
        <>
          {albums.length === 0 && !creating ? (
            <div style={{
              textAlign: "center", padding: "5rem 0",
              animation: "fadeUp 0.4s ease forwards",
            }}>
              <div style={{ fontSize: "52px", marginBottom: "1rem" }}>🗂️</div>
              <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "6px" }}>No albums yet</div>
              <div style={{ fontSize: "13px", color: "#8888aa", marginBottom: "1.5rem" }}>
                Create your first album to organize your files
              </div>
              <button
                onClick={() => setCreating(true)}
                style={{
                  padding: "10px 24px", borderRadius: "10px", border: "none",
                  background: "linear-gradient(135deg, #7c6aff, #6355e0)",
                  color: "white", fontWeight: "600", fontSize: "14px",
                  cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)",
                }}
              >
                + Create Album
              </button>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "12px",
            }}>
              {albums.map((album, i) => {
                const albumFileCount = files.filter(f => album.fileIds.includes(f.blobId)).length;
                const albumSize = files
                  .filter(f => album.fileIds.includes(f.blobId))
                  .reduce((acc, f) => acc + f.size, 0);

                return (
                  <div
                    key={album.id}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "14px", padding: "1.25rem",
                      cursor: "pointer", transition: "all 0.2s",
                      animation: `fadeUp 0.3s ease ${i * 60}ms forwards`,
                      opacity: 0, position: "relative",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,106,255,0.35)";
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(124,106,255,0.06)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    }}
                    onClick={() => setActiveAlbum(album)}
                  >
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteAlbum(album.id); }}
                      style={{
                        position: "absolute", top: "10px", right: "10px",
                        background: "none", border: "none", cursor: "pointer",
                        color: "#55556a", fontSize: "14px", padding: "4px",
                        borderRadius: "4px", transition: "color 0.15s",
                        opacity: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ff4f6a")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#55556a")}
                    >
                      ✕
                    </button>

                    <div style={{ fontSize: "36px", marginBottom: "0.75rem" }}>{album.emoji}</div>
                    <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {album.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#55556a" }}>
                      {albumFileCount} file{albumFileCount !== 1 ? "s" : ""}
                      {albumSize > 0 ? ` · ${fmtSize(albumSize)}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Album detail view */}
      {activeAlbum && (
        <div>
          {albumFiles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 0" }}>
              <div style={{ fontSize: "44px", marginBottom: "1rem" }}>📭</div>
              <div style={{ fontWeight: "600", marginBottom: "6px" }}>This album is empty</div>
              <div style={{ fontSize: "13px", color: "#8888aa", marginBottom: "1.5rem" }}>
                Add files from your Blok library
              </div>
              <button
                onClick={() => setAddingFiles(true)}
                style={{
                  padding: "10px 24px", borderRadius: "10px", border: "none",
                  background: "linear-gradient(135deg, #7c6aff, #6355e0)",
                  color: "white", fontWeight: "600", fontSize: "14px",
                  cursor: "pointer", boxShadow: "0 0 20px rgba(124,106,255,0.3)",
                }}
              >
                + Add Files
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {albumFiles.map((file, i) => (
                <div key={file.blobId} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "12px", padding: "12px 14px",
                  transition: "all 0.2s",
                  animation: `fadeUp 0.3s ease ${i * 40}ms forwards`,
                  opacity: 0,
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
                  <div style={{
                    width: "42px", height: "42px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "20px", flexShrink: 0,
                  }}>
                    {fileIcon(file.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "14px", fontWeight: "500", marginBottom: "3px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#55556a" }}>
                      {fmtSize(file.size)} · {file.isPublic ? "🌐 Public" : "🔒 Private"}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFileFromAlbum(file.blobId)}
                    title="Remove from album"
                    style={{
                      background: "rgba(255,79,106,0.08)",
                      border: "1px solid rgba(255,79,106,0.15)",
                      borderRadius: "8px", padding: "6px 10px",
                      color: "#ff4f6a", cursor: "pointer", fontSize: "12px",
                      transition: "all 0.15s", flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}