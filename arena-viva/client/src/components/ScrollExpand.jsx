import { useCallback, useEffect, useRef } from "react";
import "./ScrollExpand.css";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

export default function ScrollExpand({
  src = "",
  alt = "",
  title = "",
  scrollHint = "",
  startWidth = 70,
  startHeight = 70,
  startRadius = 22,
  endRadius = 0,
  mediaZoom = 1.18,
  scrollDistance = 0.9,
  holdDistance = 0.2,
  smoothing = 0.1,
  overlayScrim = 0.5,
  children,
  className = "",
}) {
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const mediaRef = useRef(null);
  const titleRef = useRef(null);
  const overlayRef = useRef(null);
  const scrimRef = useRef(null);

  const applyProgress = useCallback((progress) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;
    const eased = smoothstep(0, 1, progress);
    const width = startWidth + (100 - startWidth) * eased;
    const height = startHeight + (100 - startHeight) * eased;
    const x = Math.max(0, (100 - width) / 2);
    const y = Math.max(0, (100 - height) / 2);
    const radius = startRadius + (endRadius - startRadius) * eased;
    frame.style.clipPath = `inset(${y}% ${x}% ${y}% ${x}% round ${radius}px)`;
    media.style.transform = `scale(${mediaZoom + (1 - mediaZoom) * eased})`;
    if (scrimRef.current) scrimRef.current.style.opacity = `${overlayScrim * eased}`;
    if (titleRef.current) {
      const out = smoothstep(0.35, 0.82, progress);
      titleRef.current.style.opacity = `${1 - out}`;
      titleRef.current.style.transform = `translate3d(0, ${-24 * out}px, 0)`;
    }
    if (overlayRef.current) {
      const incoming = smoothstep(0.62, 1, progress);
      overlayRef.current.style.opacity = `${incoming}`;
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - incoming)}px, 0)`;
    }
  }, [endRadius, mediaZoom, overlayScrim, startHeight, startRadius, startWidth]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return undefined;
    let frame = 0;
    let current = 0;
    let target = 0;
    let stageHeight = 0;
    let running = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      stageHeight = window.innerHeight * 0.72;
      stage.style.height = `${stageHeight}px`;
      track.style.height = `${stageHeight * (1 + scrollDistance + holdDistance)}px`;
    };
    const readProgress = () => {
      const top = track.getBoundingClientRect().top;
      // Start while the section is still below the fold, so the expansion
      // is already visible when the visitor reaches the animation.
      const earlyTrigger = window.innerHeight * 0.72;
      return clamp((earlyTrigger - top) / (stageHeight * Math.max(0.01, scrollDistance)), 0, 1);
    };
    const tick = () => {
      const factor = 1 - Math.exp(-1 / (60 * smoothing));
      current += (target - current) * factor;
      if (Math.abs(target - current) < 0.0004) { current = target; running = false; }
      applyProgress(current);
      frame = running ? requestAnimationFrame(tick) : 0;
    };
    const onScroll = () => {
      target = readProgress();
      if (reducedMotion) { current = target; applyProgress(current); return; }
      if (!running) { running = true; frame = requestAnimationFrame(tick); }
    };
    const onResize = () => { measure(); target = readProgress(); current = target; applyProgress(current); };
    measure();
    target = readProgress();
    current = target;
    applyProgress(current);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [applyProgress, holdDistance, scrollDistance, smoothing]);

  return <div ref={rootRef} className={`scroll-expand ${className}`.trim()}><div ref={trackRef} className="scroll-expand__track"><div ref={stageRef} className="scroll-expand__stage"><div ref={frameRef} className="scroll-expand__frame"><img ref={mediaRef} className="scroll-expand__media" src={src} alt={alt} draggable="false" /><div ref={scrimRef} className="scroll-expand__scrim" />{children && <div ref={overlayRef} className="scroll-expand__overlay">{children}</div>}</div>{title && <div ref={titleRef} className="scroll-expand__title">{title}</div>}{scrollHint && <div className="scroll-expand__hint">{scrollHint}</div>}</div></div></div>;
}
