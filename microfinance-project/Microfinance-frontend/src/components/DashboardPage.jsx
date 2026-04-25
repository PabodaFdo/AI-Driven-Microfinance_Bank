import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";
import { RefreshCw, Download, FileBarChart2, AlertTriangle, Wallet, CheckCircle } from "lucide-react";
import { PageHeader } from './PageHeader';
import { reportService } from "../services/reportService";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const numberFmt = (value) => Number(value || 0).toLocaleString();
const moneyFmt = (value) => `LKR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const analytics = await reportService.getDashboardAnalytics();
      setData(analytics);
    } catch (err) {
      setError(err?.message || "Failed to load dashboard analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const statusChartData = useMemo(() => {
    const breakdown = data?.applicationStatusBreakdown || {};
    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);

    return {
      labels,
      datasets: [
        {
          label: "Applications",
          data: values,
          backgroundColor: "rgba(19, 88, 255, 0.65)",
          borderColor: "rgba(19, 88, 255, 1)",
          borderWidth: 1
        }
      ]
    };
  }, [data]);

  const repaymentPieData = useMemo(() => {
    const breakdown = data?.repaymentStatusBreakdown || {};
    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);

    return {
      labels,
      datasets: [
        {
          label: "Repayment Status",
          data: values,
          backgroundColor: [
            "rgba(19, 88, 255, 0.75)",
            "rgba(2, 195, 154, 0.75)",
            "rgba(217, 119, 6, 0.75)",
            "rgba(220, 38, 38, 0.75)",
            "rgba(124, 58, 237, 0.75)"
          ]
        }
      ]
    };
  }, [data]);

  const trendLineData = useMemo(() => {
    return {
      labels: data?.monthlyApplicationTrendLabels || [],
      datasets: [
        {
          label: "Monthly Applications",
          data: data?.monthlyApplicationTrendValues || [],
          borderColor: "rgba(19, 88, 255, 1)",
          backgroundColor: "rgba(19, 88, 255, 0.15)",
          tension: 0.3,
          fill: true
        }
      ]
    };
  }, [data]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom"
      }
    }
  };

  return (
    <div className="dashboard-page reporting-page">
      <PageHeader
        title="Dashboard Analytics"
        subtitle="Live KPIs and trends from microfinance applications, risk, and repayment data."
        actions={
          <>
            <button className="reporting-btn reporting-btn-secondary" onClick={loadDashboard} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button className="reporting-btn" onClick={() => window.print()}>
              <Download size={16} />
              Export / Print
            </button>
          </>
        }
      />

      {error && <div className="reporting-alert">{error}</div>}

      <div className="reporting-grid reporting-grid-kpi">
        <div className="reporting-kpi-card">
          <div className="reporting-kpi-icon"><FileBarChart2 size={18} /></div>
          <div className="reporting-kpi-title">Total Applications</div>
          <div className="reporting-kpi-value">{numberFmt(data?.totalApplications)}</div>
        </div>
        <div className="reporting-kpi-card">
          <div className="reporting-kpi-icon"><CheckCircle size={18} /></div>
          <div className="reporting-kpi-title">Approved Applications</div>
          <div className="reporting-kpi-value">{numberFmt(data?.approvedApplications)}</div>
        </div>
        <div className="reporting-kpi-card">
          <div className="reporting-kpi-icon"><AlertTriangle size={18} /></div>
          <div className="reporting-kpi-title">Overdue Installments</div>
          <div className="reporting-kpi-value">{numberFmt(data?.overdueInstallmentsCount)}</div>
        </div>
        <div className="reporting-kpi-card">
          <div className="reporting-kpi-icon"><Wallet size={18} /></div>
          <div className="reporting-kpi-title">Total Default Amount</div>
          <div className="reporting-kpi-value">{moneyFmt(data?.totalDefaultAmount)}</div>
        </div>
      </div>

      {loading ? (
        <div className="reporting-panel reporting-empty">Loading dashboard analytics...</div>
      ) : (
        <>
          <div className="reporting-grid reporting-grid-two">
            <div className="reporting-panel">
              <h3>Application Status Breakdown</h3>
              <div className="reporting-chart-wrap">
                <Bar data={statusChartData} options={commonOptions} />
              </div>
            </div>
            <div className="reporting-panel">
              <h3>Repayment Status Distribution</h3>
              <div className="reporting-chart-wrap">
                <Pie data={repaymentPieData} options={{ ...commonOptions, scales: undefined }} />
              </div>
            </div>
          </div>

          <div className="reporting-panel">
            <h3>Monthly Application Trend</h3>
            <div className="reporting-chart-wrap reporting-chart-lg">
              <Line data={trendLineData} options={commonOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
