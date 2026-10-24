import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

// Thin cyan→violet progress bar pinned to the top of the viewport.
export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  return <motion.div style={{ scaleX }} className="fs-scroll-progress" aria-hidden="true" />;
};

// Headline whose words rise out of a mask one after another when scrolled into view.
export const WordReveal = ({ text, className = "", as: Tag = "span", delay = 0 }) => {
  const words = text.split(" ");
  return (
    <Tag className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", rotate: 4 }}
            whileInView={{ y: 0, rotate: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.06 }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};

// Card that tilts toward the pointer and shows a holographic foil sheen + spotlight that follows it.
export const HoloCard = ({ children, className = "", intensity = 9, ...rest }) => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 220, damping: 22 });
  const sy = useSpring(py, { stiffness: 220, damping: 22 });
  const rotateX = useTransform(sy, [0, 1], [intensity, -intensity]);
  const rotateY = useTransform(sx, [0, 1], [-intensity, intensity]);
  const mx = useTransform(sx, (v) => `${v * 100}%`);
  const my = useTransform(sy, (v) => `${v * 100}%`);
  const hue = useTransform(sx, [0, 1], [0, 120]);
  const spot = useMotionTemplate`radial-gradient(360px circle at ${mx} ${my}, rgba(94,231,255,0.16), transparent 60%)`;
  const foil = useMotionTemplate`conic-gradient(from ${hue}deg at ${mx} ${my}, #5ee7ff, #b18cff, #ff8fd0, #ffd27a, #5ee7ff)`;

  const move = (e) => {
    if (reduce || e.pointerType === "touch") return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const leave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      className={`fs-holo ${className}`}
      {...rest}
    >
      <motion.span aria-hidden="true" className="fs-holo-foil" style={{ background: foil }} />
      <motion.span aria-hidden="true" className="fs-holo-spot" style={{ background: spot }} />
      {children}
    </motion.div>
  );
};

// Button wrapper that is gently pulled toward the cursor.
export const Magnetic = ({ children, strength = 0.28, className = "" }) => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });
  const move = (e) => {
    if (reduce || e.pointerType === "touch") return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div ref={ref} onPointerMove={move} onPointerLeave={leave} style={{ x, y }} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  );
};

// Endless horizontal ticker; the track is duplicated so the loop is seamless.
export const Marquee = ({ items, className = "" }) => (
  <div className={`fs-marquee ${className}`} aria-hidden="true">
    <div className="fs-marquee-track">
      {[0, 1].map((k) => (
        <div key={k} className="fs-marquee-set">
          {items.map((it) => (
            <span key={`${k}-${it}`} className="fs-marquee-item">
              <span className="fs-marquee-dot" />
              {it}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Wrapper whose children parallax at different speeds as the section scrolls past.
export const Parallax = ({ children, from = 40, to = -40, className = "" }) => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [from, to]);
  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  );
};
