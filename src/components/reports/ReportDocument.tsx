import { ReportType, ReportData, SectionVisibility } from "@/hooks/useReports";

interface ReportDocumentProps {
  reportType: ReportType;
  title: string;
  reportData: ReportData;
  visibility: SectionVisibility;
}

export function ReportDocument({ reportType, title, reportData, visibility }: ReportDocumentProps) {
  const isMonthly = reportType === "monthly_security";

  return (
    <div className="text-foreground">
      {/* Header */}
      <div className="report-header text-center mb-8 pb-6 border-b-2 border-border">
        <h1 className="report-title text-2xl font-bold mb-2">{title}</h1>
        <p className="report-subtitle text-muted-foreground text-sm">
          {reportData.organizationName} | {reportData.reportPeriod}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Executive Summary */}
      {visibility.executiveSummary && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-border">
            Executive Summary
          </h2>
          <p className="text-sm leading-relaxed">
            This report provides a comprehensive overview of the security posture for{" "}
            <strong>{reportData.organizationName}</strong> during the reporting period. 
            The organization maintains <strong>{reportData.totalEndpoints}</strong> endpoints 
            with a security score of <strong>{reportData.securityScore}%</strong>.
            {reportData.activeThreats && reportData.activeThreats > 0 
              ? ` There are currently ${reportData.activeThreats} active threats requiring attention.`
              : " All detected threats have been successfully addressed."
            }
          </p>
        </div>
      )}

      {/* Security Score */}
      {visibility.securityScore && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-border">
            Security Score
          </h2>
          <div className="metric-grid grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="metric-card bg-muted p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-primary">
                {reportData.securityScore}%
              </div>
              <div className="metric-label text-xs text-muted-foreground uppercase">
                Overall Score
              </div>
            </div>
            <div className="metric-card bg-muted p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-primary">
                {reportData.totalEndpoints}
              </div>
              <div className="metric-label text-xs text-muted-foreground uppercase">
                Total Endpoints
              </div>
            </div>
            <div className="metric-card bg-muted p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-green-600">
                {reportData.protectedEndpoints}
              </div>
              <div className="metric-label text-xs text-muted-foreground uppercase">
                Protected
              </div>
            </div>
            <div className="metric-card bg-muted p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-primary">
                {reportData.compliancePercentage}%
              </div>
              <div className="metric-label text-xs text-muted-foreground uppercase">
                Compliant
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Controls (Insurance Report) */}
      {visibility.securityControls && reportData.securityControls && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-border">
            Security Controls
          </h2>
          <table className="table w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left text-sm font-semibold">Control</th>
                <th className="p-3 text-left text-sm font-semibold">Status</th>
                <th className="p-3 text-left text-sm font-semibold">Coverage</th>
                <th className="p-3 text-left text-sm font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {reportData.securityControls.map((control, idx) => (
                <tr key={idx} className="border-b border-border">
                  <td className="p-3 text-sm font-medium">{control.name}</td>
                  <td className="p-3 text-sm">
                    <span className={
                      control.status === "implemented" ? "text-green-600 font-medium" :
                      control.status === "partial" ? "text-yellow-600 font-medium" :
                      "text-red-600 font-medium"
                    }>
                      {control.status === "implemented" ? "✓ Implemented" :
                       control.status === "partial" ? "◐ Partial" :
                       "✗ Not Implemented"}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="progress-bar h-2 w-16 bg-muted rounded overflow-hidden">
                        <div 
                          className="progress-fill h-full bg-primary" 
                          style={{ width: `${control.coverage}%` }}
                        />
                      </div>
                      <span>{control.coverage}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{control.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Coverage Summary (Insurance Report) */}
      {visibility.coverageSummary && reportData.securityControls && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-border">
            Coverage Summary
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {reportData.securityControls.filter(c => c.status === "implemented").length}
              </div>
              <div className="text-sm text-green-700 dark:text-green-400">Fully Implemented</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {reportData.securityControls.filter(c => c.status === "partial").length}
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">Partially Implemented</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {reportData.securityControls.filter(c => c.status === "not_implemented").length}
              </div>
              <div className="text-sm text-red-700 dark:text-red-400">Not Implemented</div>
            </div>
          </div>
        </div>
      )}

      {/* Threat Summary */}
      {visibility.threatSummary && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-border">
            Threat Summary
          </h2>
          <div className="metric-grid grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="metric-card bg-muted p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold">{reportData.totalThreats}</div>
              <div className="metric-label text-xs text-muted-foreground uppercase">Total Detected</div>
            </div>
            <div className="metric-card bg-muted p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-green-600">{reportData.resolvedThreats}</div>
              <div className="metric-label text-xs text-muted-foreground uppercase">Resolved</div>
            </div>
            <div className="metric-card bg-muted p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-red-600">{reportData.activeThreats}</div>
              <div className="metric-label text-xs text-muted-foreground uppercase">Active</div>
            </div>
          </div>
        </div>
      )}

      {/* Threat Details (Monthly Report) */}
      {isMonthly && visibility.threatDetails && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-border">
            Threat Breakdown by Severity
          </h2>
          <table className="table w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left text-sm font-semibold">Severity</th>
                <th className="p-3 text-left text-sm font-semibold">Count</th>
                <th className="p-3 text-left text-sm font-semibold">Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-3 text-sm font-medium text-red-600">Critical</td>
                <td className="p-3 text-sm">{reportData.criticalThreats}</td>
                <td className="p-3 text-sm">{reportData.totalThreats ? Math.round((reportData.criticalThreats || 0) / reportData.totalThreats * 100) : 0}%</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3 text-sm font-medium text-orange-600">High</td>
                <td className="p-3 text-sm">{reportData.highThreats}</td>
                <td className="p-3 text-sm">{reportData.totalThreats ? Math.round((reportData.highThreats || 0) / reportData.totalThreats * 100) : 0}%</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3 text-sm font-medium text-yellow-600">Medium</td>
                <td className="p-3 text-sm">{reportData.mediumThreats}</td>
                <td className="p-3 text-sm">{reportData.totalThreats ? Math.round((reportData.mediumThreats || 0) / reportData.totalThreats * 100) : 0}%</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3 text-sm font-medium text-green-600">Low</td>
                <td className="p-3 text-sm">{reportData.lowThreats}</td>
                <td className="p-3 text-sm">{reportData.totalThreats ? Math.round((reportData.lowThreats || 0) / reportData.totalThreats * 100) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Compliance Overview */}
      {visibility.complianceOverview && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-border">
            Compliance Overview
          </h2>
          <table className="table w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left text-sm font-semibold">Metric</th>
                <th className="p-3 text-left text-sm font-semibold">Compliance</th>
                <th className="p-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-3 text-sm">Real-time Protection</td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-muted rounded overflow-hidden">
                      <div className="progress-fill h-full bg-primary" style={{ width: `${reportData.realtimeProtection}%` }} />
                    </div>
                    <span>{reportData.realtimeProtection}%</span>
                  </div>
                </td>
                <td className="p-3 text-sm">
                  <span className={(reportData.realtimeProtection || 0) >= 90 ? "text-green-600" : (reportData.realtimeProtection || 0) >= 70 ? "text-yellow-600" : "text-red-600"}>
                    {(reportData.realtimeProtection || 0) >= 90 ? "Good" : (reportData.realtimeProtection || 0) >= 70 ? "Needs Attention" : "Critical"}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3 text-sm">Antivirus Enabled</td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-muted rounded overflow-hidden">
                      <div className="progress-fill h-full bg-primary" style={{ width: `${reportData.antivirusEnabled}%` }} />
                    </div>
                    <span>{reportData.antivirusEnabled}%</span>
                  </div>
                </td>
                <td className="p-3 text-sm">
                  <span className={(reportData.antivirusEnabled || 0) >= 90 ? "text-green-600" : (reportData.antivirusEnabled || 0) >= 70 ? "text-yellow-600" : "text-red-600"}>
                    {(reportData.antivirusEnabled || 0) >= 90 ? "Good" : (reportData.antivirusEnabled || 0) >= 70 ? "Needs Attention" : "Critical"}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3 text-sm">Signature Currency</td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-muted rounded overflow-hidden">
                      <div className="progress-fill h-full bg-primary" style={{ width: `${reportData.signatureCompliance}%` }} />
                    </div>
                    <span>{reportData.signatureCompliance}%</span>
                  </div>
                </td>
                <td className="p-3 text-sm">
                  <span className={(reportData.signatureCompliance || 0) >= 90 ? "text-green-600" : (reportData.signatureCompliance || 0) >= 70 ? "text-yellow-600" : "text-red-600"}>
                    {(reportData.signatureCompliance || 0) >= 90 ? "Good" : (reportData.signatureCompliance || 0) >= 70 ? "Needs Attention" : "Critical"}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3 text-sm">Behavior Monitoring</td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-muted rounded overflow-hidden">
                      <div className="progress-fill h-full bg-primary" style={{ width: `${reportData.behaviorMonitoring}%` }} />
                    </div>
                    <span>{reportData.behaviorMonitoring}%</span>
                  </div>
                </td>
                <td className="p-3 text-sm">
                  <span className={(reportData.behaviorMonitoring || 0) >= 90 ? "text-green-600" : (reportData.behaviorMonitoring || 0) >= 70 ? "text-yellow-600" : "text-red-600"}>
                    {(reportData.behaviorMonitoring || 0) >= 90 ? "Good" : (reportData.behaviorMonitoring || 0) >= 70 ? "Needs Attention" : "Critical"}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3 text-sm">Policy Assigned</td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-muted rounded overflow-hidden">
                      <div className="progress-fill h-full bg-primary" style={{ width: `${reportData.policyAssigned}%` }} />
                    </div>
                    <span>{reportData.policyAssigned}%</span>
                  </div>
                </td>
                <td className="p-3 text-sm">
                  <span className={(reportData.policyAssigned || 0) >= 90 ? "text-green-600" : (reportData.policyAssigned || 0) >= 70 ? "text-yellow-600" : "text-red-600"}>
                    {(reportData.policyAssigned || 0) >= 90 ? "Good" : (reportData.policyAssigned || 0) >= 70 ? "Needs Attention" : "Critical"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendations */}
      {visibility.recommendations && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-border">
            {isMonthly ? "Recommendations" : "Improvement Areas"}
          </h2>
          <ul className="space-y-2 text-sm">
            {(reportData.realtimeProtection || 0) < 100 && (
              <li className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                Enable real-time protection on {100 - (reportData.realtimeProtection || 0)}% of endpoints to ensure continuous threat monitoring.
              </li>
            )}
            {(reportData.signatureCompliance || 0) < 100 && (
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                Update virus definitions on endpoints with outdated signatures (currently {100 - (reportData.signatureCompliance || 0)}% non-compliant).
              </li>
            )}
            {(reportData.policyAssigned || 0) < 100 && (
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                Assign security policies to unmanaged endpoints ({100 - (reportData.policyAssigned || 0)}% without policy).
              </li>
            )}
            {(reportData.activeThreats || 0) > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                Review and remediate {reportData.activeThreats} active threats immediately.
              </li>
            )}
            {(reportData.realtimeProtection || 0) >= 100 && 
             (reportData.signatureCompliance || 0) >= 100 && 
             (reportData.policyAssigned || 0) >= 100 && 
             (reportData.activeThreats || 0) === 0 && (
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Excellent security posture! Continue monitoring and maintaining current practices.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        <p>This report was generated by Peritus Security Platform</p>
        <p>Confidential - For internal use only</p>
      </div>
    </div>
  );
}
