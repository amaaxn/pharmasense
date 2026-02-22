import { useEffect, useRef, useCallback } from "react";

const LINE_COUNT = 20;

const lines = Array.from({ length: LINE_COUNT }, (_, i) => {
  const angle = (i / LINE_COUNT) * 360;
  const golden = 1.618033988749;
  const offsetX = ((i * golden * 31.7) % 100);
  const offsetY = ((i * golden * 47.3) % 100);
  const length = 150 + (i % 7) * 60;
  return { angle, offsetX, offsetY, length, id: i };
});

export function MouseGradientBg() {
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 50, y: 50 });
  const currentRef = useRef({ x: 50, y: 50 });

  const animate = useCallback(() => {
    currentRef.current.x += (mouseRef.current.x - currentRef.current.x) * 0.04;
    currentRef.current.y += (mouseRef.current.y - currentRef.current.y) * 0.04;

    const cx = currentRef.current.x;
    const cy = currentRef.current.y;

    linesRef.current.forEach((el, i) => {
      if (!el) return;
      const line = lines[i]!;
      const parallax = 0.3 + (i % 4) * 0.15;
      const dx = (cx - 50) * parallax;
      const dy = (cy - 50) * parallax;
      const rotation = line.angle + (cx - 50) * 0.08;
      const distX = cx - line.offsetX;
      const distY = cy - line.offsetY;
      const dist = Math.sqrt(distX * distX + distY * distY);
      const opacity = Math.max(0.03, Math.min(0.18, 0.2 - dist * 0.003));

      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
      el.style.opacity = `${opacity}`;
    });

    if (containerRef.current) {
      containerRef.current.style.setProperty("--mx", `${cx}%`);
      containerRef.current.style.setProperty("--my", `${cy}%`);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const handleMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 100;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 100;
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ ["--mx" as string]: "50%", ["--my" as string]: "50%" }}
      aria-hidden="true"
    >
      {lines.map((line) => (
        <div
          key={line.id}
          ref={(el) => { linesRef.current[line.id] = el; }}
          className="absolute will-change-transform"
          style={{
            left: `${line.offsetX}%`,
            top: `${line.offsetY}%`,
            width: `${line.length}px`,
            height: "1px",
            opacity: 0.06,
            transform: `rotate(${line.angle}deg)`,
            transformOrigin: "center center",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, transparent, rgba(168,85,247,0.5) 30%, rgba(124,58,237,0.3) 70%, transparent)` }}
          />
          <div
            className="absolute -top-[2px] -bottom-[2px] left-0 right-0 blur-[3px]"
            style={{ background: `linear-gradient(90deg, transparent, rgba(168,85,247,0.3) 40%, rgba(59,130,246,0.2) 60%, transparent)` }}
          />
        </div>
      ))}

      <div
        className="absolute h-[500px] w-[500px] rounded-full opacity-[0.06] blur-[140px]"
        style={{
          background: "radial-gradient(circle, #7f1d3a, #a855f7 50%, transparent 70%)",
          left: "var(--mx)",
          top: "var(--my)",
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full opacity-[0.035] blur-[100px]"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full opacity-[0.025] blur-[90px]"
        style={{ background: "radial-gradient(circle, #7f1d3a, transparent 70%)" }}
      />
    </div>
  );
}
