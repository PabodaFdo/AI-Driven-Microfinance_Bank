import React, { useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend);

// Map feature indices and names to human-readable names
const FEATURE_MAPPING = {
  // Index-based features
  'feature_0': 'Age',
  'feature_1': 'Income',
  'feature_2': 'Loan Amount',
  'feature_3': 'Credit Score',
  'feature_4': 'Months Employed',
  'feature_5': 'Credit Lines',
  'feature_6': 'Interest Rate',
  'feature_7': 'Loan Term',
  'feature_8': 'DTI Ratio',
  'feature_9': 'Education',
  'feature_10': 'Employment Type',
  'feature_11': 'Marital Status',
  'feature_12': 'Has Mortgage',
  'feature_13': 'Has Dependents',
  'feature_14': 'Loan Purpose',
  'feature_15': 'Has Co-Signer',
  'feature_16': 'Payment Risk Score',
  'feature_17': 'Existing Loan Count',
  'feature_18': 'Credit Utilization',
  'feature_19': 'Monthly Debt Ratio',
  'feature_20': 'Income Stability',
  // Named features (already in readable format, but normalize them)
  'PaymentRiskScore': 'Payment Risk Score',
  'CreditUtilization': 'Credit Utilization',
  'InterestRate': 'Interest Rate',
  'Feature_17': 'Existing Loan Count',
  'Feature_19': 'Monthly Debt Ratio',
};

const getFeatureName = (featureKey) => {
  if (!featureKey) return featureKey;
  // Check direct mapping first
  if (FEATURE_MAPPING[featureKey]) {
    return FEATURE_MAPPING[featureKey];
  }
  // Handle case-insensitive
  for (const [key, value] of Object.entries(FEATURE_MAPPING)) {
    if (key.toLowerCase() === featureKey.toLowerCase()) {
      return value;
    }
  }
  // If no mapping found, try to format feature_XX pattern
  if (featureKey.match(/^[Ff]eature[_\-]?(\d+)$/)) {
    return featureKey; // Keep as is if not in mapping
  }
  // For other feature names, just return as-is
  return featureKey;
};

const ShapExplanationChart = ({ shapExplanations }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!shapExplanations || !Array.isArray(shapExplanations) || shapExplanations.length === 0) {
      return;
    }

    const ctx = chartRef.current?.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart instance if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Prepare data for chart
    const labels = shapExplanations.map(item => getFeatureName(item.feature));
    const values = shapExplanations.map(item => Math.abs(item.shap_value));
    const colors = shapExplanations.map(item =>
      item.contribution === 'positive' ? '#10b981' : '#ef4444'
    );

    // Create chart
    chartInstanceRef.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Feature Importance (SHAP Value)',
            data: values,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1.5,
            borderRadius: 6,
            barThickness: 'flex',
            minBarLength: 2,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 12, weight: '500' },
              color: '#334155',
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            callbacks: {
              label: function (context) {
                const item = shapExplanations[context.dataIndex];
                const impact = item.contribution === 'positive' ? '↑ Increases Risk' : '↓ Decreases Risk';
                return `Value: ${item.shap_value.toFixed(4)} | ${impact}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              font: { size: 11 },
              color: '#64748b',
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            title: {
              display: true,
              text: 'Absolute SHAP Value',
              font: { size: 12, weight: 'bold' },
              color: '#334155',
            },
          },
          y: {
            ticks: {
              font: { size: 11 },
              color: '#334155',
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [shapExplanations]);

  if (!shapExplanations || !Array.isArray(shapExplanations) || shapExplanations.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginTop: 24,
      marginBottom: 24,
      padding: 20,
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
    }}>
      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#1e293b',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>📊</span>
        Feature Importance (SHAP Explanation)
      </h3>

      <div style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #e2e8f0',
        height: 350,
        marginBottom: 16,
      }}>
        <canvas ref={chartRef}></canvas>
      </div>

      {/* Legend explaining the colors */}
      <div style={{
        display: 'flex',
        gap: 24,
        fontSize: 13,
        marginBottom: 16,
        padding: '12px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 12,
            height: 12,
            backgroundColor: '#10b981',
            borderRadius: 2,
          }}></div>
          <span style={{ color: '#334155' }}>Positive Impact (↑ Increases Risk)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 12,
            height: 12,
            backgroundColor: '#ef4444',
            borderRadius: 2,
          }}></div>
          <span style={{ color: '#334155' }}>Negative Impact (↓ Decreases Risk)</span>
        </div>
      </div>

      {/* Feature list with values */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
      }}>
        <p style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#475569',
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          Detailed Breakdown
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shapExplanations.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                backgroundColor: 'white',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 13,
              }}>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>{getFeatureName(item.feature)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontWeight: 600,
                    color: item.contribution === 'positive' ? '#16a34a' : '#dc2626',
                  }}>
                  {item.contribution === 'positive' ? '+' : '-'}
                  {Math.abs(item.shap_value).toFixed(4)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontWeight: 500,
                    backgroundColor:
                      item.contribution === 'positive' ? '#dcfce7' : '#fee2e2',
                    color:
                      item.contribution === 'positive' ? '#16a34a' : '#dc2626',
                  }}>
                  {item.contribution === 'positive' ? 'Risk ↑' : 'Risk ↓'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShapExplanationChart;

