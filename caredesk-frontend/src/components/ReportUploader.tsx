"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle, AlertTriangle, FileText, X } from "lucide-react";
import { api } from "@/lib/api";

interface ReportUploaderProps {
  familyMemberId?: string;
  onUploadComplete?: (reportId: string) => void;
  onError?: (error: string) => void;
}

interface UploadState {
  status: "idle" | "uploading" | "processing" | "done" | "error";
  progress?: string;
  reportId?: string;
  error?: string;
}

export default function ReportUploader({ familyMemberId, onUploadComplete, onError }: ReportUploaderProps) {
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadState({ status: "error", error: "File too large. Maximum size is 10MB." });
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setUploadState({ status: "error", error: "Invalid file type. Only PDF, JPG, and PNG are supported." });
      return;
    }

    setSelectedFile(file);
    setUploadState({ status: "idle" });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadState({ status: "uploading", progress: "Requesting upload URL..." });
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const res = await api.post<{ data: { reportId: string; uploadUrl: string; key: string } }>(
        "/reports/upload-url",
        {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          familyMemberId,
        },
        token
      );

      setUploadState({ status: "uploading", progress: "Uploading file..." });

      await fetch(res.data.uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: { "Content-Type": selectedFile.type },
      });

      setUploadState({ status: "processing", progress: "AI is analyzing your report..." });

      await api.post(`/reports/${res.data.reportId}/process`, {}, token);

      setUploadState({ status: "done", reportId: res.data.reportId });
      onUploadComplete?.(res.data.reportId);
    } catch (err) {
      const apiErr = err as Error & { code?: string };
      const errorMsg = apiErr.code === "PAYWALL" ? apiErr.message : (apiErr.message || "Upload failed");
      setUploadState({ status: "error", error: errorMsg });
      onError?.(errorMsg);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setUploadState({ status: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      {uploadState.status === "idle" && !selectedFile && (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-slate-200 p-12 text-center hover:border-blue transition-colors">
            <div className="w-16 h-16 bg-blue-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue" />
            </div>
            <h3 className="text-lg font-semibold text-navy mb-2">Upload your medical report</h3>
            <p className="text-sm text-slate-500 mb-4">
              Drag and drop or click to upload. Supports PDF, JPG, PNG (max 10MB).
            </p>
            <p className="text-xs text-slate-400">AI will analyze your report and extract key health metrics</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      )}

      {selectedFile && uploadState.status === "idle" && (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-pale rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(1)}MB</p>
            </div>
            <button onClick={reset} className="p-1 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <button
            onClick={handleUpload}
            className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white font-semibold rounded-lg hover:bg-navy-light transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload & Analyze
          </button>
        </div>
      )}

      {(uploadState.status === "uploading" || uploadState.status === "processing") && (
        <div className="p-8 text-center">
          <Loader2 className="w-10 h-10 text-blue animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-navy">{uploadState.progress}</p>
          <p className="text-xs text-slate-500 mt-1">This may take a few seconds</p>
        </div>
      )}

      {uploadState.status === "done" && (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-navy mb-2">Report uploaded!</h3>
          <p className="text-sm text-slate-500 mb-4">AI analysis is complete. View your health insights.</p>
          <button
            onClick={reset}
            className="text-sm font-semibold text-blue hover:text-navy"
          >
            Upload another report
          </button>
        </div>
      )}

      {uploadState.status === "error" && (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-navy mb-2">Upload failed</h3>
          <p className="text-sm text-red-500 mb-4">{uploadState.error}</p>
          <button
            onClick={reset}
            className="text-sm font-semibold text-blue hover:text-navy"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
