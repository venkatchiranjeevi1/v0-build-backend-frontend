"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { FileText, Upload, CheckCircle, XCircle, Loader2 } from "lucide-react"
import axios from "axios"

const DocumentUploader = ({ connectionId }) => {
  const [uploadStatus, setUploadStatus] = useState(null)
  const [uploadProgress, setUploadProgress] = useState([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return

      setIsUploading(true)
      setUploadStatus(null)
      setUploadProgress([])

      try {
        const formData = new FormData()
        acceptedFiles.forEach((file) => {
          formData.append("files", file)
        })

        if (connectionId) {
          formData.append("connection_id", connectionId)
        }

        const response = await axios.post("/api/upload-documents", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })

        if (response.data.success) {
          const jobId = response.data.job_id

          // Poll for progress
          const pollProgress = async () => {
            try {
              const progressResponse = await axios.get(`/api/ingestion-status/${jobId}`)
              const status = progressResponse.data

              setUploadProgress(status.files || [])

              if (status.status === "completed") {
                setUploadStatus("success")
                setIsUploading(false)
              } else if (status.status === "failed") {
                setUploadStatus("error")
                setIsUploading(false)
              } else {
                setTimeout(pollProgress, 1000)
              }
            } catch (error) {
              console.error("Progress polling failed:", error)
              setUploadStatus("error")
              setIsUploading(false)
            }
          }

          pollProgress()
        }
      } catch (error) {
        console.error("Upload failed:", error)
        setUploadStatus("error")
        setIsUploading(false)
      }
    },
    [connectionId],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: true,
  })

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold">Document Upload</h3>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <Upload className="w-12 h-12 text-muted-foreground" />

          {isDragActive ? (
            <p className="text-primary">Drop the files here...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-foreground font-medium">Drag & drop files here, or click to select</p>
              <p className="text-sm text-muted-foreground">Supports PDF, DOCX, TXT, CSV, XLS, XLSX</p>
            </div>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processing documents...</span>
          </div>

          {uploadProgress.length > 0 && (
            <div className="space-y-2">
              {uploadProgress.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm truncate">{file.filename}</span>
                  <div className="flex items-center gap-2">
                    {file.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : file.status === "failed" ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <span className="text-xs text-muted-foreground">{file.chunks && `${file.chunks} chunks`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {uploadStatus && !isUploading && (
        <div
          className={`mt-4 flex items-center gap-2 p-3 rounded-md ${
            uploadStatus === "success"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {uploadStatus === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="text-sm">
            {uploadStatus === "success"
              ? `Successfully processed ${uploadProgress.length} documents`
              : "Document processing failed"}
          </span>
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground">
        <p>Supported formats: PDF, DOCX, TXT, CSV, Excel files</p>
        <p>Maximum file size: 10MB per file</p>
      </div>
    </div>
  )
}

export default DocumentUploader
