import { useState } from "react";
import ReportViewerTab from "./ReportViewerTab";
import ReportTemplatesTab from "./ReportTemplatesTab";
import { PageHeader } from "./PageHeader";
import { getStoredUser } from "../services/authService";
import { canManageReportTemplates } from "../utils/rbac";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("generate");
  const user = getStoredUser();
  const canManageTemplates = canManageReportTemplates(user?.role);

  return (
    <div className="reporting-page">
      <PageHeader
        title="Reports"
        subtitle="Generate analytics reports and manage reusable report templates."
      />

      <div className="reporting-tabs" role="tablist" aria-label="Reports tabs">
        <button
          className={`reporting-tab ${activeTab === "generate" ? "active" : ""}`}
          onClick={() => setActiveTab("generate")}
          type="button"
        >
          Generate Reports
        </button>
        {canManageTemplates && (
          <button
            className={`reporting-tab ${activeTab === "templates" ? "active" : ""}`}
            onClick={() => setActiveTab("templates")}
            type="button"
          >
            Report Templates
          </button>
        )}
      </div>

      {activeTab === "generate" ? <ReportViewerTab /> : canManageTemplates && <ReportTemplatesTab />}
    </div>
  );
}
