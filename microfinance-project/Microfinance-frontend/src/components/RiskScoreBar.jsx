/**
 * RiskScoreBar Component
 *
 * Reusable component to display risk score as:
 * - Numeric percentage (e.g., "45%")
 * - Visual progress bar
 *
 * Usage:
 * <RiskScoreBar riskScore={assessment.riskScore} riskLevel={assessment.riskLevel} />
 */

const RiskScoreBar = ({ riskScore, riskLevel, colorVars }) => {
  const C = colorVars || {
    success: "var(--success)",
    danger: "var(--danger)",
    border: "var(--border)",
    inkMid: "var(--text-muted)",
  };

  // Helper: Normalize risk score to 0-100 percentage
  const normalizeRiskScore = (score) => {
    if (score === null || score === undefined || Number.isNaN(score)) return 0;
    let normalized = Number(score);
    // If it's a decimal between 0 and 1, multiply by 100
    if (normalized > 0 && normalized <= 1) {
      normalized = normalized * 100;
    }
    // Clamp between 0 and 100
    return Math.min(100, Math.max(0, Math.round(normalized)));
  };

  // Helper: Get color based on risk level
  const getRiskColor = (level) => {
    if (level === "LOW") return C.success;
    if (level === "MEDIUM") return colorVars?.warn || "var(--warning)";
    if (level === "HIGH") return C.danger;
    return C.danger;
  };

  const normalizedScore = normalizeRiskScore(riskScore);
  const displayColor = getRiskColor(riskLevel);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Numeric Score Display */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
      }}>
        <span style={{
          fontSize: 28,
          fontWeight: 800,
          color: displayColor,
        }}>
          {normalizedScore}%
        </span>
        <span style={{
          fontSize: 14,
          color: C.inkMid,
          fontWeight: 500,
        }}>
          Risk Score
        </span>
      </div>

      {/* Progress Bar with Labels */}
      <div>
        {/* Bar Container with Labels */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.success,
            minWidth: 70,
          }}>
            LOW RISK
          </span>

          {/* Progress Bar */}
          <div style={{
            flex: 1,
            background: C.border,
            height: 10,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: `inset 0 1px 3px rgba(0,0,0,0.08)`,
          }}>
            <div style={{
              background: displayColor,
              height: '100%',
              width: `${normalizedScore}%`,
              borderRadius: 10,
              transition: 'width 0.6s ease-out',
              boxShadow: `0 2px 8px ${displayColor}40`,
            }}></div>
          </div>

          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.danger,
            minWidth: 70,
            textAlign: 'right',
          }}>
            HIGH RISK
          </span>
        </div>

        {/* Scale Reference */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: colorVars?.inkLight || "var(--text-light)",
          fontWeight: 500,
        }}>
          <span style={{ marginLeft: 70 }}>0</span>
          <span>50</span>
          <span style={{ marginRight: 70 }}>100</span>
        </div>
      </div>
    </div>
  );
};

export default RiskScoreBar;
