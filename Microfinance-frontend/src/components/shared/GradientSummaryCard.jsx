import { useEffect, useRef, useState } from "react";

function useCountUp(target, duration = 950, delay = 0, animate = true) {
  const [count, setCount] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!animate) {
      setCount(target);
      return;
    }
    if (typeof target !== "number" || Number.isNaN(target)) {
      setCount(0);
      return;
    }
    if (target === 0) {
      setCount(0);
      return;
    }

    const timeout = setTimeout(() => {
      let start = null;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const easing = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easing * target));
        if (progress < 1) {
          raf.current = requestAnimationFrame(step);
        } else {
          setCount(target);
        }
      };
      raf.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration, delay, animate]);

  return count;
}

function formatValue({ value, displayValue, format = "number", currency = "LKR", animatedValue }) {
  if (displayValue !== undefined && displayValue !== null) return displayValue;

  if (format === "currency") {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(animatedValue ?? value ?? 0);
  }

  if (format === "percent") {
    return `${animatedValue ?? value ?? 0}%`;
  }

  if (format === "text") {
    return value ?? "";
  }

  return (animatedValue ?? value ?? 0).toLocaleString();
}

export default function GradientSummaryCard({
  title,
  value = 0,
  displayValue,
  subtitle,
  gradient,
  lineGradient,
  icon,
  onClick,
  clickable = false,
  isActive = false,
  index = 0,
  format = "number",
  currency = "LKR",
  animate = true,
  valueSize = 28,
  minHeight = 85,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  const shouldAnimate = animate && format !== "text" && displayValue == null && typeof value === "number";
  const animated = useCountUp(Number(value || 0), 950, index * 90 + 180, shouldAnimate);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 80 + 60);
    return () => clearTimeout(timer);
  }, [index]);

  const shownValue = formatValue({
    value,
    displayValue,
    format,
    currency,
    animatedValue: shouldAnimate ? animated : value,
  });

  const outlineColor = gradient?.match(/#[0-9a-f]{6}/i)?.[0] ?? "var(--primary)";

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        cursor: clickable ? "pointer" : "default",
        background: "var(--surface)",
        border: isActive ? "1.5px solid rgba(255,255,255,0)" : "1px solid rgba(0,0,0,0.06)",
        outline: isActive ? `3px solid ${outlineColor}` : "none",
        outlineOffset: "2px",
        boxShadow: isHovered
          ? "0 12px 28px rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.06)"
          : "0 3px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)",
        transform: visible
          ? isHovered
            ? "translateY(-3px) scale(1.01)"
            : "translateY(0) scale(1)"
          : "translateY(12px) scale(0.98)",
        opacity: visible ? 1 : 0,
        transition: `
          opacity 0.38s ease ${index * 0.06}s,
          transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) ${index * 0.06}s,
          box-shadow 0.2s ease,
          outline 0.2s ease
        `,
        minWidth: 0,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={clickable ? onClick : undefined}
    >
      {/* COLORED TOP SECTION */}
      <div
        style={{
          background: gradient,
          padding: "14px 14px 12px",
          minHeight,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -16,
            top: -16,
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 14,
            bottom: -18,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "rgba(255,255,255,0.22)",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "transform 0.24s cubic-bezier(0.34, 1.4, 0.64, 1)",
              transform: isHovered ? "scale(1.08) rotate(-5deg)" : "scale(1) rotate(0deg)",
              fontSize: 16,
              color: "#fff",
            }}
          >
            {icon}
          </div>

          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.6)",
              marginTop: 3,
            }}
          />
        </div>

        <div
          style={{
            fontSize: valueSize,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-1.2px",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 2px 6px rgba(0,0,0,0.15)",
            wordBreak: "break-word",
          }}
        >
          {shownValue}
        </div>
      </div>

      {/* THEME-AWARE LOWER SECTION */}
      <div
        style={{
          padding: "10px 14px 0",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "var(--text-muted)",
            marginTop: 2,
            fontWeight: 400,
            letterSpacing: "0.01em",
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* COLORED BOTTOM ACCENT LINE */}
      <div
        style={{
          height: isHovered ? 4 : 3,
          background: lineGradient,
          borderRadius: "0 0 16px 16px",
          marginTop: 10,
          opacity: isHovered ? 1 : 0.85,
          transition: "height 0.2s ease, opacity 0.2s ease",
        }}
      />
    </div>
  );
}