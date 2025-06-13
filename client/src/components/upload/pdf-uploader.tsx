import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ExtractedItem {
  name: string;
  quantity: number;
}

interface PdfUploaderProps {
  onItemsExtracted?: (items: ExtractedItem[]) => void;
}

export default function PdfUploader({ onItemsExtracted }: PdfUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [dragActive, setDragActive] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [createdJob, setCreatedJob] = useState<any>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedItems(data.items);
      setCreatedJob(data.job);
      onItemsExtracted?.(data.items);
      
      // Invalidate jobs cache to refresh the jobs list
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({ 
        title: "Job created successfully!", 
        description: data.message || `Created job with ${data.items.length} items from ${data.originalFilename}` 
      });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({ 
        title: "Upload failed", 
        description: "Failed to process PDF file",
        variant: "destructive" 
      });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        uploadMutation.mutate(file);
      } else {
        toast({ 
          title: "Invalid file type", 
          description: "Please upload a PDF file",
          variant: "destructive" 
        });
      }
    }
  }, [uploadMutation, toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload PDF Invoice</h3>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-slate-300 hover:border-primary"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="text-slate-500 w-6 h-6" />
            </div>
            <p className="text-slate-600 mb-2">
              {uploadMutation.isPending 
                ? "Processing PDF..." 
                : "Drop PDF invoice here or click to browse"
              }
            </p>
            <p className="text-sm text-slate-500 mb-4">Supports PDF files up to 10MB</p>
            
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
              id="pdf-upload"
              disabled={uploadMutation.isPending}
            />
            <Button 
              asChild 
              disabled={uploadMutation.isPending}
              className="cursor-pointer"
            >
              <label htmlFor="pdf-upload">
                <Upload className="w-4 h-4 mr-2" />
                {uploadMutation.isPending ? "Processing..." : "Browse Files"}
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job Created Successfully */}
      {createdJob && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
              <div className="flex-1">
                <h4 className="text-md font-semibold text-green-900 mb-2">
                  Job Created Successfully!
                </h4>
                <p className="text-green-800 mb-4">
                  Job #{createdJob.jobNumber} has been created with {extractedItems.length} items from your invoice.
                </p>
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => setLocation("/jobs")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    View All Jobs
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setExtractedItems([]);
                      setCreatedJob(null);
                    }}
                  >
                    Upload Another Invoice
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Items */}
      {extractedItems.length > 0 && !createdJob && (
        <Card>
          <CardContent className="p-6">
            <h4 className="text-md font-semibold text-slate-900 mb-4">Extracted Items</h4>
            <div className="space-y-2">
              {extractedItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-slate-600">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-4">
              Job will be created automatically with these items.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
