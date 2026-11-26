"use client";

import { useEffect, useRef, useState } from "react";
import { nearestSkinTone, type SkinToneId } from "@/lib/domain";

export type ScanResult = { skinTone?: SkinToneId; bodyFatPct?: number };
type Estimate = {
  usable: boolean;
  reason_if_unusable: string;
  body_fat_low: number;
  body_fat_high: number;
  body_shape: string;
  confidence: string;
  notes: string;
};

/** Button + dialog: scan yourself with the camera or a photo to match skin tone (and optionally estimate body fat). */
export function PhotoScanButton({ onResult }: { onResult: (r: ScanResult) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-outline !py-2 text-xs" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
          <circle cx="12" cy="10" r="3" />
          <path d="M7 18c1-2.5 3-3.5 5-3.5s4 1 5 3.5" />
        </svg>
        Scan me with a photo
      </button>
      {open && <ScanDialog onClose={() => setOpen(false)} onApply={(r) => { onResult(r); setOpen(false); }} />}
    </>
  );
}

function ScanDialog({ onClose, onApply }: { onClose: () => void; onApply: (r: ScanResult) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<"choose" | "camera" | "photo">("choose");
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<{ x: number; y: number; w: number; h: number; rgb: [number, number, number] } | null>(null);
  const [aiOk, setAiOk] = useState<boolean | null>(null);
  const [consent, setConsent] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  useEffect(() => {
    fetch("/api/scan").then((r) => r.json()).then((d) => setAiOk(!!d.ai)).catch(() => setAiOk(false));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose]);

  async function startCamera() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false });
      stream.current = s;
      setMode("camera");
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
      });
    } catch {
      setError("We couldn't open your camera. Check the browser's camera permission, or upload a photo instead.");
    }
  }

  function capture() {
    const v = video.current;
    const c = canvas.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    stream.current?.getTracks().forEach((t) => t.stop());
    setMode("photo");
    autoSample();
  }

  function loadFile(f: File) {
    if (!f.type.startsWith("image/")) return setError("Choose an image file.");
    const img = new Image();
    img.onload = () => {
      const c = canvas.current!;
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      setMode("photo");
      autoSample();
    };
    img.onerror = () => setError("That image couldn't be opened.");
    img.src = URL.createObjectURL(f);
  }

  function sampleAt(x: number, y: number) {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const r = Math.max(4, Math.round(Math.min(c.width, c.height) * 0.015));
    const data = ctx.getImageData(Math.max(0, x - r), Math.max(0, y - r), r * 2, r * 2).data;
    let R = 0, G = 0, B = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      R += data[i];
      G += data[i + 1];
      B += data[i + 2];
      n++;
    }
    setSample({ x, y, w: c.width, h: c.height, rgb: [Math.round(R / n), Math.round(G / n), Math.round(B / n)] });
  }

  // Default guess: upper-middle of the frame, where a face usually is.
  function autoSample() {
    requestAnimationFrame(() => {
      const c = canvas.current;
      if (c) sampleAt(Math.round(c.width / 2), Math.round(c.height * 0.28));
    });
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvas.current!;
    const rect = c.getBoundingClientRect();
    sampleAt(Math.round(((e.clientX - rect.left) / rect.width) * c.width), Math.round(((e.clientY - rect.top) / rect.height) * c.height));
  }

  async function runEstimate() {
    const c = canvas.current!;
    setEstimating(true);
    setError(null);
    setEstimate(null);
    // Downscale to keep the upload small.
    const scale = Math.min(1, 900 / Math.max(c.width, c.height));
    const small = document.createElement("canvas");
    small.width = Math.round(c.width * scale);
    small.height = Math.round(c.height * scale);
    small.getContext("2d")!.drawImage(c, 0, 0, small.width, small.height);
    const b64 = small.toDataURL("image/jpeg", 0.85).split(",")[1];
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, mediaType: "image/jpeg", skinTone: tone?.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Estimate failed.");
      setEstimate(d.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estimate failed.");
    } finally {
      setEstimating(false);
    }
  }

  const tone = sample ? nearestSkinTone(...sample.rgb) : null;
  const mid = estimate?.usable ? Math.round((estimate.body_fat_low + estimate.body_fat_high) / 2) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Scan yourself">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-xl bg-white sm:rounded-[3px]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <div className="eyebrow">Body scan</div>
            <div className="text-sm text-slate">Match your character to you. Your photo stays on this device unless you ask for an AI estimate.</div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost !px-2" aria-label="Close">✕</button>
        </div>

        <div className="space-y-4 p-5">
          {error && <p className="rounded-[2px] bg-alert-tint px-3 py-2 text-sm text-alert">{error}</p>}

          {mode === "choose" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={startCamera} className="card flex flex-col items-start gap-2 p-5 text-left hover:border-blue">
                <span className="text-2xl" aria-hidden>📷</span>
                <span className="font-bold">Use my camera</span>
                <span className="text-xs text-slate">Stand back so your face and upper body are in frame, in even light.</span>
              </button>
              <label className="card flex cursor-pointer flex-col items-start gap-2 p-5 hover:border-blue">
                <span className="text-2xl" aria-hidden>🖼️</span>
                <span className="font-bold">Upload a photo</span>
                <span className="text-xs text-slate">A recent, front-facing photo in good light works best.</span>
                <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
              </label>
            </div>
          )}

          {mode === "camera" && (
            <div className="space-y-3">
              <video ref={video} playsInline muted className="w-full rounded-[2px] bg-navy" style={{ transform: "scaleX(-1)" }} />
              <button type="button" className="btn-primary w-full" onClick={capture}>Take photo</button>
            </div>
          )}

          <div className={mode === "photo" ? "space-y-4" : "hidden"}>
            <div className="relative">
              <canvas ref={canvas} onClick={onCanvasClick} className="w-full cursor-crosshair rounded-[2px] bg-mist" aria-label="Your photo. Tap your cheek or forearm to sample skin tone." />
              {sample && (
                <span
                  className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_#2251ff]"
                  style={{ left: `${(sample.x / sample.w) * 100}%`, top: `${(sample.y / sample.h) * 100}%` }}
                />
              )}
            </div>
            <p className="text-xs text-slate">Tap your cheek or forearm (not a shadow or highlight) to sample your skin tone.</p>

            {tone && (
              <div className="flex items-center gap-3 rounded-[2px] border border-line p-3">
                <span className="h-10 w-10 rounded-full border-2 border-white shadow-[0_0_0_1px_#dfe4e8]" style={{ background: tone.hex }} />
                <div className="text-sm">
                  <div className="font-bold">Closest character tone: {tone.label}</div>
                  <div className="text-xs text-muted">You can still change it by hand afterwards.</div>
                </div>
              </div>
            )}

            <div className="rounded-[2px] border border-line p-3">
              <div className="text-sm font-bold">Optional: estimate body fat from this photo</div>
              {aiOk === false ? (
                <p className="mt-1 text-xs text-muted">AI estimates aren&apos;t switched on for this server yet. Skin tone matching still works.</p>
              ) : (
                <>
                  <label className="mt-2 flex items-start gap-2 text-xs text-slate">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-bcg-deep" />
                    <span>
                      Send this photo to NutriGoal&apos;s AI model once to estimate a body-fat range for my character. The photo isn&apos;t
                      saved. It&apos;s a rough visual estimate, not a medical measurement.
                    </span>
                  </label>
                  <button type="button" className="btn-outline mt-2 !py-2 text-xs" disabled={!consent || estimating} onClick={runEstimate}>
                    {estimating ? "Estimating…" : "Estimate body fat"}
                  </button>
                </>
              )}
              {estimate && (
                <div className="mt-3 text-sm">
                  {estimate.usable ? (
                    <>
                      <div className="font-bold">
                        About {estimate.body_fat_low}–{estimate.body_fat_high}% body fat · {estimate.body_shape} · {estimate.confidence} confidence
                      </div>
                      <p className="text-xs text-slate">{estimate.notes}</p>
                    </>
                  ) : (
                    <p className="text-xs text-warn">{estimate.reason_if_unusable || "That photo couldn't be used. Try a clearer, front-facing photo."}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => { setMode("choose"); setSample(null); setEstimate(null); }}>Retake</button>
              <button type="button" className="btn-primary" disabled={!tone} onClick={() => onApply({ skinTone: tone?.id, bodyFatPct: mid })}>
                Apply to my character{mid ? ` (and ${mid}% body fat)` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
