import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * Parallax system — scroll-linked motion for the whole site.
 * SmoothScrollProvider: buttery inertial scrolling (Lenis, client-only).
 * Parallax:             drifts children vertically as the section scrolls by.
 * ParallaxImage:        classic overflow-hidden image parallax.
 * Reveal:               fade/slide-in when a section enters the viewport.
 * FloatingOrb:          decorative glowing blob with parallax drift + idle float.
 */

export function SmoothScrollProvider() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lenis: { raf: (time: number) => void; destroy: () => void } | null = null;
    let raf = 0;
    let cancelled = false;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const instance = new Lenis({ lerp: 0.12, wheelMultiplier: 1, touchMultiplier: 1.4 });
      lenis = instance;
      const loop = (time: number) => {
        instance.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);
  return null;
}

export function Parallax({
  children,
  y = 60,
  className,
}: {
  children: ReactNode;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const translateY = useTransform(scrollYProgress, [0, 1], [y, -y]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? {} : { translateY }}>{children}</motion.div>
    </div>
  );
}

export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ""}`}>
      <motion.img
        src={src}
        alt={alt}
        style={reduce ? {} : { y, scale: 1.28 }}
        className={imgClassName ?? "h-full w-full object-cover"}
      />
    </div>
  );
}

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute rounded-full bg-primary/20 blur-3xl ${className ?? ""}`}
      animate={{ y: [0, -26, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 9, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function ParallaxBadge({
  children,
  className,
  speed = 26,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const translateY = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? {} : { translateY }}>{children}</motion.div>
    </div>
  );
}
