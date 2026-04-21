import { useState, useEffect, useRef } from 'react';

// Predefined gradients for consistent styling - now theme-aware
const GRADIENTS = {
  blue: {
    gradient: "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)",
    lineGradient: "linear-gradient(90deg, var(--primary), var(--primary-light))"
  },
  purple: {
    gradient: "linear-gradient(135deg, #9333ea 0%, #6d28d9 100%)",
    lineGradient: "linear-gradient(90deg, #9333ea, #c084fc)"
  },
  green: {
    gradient: "linear-gradient(135deg, var(--success) 0%, var(--success-hover) 100%)",
    lineGradient: "linear-gradient(90deg, var(--success), var(--success-border))"
  },
  red: {
    gradient: "linear-gradient(135deg, var(--danger) 0%, var(--danger-hover) 100%)",
    lineGradient: "linear-gradient(90deg, var(--danger), var(--danger-border))"
  },
  amber: {
    gradient: "linear-gradient(135deg, var(--warning) 0%, var(--warning-hover) 100%)",
    lineGradient: "linear-gradient(90deg, var(--warning), var(--warning-border))"
  },
  orange: {
    gradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
    lineGradient: "linear-gradient(90deg, #ea580c, #fb923c)"
  },
  teal: {
    gradient: "linear-gradient(135deg, var(--info) 0%, var(--info-hover) 100%)",
    lineGradient: "linear-gradient(90deg, var(--info), var(--info-border))"
  },
  mint: {
    gradient: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
    lineGradient: "linear-gradient(90deg, var(--accent), var(--success-border))"
  },
  yellow: {
    gradient: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
    lineGradient: "linear-gradient(90deg, #eab308, #facc15)"
  },
  neutral: {
    gradient: "linear-gradient(135deg, var(--text-muted) 0%, var(--text-light) 100%)",
    lineGradient: "linear-gradient(90deg, var(--text-muted), var(--border-strong))"
  }
};

// Count-up hook for smooth number animations
function useCountUp(target, duration = 950, delay = 0) {
  const [count, setCount] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const timeout = setTimeout(() => {
      let start = null;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const easing = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
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
  }, [target, duration, delay]);

  return count;
}

// Enhanced StatCard component with gradient design and flexible value types
function StatCard({
  title,
  value,
  displayValue,
  subtitle,
  gradient = "blue",
  lineGradient,
  icon,
  onClick,
  clickable = false,
  isActive = false,
  index = 0,
  animate = true,
  valueType = "number"
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  // Get gradient configuration
  const gradientConfig = typeof gradient === 'string' ? GRADIENTS[gradient] || GRADIENTS.blue : null;
  const finalGradient = gradientConfig?.gradient || gradient;
  const finalLineGradient = lineGradient || gradientConfig?.lineGradient || finalGradient;

  // Animate numeric values only when animate is true and valueType is numeric
  const shouldAnimate = animate && (valueType === "number" || valueType === "currency" || valueType === "percentage");
  const animatedValue = useCountUp(shouldAnimate ? (value || 0) : 0, 950, index * 90 + 180);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 80 + 60);
    return () => clearTimeout(timer);
  }, [index]);

  // Format the display value based on type
  const getFormattedValue = () => {
    if (displayValue !== undefined) {
      return displayValue;
    }

    if (!shouldAnimate) {
      return value;
    }

    switch (valueType) {
      case "currency":
        return new Intl.NumberFormat('en-LK', {
          style: 'currency',
          currency: 'LKR',
          minimumFractionDigits: animatedValue % 1 === 0 ? 0 : 2,
        }).format(animatedValue);
      case "percentage":
        return `${animatedValue}%`;
      case "number":
        return animatedValue.toLocaleString();
      default:
        return value;
    }
  };

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        background: 'var(--surface)',
        border: isActive
          ? '1.5px solid rgba(255,255,255,0)'
          : '1px solid rgba(0,0,0,0.06)',
        outline: isActive ? `3px solid ${finalGradient.match(/#[0-9a-f]{6}/i)?.[0] ?? 'var(--primary)'}` : 'none',
        outlineOffset: '2px',
        boxShadow: isHovered
          ? '0 12px 28px rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.06)'
          : '0 3px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)',
        transform: visible
          ? isHovered
            ? 'translateY(-3px) scale(1.01)'
            : 'translateY(0) scale(1)'
          : 'translateY(12px) scale(0.98)',
        opacity: visible ? 1 : 0,
        transition: `
          opacity 0.38s ease ${index * 0.06}s,
          transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) ${index * 0.06}s,
          box-shadow 0.2s ease,
          outline 0.2s ease
        `,
        flex: '1 1 0',
        minWidth: 0,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={clickable ? onClick : undefined}
    >
      {/* Gradient Top Section */}
      <div
        style={{
          background: finalGradient,
          padding: '14px 14px 12px',
          minHeight: 85,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Circles */}
        <div style={{
          position: 'absolute',
          right: -16,
          top: -16,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.12)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          right: 14,
          bottom: -18,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none',
        }} />

        {/* Icon Pill + Live Dot */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          {icon && (
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'transform 0.24s cubic-bezier(0.34, 1.4, 0.64, 1)',
              transform: isHovered ? 'scale(1.08) rotate(-5deg)' : 'scale(1) rotate(0deg)',
              fontSize: 16,
            }}>
              {icon}
            </div>
          )}
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.6)',
            marginTop: 3,
          }} />
        </div>

        {/* Big Number/Text */}
        <div style={{
          fontSize: 28,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-1.2px',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        }}>
          {getFormattedValue()}
        </div>
      </div>

      {/* White Label Section */}
      <div style={{
        padding: '10px 14px 0',
        background: 'var(--surface)'
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text)',
          lineHeight: 1.3,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 10.5,
          color: 'var(--text-muted)',
          marginTop: 2,
          fontWeight: 400,
          letterSpacing: '0.01em',
        }}>
          {subtitle}
        </div>
      </div>

      {/* Gradient Accent Line */}
      <div style={{
        height: isHovered ? 4 : 3,
        background: finalLineGradient,
        borderRadius: '0 0 16px 16px',
        marginTop: 10,
        opacity: isHovered ? 1 : 0.85,
        transition: 'height 0.2s ease, opacity 0.2s ease',
      }} />
    </div>
  );
}

export { StatCard, useCountUp };