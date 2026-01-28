import { ReportType, ReportData, SectionVisibility } from "@/hooks/useReports";

interface ReportDocumentProps {
  reportType: ReportType;
  title: string;
  reportData: ReportData;
  visibility: SectionVisibility;
}

export function ReportDocument({ reportType, title, reportData, visibility }: ReportDocumentProps) {
  const isMonthly = reportType === "monthly_security";

  // Use explicit colors for print/PDF - these will show on white background
  return (
    <div className="text-gray-900">
      {/* Header */}
      <div className="report-header text-center mb-8 pb-6 border-b-2 border-gray-200">
        <h1 className="report-title text-2xl font-bold mb-2 text-gray-900">{title}</h1>
        <p className="report-subtitle text-gray-600 text-sm">
          {reportData.organizationName} | {reportData.reportPeriod}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Executive Summary */}
      {visibility.executiveSummary && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-900">
            Executive Summary
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">
            This report provides a comprehensive overview of the security posture for{" "}
            <strong className="text-gray-900">{reportData.organizationName}</strong> during the reporting period. 
            The organization maintains <strong className="text-gray-900">{reportData.totalEndpoints}</strong> endpoints 
            with a security score of <strong className="text-gray-900">{reportData.securityScore}%</strong>.
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
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-900">
            Security Score
          </h2>
          <div className="metric-grid grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="metric-card bg-gray-100 p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-blue-600">
                {reportData.securityScore}%
              </div>
              <div className="metric-label text-xs text-gray-500 uppercase">
                Overall Score
              </div>
            </div>
            <div className="metric-card bg-gray-100 p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-blue-600">
                {reportData.totalEndpoints}
              </div>
              <div className="metric-label text-xs text-gray-500 uppercase">
                Total Endpoints
              </div>
            </div>
            <div className="metric-card bg-gray-100 p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-green-600">
                {reportData.protectedEndpoints}
              </div>
              <div className="metric-label text-xs text-gray-500 uppercase">
                Protected
              </div>
            </div>
            <div className="metric-card bg-gray-100 p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-blue-600">
                {reportData.compliancePercentage}%
              </div>
              <div className="metric-label text-xs text-gray-500 uppercase">
                Compliant
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Controls (Insurance Report) */}
      {visibility.securityControls && reportData.securityControls && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-900">
            Security Controls
          </h2>
          <table className="table w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Control</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Coverage</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              {reportData.securityControls.map((control, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-3 text-sm font-medium text-gray-900">{control.name}</td>
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
                  <td className="p-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="progress-bar h-2 w-16 bg-gray-200 rounded overflow-hidden">
                        <div 
                          className="progress-fill h-full bg-blue-600" 
                          style={{ width: `${control.coverage}%` }}
                        />
                      </div>
                      <span>{control.coverage}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-600">{control.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Coverage Summary (Insurance Report) */}
      {visibility.coverageSummary && reportData.securityControls && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-900">
            Coverage Summary
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {reportData.securityControls.filter(c => c.status === "implemented").length}
              </div>
              <div className="text-sm text-green-700">Fully Implemented</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {reportData.securityControls.filter(c => c.status === "partial").length}
              </div>
              <div className="text-sm text-yellow-700">Partially Implemented</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {reportData.securityControls.filter(c => c.status === "not_implemented").length}
              </div>
              <div className="text-sm text-red-700">Not Implemented</div>
            </div>
          </div>
        </div>
      )}

      {/* Threat Summary */}
      {visibility.threatSummary && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-900">
            Threat Summary
          </h2>
          <div className="metric-grid grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="metric-card bg-gray-100 p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-gray-900">{reportData.totalThreats}</div>
              <div className="metric-label text-xs text-gray-500 uppercase">Total Detected</div>
            </div>
            <div className="metric-card bg-gray-100 p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-green-600">{reportData.resolvedThreats}</div>
              <div className="metric-label text-xs text-gray-500 uppercase">Resolved</div>
            </div>
            <div className="metric-card bg-gray-100 p-4 rounded-lg">
              <div className="metric-value text-3xl font-bold text-red-600">{reportData.activeThreats}</div>
              <div className="metric-label text-xs text-gray-500 uppercase">Active</div>
            </div>
          </div>
        </div>
      )}

      {/* Threat Details (Monthly Report) */}
      {isMonthly && visibility.threatDetails && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-900">
            Threat Breakdown by Severity
          </h2>
          <table className="table w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Severity</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Count</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm font-medium text-red-600">Critical</td>
                <td className="p-3 text-sm text-gray-900">{reportData.criticalThreats}</td>
                <td className="p-3 text-sm text-gray-900">{reportData.totalThreats ? Math.round((reportData.criticalThreats || 0) / reportData.totalThreats * 100) : 0}%</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm font-medium text-orange-600">High</td>
                <td className="p-3 text-sm text-gray-900">{reportData.highThreats}</td>
                <td className="p-3 text-sm text-gray-900">{reportData.totalThreats ? Math.round((reportData.highThreats || 0) / reportData.totalThreats * 100) : 0}%</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm font-medium text-yellow-600">Medium</td>
                <td className="p-3 text-sm text-gray-900">{reportData.mediumThreats}</td>
                <td className="p-3 text-sm text-gray-900">{reportData.totalThreats ? Math.round((reportData.mediumThreats || 0) / reportData.totalThreats * 100) : 0}%</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm font-medium text-green-600">Low</td>
                <td className="p-3 text-sm text-gray-900">{reportData.lowThreats}</td>
                <td className="p-3 text-sm text-gray-900">{reportData.totalThreats ? Math.round((reportData.lowThreats || 0) / reportData.totalThreats * 100) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Compliance Overview */}
      {visibility.complianceOverview && (
        <div className="section mb-8">
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-900">
            Compliance Overview
          </h2>
          <table className="table w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Metric</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Compliance</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm text-gray-900">Real-time Protection</td>
                <td className="p-3 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-gray-200 rounded overflow-hidden">
                      <div className="progress-fill h-full bg-blue-600" style={{ width: `${reportData.realtimeProtection}%` }} />
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
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm text-gray-900">Antivirus Enabled</td>
                <td className="p-3 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-gray-200 rounded overflow-hidden">
                      <div className="progress-fill h-full bg-blue-600" style={{ width: `${reportData.antivirusEnabled}%` }} />
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
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm text-gray-900">Signature Currency</td>
                <td className="p-3 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-gray-200 rounded overflow-hidden">
                      <div className="progress-fill h-full bg-blue-600" style={{ width: `${reportData.signatureCompliance}%` }} />
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
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm text-gray-900">Behavior Monitoring</td>
                <td className="p-3 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-gray-200 rounded overflow-hidden">
                      <div className="progress-fill h-full bg-blue-600" style={{ width: `${reportData.behaviorMonitoring}%` }} />
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
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm text-gray-900">Policy Assigned</td>
                <td className="p-3 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-2 w-24 bg-gray-200 rounded overflow-hidden">
                      <div className="progress-fill h-full bg-blue-600" style={{ width: `${reportData.policyAssigned}%` }} />
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
          <h2 className="section-title text-lg font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-900">
            {isMonthly ? "Recommendations" : "Improvement Areas"}
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
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
      <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>This report was generated by Peritus Security Platform</p>
        <p>Confidential - For internal use only</p>
      </div>
    </div>
  );
}
