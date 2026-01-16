import React, { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";

interface UploadResult {
  success: boolean;
  summary: {
    created: number;
    updated: number;
    totalProcessed: number;
    errors: number;
  };
  errors?: Array<{ ticker: string; message: string }>;
}

export function CSVUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<{ ticker: string; quantity: number; costBasis: number }[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation<UploadResult, Error, File>({
    mutationFn: async (fileToUpload: File) => {
      const formData = new FormData();
      formData.append("file", fileToUpload);

      const response = await fetch("/api/holdings/upload-csv", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload CSV");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/benchmark"] });
      
      // Reset file and preview
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith(".csv") && selectedFile.type !== "text/csv") {
      alert("Please select a CSV file");
      return;
    }

    // Validate file size (5MB limit)
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);

    // Preview CSV content (read first few rows)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      
      // Skip header row and parse first 5 rows for preview
      const previewRows: { ticker: string; quantity: number; costBasis: number }[] = [];
      for (let i = 1; i < Math.min(6, lines.length); i++) {
        const columns = lines[i].split(",").map((col) => col.trim().replace(/^"|"$/g, ""));
        if (columns.length >= 3) {
          // Try to find ticker, quantity, and cost basis columns
          // This is a simple preview - actual parsing happens on server
          const ticker = columns[0] || "N/A";
          const quantity = parseFloat(columns[1]) || 0;
          const costBasis = parseFloat(columns[2]) || 0;
          if (ticker !== "N/A" && quantity > 0 && costBasis > 0) {
            previewRows.push({ ticker, quantity, costBasis });
          }
        }
      }
      setPreview(previewRows.length > 0 ? previewRows : null);
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(() => {
    if (file) {
      uploadMutation.mutate(file);
    }
  }, [file, uploadMutation]);

  const handleClear = useCallback(() => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import from CSV
        </CardTitle>
        <CardDescription>
          Upload a CSV file from your brokerage to import holdings. Supported formats: Fidelity, Charles Schwab, TD Ameritrade, Robinhood, and generic CSV with Symbol, Quantity, and Cost Basis columns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${file ? "bg-muted/50" : ""}
            cursor-pointer hover:border-primary/50
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          {file ? (
            <div className="space-y-2">
              <FileText className="h-12 w-12 mx-auto text-primary" />
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="font-medium">
                Drag and drop your CSV file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                CSV files up to 5MB
              </p>
            </div>
          )}
        </div>

        {/* Preview Table */}
        {preview && preview.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 font-medium text-sm">
              Preview (first {preview.length} holdings)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Ticker</th>
                    <th className="text-right p-2">Quantity</th>
                    <th className="text-right p-2">Cost Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 font-mono">{row.ticker}</td>
                      <td className="p-2 text-right">{row.quantity.toFixed(2)}</td>
                      <td className="p-2 text-right">${row.costBasis.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {file && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="flex-1"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Holdings
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={uploadMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Success Message */}
        {uploadMutation.isSuccess && uploadMutation.data && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <div className="font-medium mb-1">Upload successful!</div>
              <div className="text-sm">
                Created {uploadMutation.data.summary.created} new holdings, updated {uploadMutation.data.summary.updated} existing holdings.
                {uploadMutation.data.summary.errors > 0 && (
                  <span className="block mt-1">
                    {uploadMutation.data.summary.errors} errors occurred. See details below.
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Messages */}
        {uploadMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {uploadMutation.error?.message || "Failed to upload CSV file"}
            </AlertDescription>
          </Alert>
        )}

        {uploadMutation.isSuccess && uploadMutation.data?.errors && uploadMutation.data.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Errors encountered:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {uploadMutation.data.errors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>
                    {error.ticker}: {error.message}
                  </li>
                ))}
                {uploadMutation.data.errors.length > 10 && (
                  <li className="text-muted-foreground">
                    ... and {uploadMutation.data.errors.length - 10} more errors
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
