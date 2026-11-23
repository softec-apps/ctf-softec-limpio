import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pause, Play } from "lucide-react";
import "./hacker.css";
const MotionContext = createContext({
  paused: false,
  toggle: () => {},
  reduced: false,
});

function CodeRain({ paused }: { paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0,
      height = 0;
    let frame = 0;
    let last = 0;
    let drops: number[] = [];
    let running = false;
    const glyphs = "01アイウエオカキクケコサシスセソタチツテトSEVENTECH";
    const glyph = (i: number) => glyphs[i % glyphs.length];
    function staticFrame() {
      ctx!.clearRect(0, 0, width, height);
      ctx!.font = "13px Consolas,monospace";
      for (let col = 0; col < drops.length; col++) {
        for (let row = 0; row < 12; row++) {
          ctx!.fillStyle = `rgba(69,233,123,${0.04 + (row % 4) * 0.025})`;
          ctx!.fillText(
            glyph(col * 13 + row * 7),
            col * 26,
            (col * 73 + row * 22) % Math.max(1, height),
          );
        }
      }
    }
    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      element!.width = width * ratio;
      element!.height = height * ratio;
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      drops = Array.from(
        { length: Math.ceil(width / 26) },
        (_, i) => -((i * 11) % Math.max(1, Math.ceil(height / 21))),
      );
      staticFrame();
    }
    function draw(time: number) {
      if (!running) return;
      frame = requestAnimationFrame(draw);
      if (time - last < 90) return;
      last = time;
      ctx!.fillStyle = "rgba(2,8,5,.075)";
      ctx!.fillRect(0, 0, width, height);
      ctx!.font = "13px Consolas,monospace";
      drops.forEach((y, i) => {
        ctx!.fillStyle =
          i % 9 === 0 ? "rgba(166,255,192,.6)" : "rgba(39,194,91,.33)";
        ctx!.fillText(glyph(Math.floor(time / 110) + i * 7), i * 26, y * 21);
        drops[i] += i % 3 === 0 ? 0.65 : 0.4;
        if (y * 21 > height + 60) drops[i] = -((i * 13) % 50);
      });
    }
    function reconcile() {
      const next =
        !paused &&
        !media.matches &&
        !document.hidden &&
        !document.querySelector(".workstation-dialog[open]");
      if (next === running) return;
      running = next;
      cancelAnimationFrame(frame);
      if (running) {
        last = 0;
        frame = requestAnimationFrame(draw);
      } else staticFrame();
    }
    resize();
    reconcile();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", reconcile);
    media.addEventListener("change", reconcile);
    const observer = new MutationObserver(reconcile);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", reconcile);
      media.removeEventListener("change", reconcile);
    };
  }, [paused]);
  return <canvas ref={canvas} className="matrix-rain" aria-hidden="true" />;
}
export function MotionToggle() {
  const { paused, toggle, reduced } = useContext(MotionContext);
  return (
    <button
      className="matrix-motion"
      onClick={toggle}
      disabled={reduced}
      aria-pressed={!paused && !reduced}
      title={
        reduced
          ? "Movimiento reducido del sistema activado"
          : paused
            ? "Activar lluvia de código"
            : "Pausar lluvia de código"
      }
    >
      {paused || reduced ? <Play size={12} /> : <Pause size={12} />}
      <span>{paused || reduced ? "Fondo estático" : "Pausar fondo"}</span>
    </button>
  );
}
export default function MatrixTheme({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem("seventech:motion") === "paused";
    } catch {
      return false;
    }
  });
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  function toggle() {
    setPaused((p) => {
      try {
        localStorage.setItem("seventech:motion", p ? "running" : "paused");
      } catch {}
      return !p;
    });
  }
  return (
    <MotionContext.Provider value={{ paused, toggle, reduced }}>
      <div className="matrix-theme">
        <CodeRain paused={paused} />
        {children}
      </div>
    </MotionContext.Provider>
  );
}
