"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ConnectButton, useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";

export default function FilePage() {
  const params = useParams();
  const blobId = params?.blobId as string;
  const account = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState<{name:string;type:string;size:number;isLocked?:boolean;visibility?:string} | null>(null);
  const [needsDecrypt, setNeedsDecrypt] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!blobId) return;
    const all = JSON.parse(localStorage.getItem("blok_files") || "[]");
    const found = all.find((f: {blobId:string}) => f.blobId === blobId);
    if (found) {
      setFileInfo(found);
      if (found.isLocked || found.visibility === "locked") {
        setNeedsDecrypt(true);
        setLoading(false);
        return;
      }
    }
    loadFile();
  }, [blobId]);

  async function loadFile(key?: CryptoKey) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/upload?blobId=" + blobId);
      if (!res.ok) throw new Error("File not found on Walrus — it may have expired on testnet");
      let buf = await res.arrayBuffer();
      if (key) {
        const iv = buf.slice(0, 12);
        buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, buf.slice(12));
      }
      const type = fileInfo?.type || "application/octet-stream";
      setUrl(URL.createObjectURL(new Blob([buf], { type })));
    } catch(e) {
      setError(e instanceof Error ? e.message : "Failed to load file");
    }
    setLoading(false);
  }

  async function decrypt() {
    if (!account) return;
    setDecrypting(true);
    try {
      const { signature } = await signMessage({
        message: new TextEncoder().encode("Blok encryption key — " + account.address)
      });
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(signature.slice(0,32).padEnd(32,"0")),
        "AES-GCM", false, ["encrypt","decrypt"]
      );
      setNeedsDecrypt(false);
      await loadFile(key);
    } catch {
      setError("Decryption failed. Make sure you are using the correct wallet.");
    }
    setDecrypting(false);
  }

  function download() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileInfo?.name || "blok-file";
    a.click();
    setDownloaded(true);
  }

  const isImg = fileInfo?.type?.startsWith("image/");
  const isVid = fileInfo?.type?.startsWith("video/");
  const isAud = fileInfo?.type?.startsWith("audio/");

  return (
    <div style={{minHeight:"100vh",background:"#08080f",color:"#f0f0ff",fontFamily:"system-ui,sans-serif"}}>
      <header style={{background:"rgba(8,8,15,0.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"0 2rem",height:"60px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",cursor:"pointer"}} onClick={() => window.location.href="/"}>
          <div style={{width:"28px",height:"28px",background:"linear-gradient(135deg,#7c6aff,#a78bfa)",borderRadius:"7px",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 16px rgba(124,106,255,0.4)"}}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" fill="white"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" fill="white" opacity="0.6"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" fill="white" opacity="0.6"/><rect x="9" y="9" width="5.5" height="5.5" rx="1.5" fill="white"/></svg>
          </div>
          <span style={{fontWeight:"700",fontSize:"16px",letterSpacing:"-0.4px"}}>Blok</span>
        </div>
        <ConnectButton />
      </header>

      <div style={{maxWidth:"680px",margin:"0 auto",padding:"3rem 2rem"}}>
        <div style={{marginBottom:"1.5rem"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:"6px",background:"rgba(124,106,255,0.1)",border:"1px solid rgba(124,106,255,0.2)",borderRadius:"100px",padding:"4px 12px",fontSize:"11px",color:"#a78bfa",marginBottom:"1rem"}}>
            Shared via Blok · Stored on Walrus
          </div>
          {fileInfo && (
            <h1 style={{fontSize:"22px",fontWeight:"700",marginBottom:"6px",letterSpacing:"-0.4px"}}>{fileInfo.name}</h1>
          )}
          <div style={{fontSize:"11px",color:"#55556a",fontFamily:"monospace",wordBreak:"break-all"}}>{blobId}</div>
        </div>

        {needsDecrypt && (
          <div style={{textAlign:"center",padding:"3rem 2rem",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"16px",marginBottom:"1.5rem"}}>
            <div style={{fontSize:"48px",marginBottom:"1rem"}}>🔒</div>
            <h2 style={{fontSize:"18px",fontWeight:"700",marginBottom:"8px"}}>This file is locked</h2>
            <p style={{color:"#8888aa",fontSize:"13px",marginBottom:"1.5rem",lineHeight:1.6}}>Sign with your wallet to decrypt and view. Your key never leaves your device.</p>
            {!account ? (
              <div>
                <p style={{color:"#8888aa",fontSize:"13px",marginBottom:"1rem"}}>Connect your wallet first</p>
                <ConnectButton />
              </div>
            ) : (
              <button onClick={decrypt} disabled={decrypting} style={{padding:"12px 28px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#7c6aff,#6355e0)",color:"white",fontWeight:"600",fontSize:"14px",cursor:decrypting?"not-allowed":"pointer",boxShadow:"0 0 20px rgba(124,106,255,0.35)"}}>
                {decrypting ? "Decrypting..." : "Sign to Decrypt & View"}
              </button>
            )}
          </div>
        )}

        {loading && !needsDecrypt && (
          <div style={{textAlign:"center",padding:"4rem",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"16px"}}>
            <div style={{fontSize:"32px",marginBottom:"1rem",animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</div>
            <p style={{color:"#8888aa",fontSize:"14px"}}>Loading file from Walrus...</p>
          </div>
        )}

        {error && (
          <div style={{background:"rgba(255,79,106,0.08)",border:"1px solid rgba(255,79,106,0.2)",borderRadius:"12px",padding:"1.5rem",textAlign:"center",marginBottom:"1.5rem"}}>
            <div style={{fontSize:"32px",marginBottom:"8px"}}>⚠️</div>
            <p style={{color:"#ff4f6a",fontSize:"14px",marginBottom:"8px"}}>{error}</p>
            <p style={{color:"#55556a",fontSize:"12px"}}>Note: Files on Walrus testnet expire after a set period. Only recently uploaded files are accessible.</p>
          </div>
        )}

        {url && (
          <div>
            <div style={{background:"rgba(0,0,0,0.4)",borderRadius:"16px",overflow:"hidden",marginBottom:"1.5rem",minHeight:"200px",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {isImg && <img src={url} alt={fileInfo?.name} style={{maxWidth:"100%",maxHeight:"520px",objectFit:"contain"}} />}
              {isVid && <video src={url} controls style={{maxWidth:"100%",maxHeight:"520px",width:"100%"}} />}
              {isAud && (
                <div style={{padding:"2rem",width:"100%",textAlign:"center"}}>
                  <div style={{fontSize:"56px",marginBottom:"1rem"}}>🎵</div>
                  <audio src={url} controls style={{width:"100%"}} />
                </div>
              )}
              {!isImg && !isVid && !isAud && (
                <div style={{textAlign:"center",padding:"2rem",color:"#8888aa"}}>
                  <div style={{fontSize:"56px",marginBottom:"12px"}}>📄</div>
                  <p style={{fontSize:"14px",marginBottom:"6px"}}>Preview not available for this file type</p>
                  <p style={{fontSize:"12px",color:"#55556a"}}>Download to open</p>
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
              <button onClick={download} style={{flex:1,padding:"12px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#7c6aff,#6355e0)",color:"white",fontWeight:"600",fontSize:"14px",cursor:"pointer",boxShadow:"0 0 20px rgba(124,106,255,0.3)",minWidth:"120px"}}>
                {downloaded ? "✓ Downloaded" : "⬇ Download"}
              </button>
              <button onClick={() => navigator.clipboard.writeText(window.location.href)} style={{padding:"12px 16px",borderRadius:"10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#8888aa",cursor:"pointer",fontSize:"13px"}}>
                Copy Link
              </button>
              <button onClick={() => window.location.href="/"} style={{padding:"12px 16px",borderRadius:"10px",background:"rgba(124,106,255,0.08)",border:"1px solid rgba(124,106,255,0.2)",color:"#a78bfa",cursor:"pointer",fontSize:"13px"}}>
                Open Blok
              </button>
            </div>
          </div>
        )}

        <div style={{marginTop:"2rem",padding:"1rem",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px"}}>
          <div style={{fontSize:"11px",color:"#55556a",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.07em"}}>Walrus Blob ID</div>
          <div style={{fontFamily:"monospace",fontSize:"12px",color:"#a78bfa",wordBreak:"break-all",marginBottom:"8px"}}>{blobId}</div>
          <button onClick={() => window.open("https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + blobId, "_blank")} style={{padding:"6px 12px",borderRadius:"8px",background:"rgba(124,106,255,0.08)",border:"1px solid rgba(124,106,255,0.2)",color:"#a78bfa",cursor:"pointer",fontSize:"12px",fontWeight:"500"}}>
            View on Walrus
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}