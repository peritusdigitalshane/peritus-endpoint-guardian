import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { SecurityReport } from "@/hooks/useReports";
import { ReportDocument } from "./ReportDocument";
import { toast } from "@/hooks/use-toast";

interface ReportPreviewProps {
  report: SecurityReport;
  onClose: () => void;
}

export function ReportPreview({ report, onClose }: ReportPreviewProps) {
  const handleExportPdf = () => {
    const printContent = document.getElementById("report-preview-content");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Please allow popups to export PDF", variant: "destructive" });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${report.report_title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; }
            .report-header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e5e5; }
            .report-title { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
            .report-subtitle { color: #666; font-size: 14px; }
            .section { margin-bottom: 32px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5; }
            .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
            .metric-card { background: #f8f8f8; padding: 16px; border-radius: 8px; }
            .metric-value { font-size: 32px; font-weight: bold; color: #0066cc; }
            .metric-label { color: #666; font-size: 12px; text-transform: uppercase; }
            .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e5e5; }
            .table th { background: #f8f8f8; font-weight: 600; }
            .status-implemented { color: #16a34a; }
            .status-partial { color: #ca8a04; }
            .status-not_implemented { color: #dc2626; }
            .progress-bar { height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden; }
            .progress-fill { height: 100%; background: #0066cc; }
            @media print { body { padding: 20px; } .section { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{report.report_title}</h1>
              <p className="text-muted-foreground">
                Generated on {new Date(report.generated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button onClick={handleExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-white p-8" id="report-preview-content">
              <ReportDocument
                reportType={report.report_type}
                title={report.report_title}
                reportData={report.report_data}
                visibility={report.section_visibility}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
