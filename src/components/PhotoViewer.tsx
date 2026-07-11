import { useEffect, useState } from "react";
type Props = { src: string; alt: string; onFailure: () => void };
const TIMEOUT_MS = 12000;
export function PhotoViewer({ src, alt, onFailure }: Props) {
  const [state, setState] = useState<"loading" | "ready">("loading");
  useEffect(() => {
    let active = true; setState("loading");
    const image = new Image(); const timeout = window.setTimeout(() => { if (active) { active = false; onFailure(); } }, TIMEOUT_MS);
    image.onload = () => { if (active) { window.clearTimeout(timeout); setState("ready"); } };
    image.onerror = () => { if (active) { window.clearTimeout(timeout); active = false; onFailure(); } };
    image.src = src;
    return () => { active = false; window.clearTimeout(timeout); image.onload = null; image.onerror = null; };
  }, [src, onFailure]);
  return <div className={`photo-viewer ${state}`}>
    {state === "loading" && <div className="photo-loading"><span className="scanline" /><p>街の灯りを読み込んでいます…</p></div>}
    {state === "ready" && <img src={src} alt={alt} onError={onFailure} />}
    <span className="photo-corner top" /><span className="photo-corner bottom" />
  </div>;
}
