import { memo, useEffect, useMemo, useRef, useState } from "react";
import "./GradualBlur.css";

const curves = {
  linear: value => value,
  bezier: value => value * value * (3 - 2 * value),
  "ease-out": value => 1 - Math.pow(1 - value, 2),
};

function GradualBlur({ position = "bottom", height = "7rem", strength = 2, divCount = 7, exponential = true, curve = "bezier", opacity = 0.95, animated = "scroll", duration = "0.5s", target = "parent", className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(animated !== "scroll");
  const curveFn = curves[curve] || curves.bezier;
  const layers = useMemo(() => Array.from({ length: divCount }, (_, index) => {
    const progress = curveFn((index + 1) / divCount);
    const blur = exponential ? Math.pow(2, progress * 3.2) * 0.04 * strength : 0.04 * (index + 1) * strength;
    const start = Math.round((index / divCount) * 1000) / 10;
    const end = Math.round(((index + 1) / divCount) * 1000) / 10;
    const next = Math.min(100, Math.round(((index + 2) / divCount) * 1000) / 10);
    const direction = position === "top" ? "to top" : position === "left" ? "to left" : position === "right" ? "to right" : "to bottom";
    return { blur, mask: `linear-gradient(${direction}, transparent ${start}%, black ${end}%, black ${next}%, transparent ${Math.min(100, next + 12)}%)` };
  }), [curveFn, divCount, exponential, position, strength]);

  useEffect(() => {
    if (animated !== "scroll" || !ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.08 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animated]);

  const isVertical = position === "top" || position === "bottom";
  return <div ref={ref} className={`gradual-blur ${target === "page" ? "gradual-blur-page" : ""} ${className}`} style={{ [isVertical ? "height" : "width"]: height, [position]: 0, opacity: visible ? opacity : 0, transition: `opacity ${duration} ease-out` }} aria-hidden="true"><div className="gradual-blur-inner">{layers.map((layer, index) => <div key={index} style={{ maskImage: layer.mask, WebkitMaskImage: layer.mask, backdropFilter: `blur(${layer.blur.toFixed(3)}rem)`, WebkitBackdropFilter: `blur(${layer.blur.toFixed(3)}rem)` }} />)}</div></div>;
}

export default memo(GradualBlur);
