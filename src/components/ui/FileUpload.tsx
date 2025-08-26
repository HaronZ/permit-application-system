"use client";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileImage, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: string[];
  label?: string;
  error?: string;
  helperText?: string;
}

export default function FileUpload({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = ["image/*"],
  label = "Upload files",
  error,
  helperText,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      const validFiles = acceptedFiles.filter(
        (file) => file.size <= maxSize
      );

      if (validFiles.length + files.length > maxFiles) {
        // Show error for too many files
        return;
      }

      onFilesChange([...files, ...validFiles]);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        console.warn("Rejected files:", rejectedFiles);
      }
    },
    [files, maxFiles, maxSize, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    multiple: true,
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div
        {...getRootProps()}
        className={clsx(
          "relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all duration-200",
          isDragActive || dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
          error && "border-red-300 bg-red-50"
        )}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isDragActive
                ? "Drop files here"
                : "Drag & drop files here, or click to select"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {accept.includes("image/*") ? "Images" : "Files"} up to {formatFileSize(maxSize)} • Max {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected files ({files.length}/{maxFiles})
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="group relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
                
                <div className="flex items-center gap-3">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100">
                      <FileImage className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-2 text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
