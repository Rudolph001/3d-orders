import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import PdfUploader from "@/components/upload/pdf-uploader";
import NewJobModal from "@/components/jobs/new-job-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";

interface ExtractedItem {
  name: string;
  quantity: number;
}

export default function Upload() {
  const [, setLocation] = useLocation();
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);

  const handleItemsExtracted = (items: ExtractedItem[]) => {
    setExtractedItems(items);
  };

  const handleCreateJobFromPDF = () => {
    // This would ideally pre-populate the job form with extracted items
    setNewJobModalOpen(true);
  };

  return (
    <>
      <Header
        title="Upload Invoice"
        subtitle="Upload PDF invoices to automatically extract print job items"
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Instructions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-medium mb-2">1. Upload PDF</h4>
                  <p className="text-sm text-slate-600">
                    Upload your customer's invoice PDF containing item names and quantities
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-medium mb-2">2. Review Items</h4>
                  <p className="text-sm text-slate-600">
                    Our system automatically extracts items and quantities from the PDF
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-medium mb-2">3. Create Job</h4>
                  <p className="text-sm text-slate-600">
                    Create a new print job with the extracted items and add print times
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Uploader */}
          <PdfUploader onItemsExtracted={handleItemsExtracted} />

          {/* Action Buttons */}
          {extractedItems.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">Next Steps</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Ready to create a job with {extractedItems.length} extracted items
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button variant="outline" onClick={() => setLocation("/jobs")}>
                      View All Jobs
                    </Button>
                    <Button onClick={handleCreateJobFromPDF}>
                      Create Job from PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Tips for Better Results</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="font-medium text-primary">•</span>
                  <span>Ensure your PDF has clear text (not scanned images)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-medium text-primary">•</span>
                  <span>Items should be formatted with quantities (e.g., "2x Gear Assembly" or "Bracket - 3")</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-medium text-primary">•</span>
                  <span>Review extracted items carefully before creating jobs</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-medium text-primary">•</span>
                  <span>You can always manually add print times and materials after extraction</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <NewJobModal open={newJobModalOpen} onOpenChange={setNewJobModalOpen} />
    </>
  );
}
