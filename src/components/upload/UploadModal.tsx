'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { uploadBook, uploadMultipleBooks } from '@/lib/api/books';
import { parseEpub } from '@/lib/utils/epub-utils';
import type { FormatType } from '@/types/database';

interface UploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadState {
  status: 'idle' | 'parsing' | 'uploading' | 'success' | 'error' | 'partial_success'; // added partial_success
  progress: number;
  message: string;
  currentFileIndex?: number;
  totalFiles?: number;
}

export function UploadModal({ onClose, onUploadComplete }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]); // Changed to array
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null); // For custom cover preview

  // Metadata for single file upload (kept for backward compatibility/single file refinement)
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  const [uploadReport, setUploadReport] = useState<{ success: number; failed: number; errors: { fileName: string; error: string }[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Determine format type from file extension
  const getFormatType = (fileName: string): FormatType => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'epub') return 'epub';
    if (ext === 'md' || ext === 'markdown') return 'md';
    if (ext === 'pdf') return 'pdf';
    return 'epub';
  };

  // Add files to state
  const [groupAsBook, setGroupAsBook] = useState(false); // Checkbox state

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => {
      // Prevent duplicates by name
      const existingNames = new Set(prev.map(f => f.name));
      const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...uniqueNewFiles];
    });

    // If it's the first/only file, try to parse metadata if it's EPUB
    // (Optimization: only do deep parsing if it's a single file to keep UI responsive)
    if (newFiles.length === 1 && files.length === 0) {
      handleSingleFileParse(newFiles[0]);
    }
  }, [files]);

  const handleSingleFileParse = async (selectedFile: File) => {
    setUploadState({ status: 'parsing', progress: 10, message: 'Extracting metadata...' });

    try {
      if (selectedFile.name.toLowerCase().endsWith('.epub')) {
        const parsed = await parseEpub(selectedFile);
        setTitle(parsed.metadata.title);
        setAuthor(parsed.metadata.author);
        setDescription(parsed.metadata.description || '');

        if (parsed.coverUrl) {
          try {
            const response = await fetch(parsed.coverUrl);
            const blob = await response.blob();
            setCoverBlob(blob);
          } catch {
            console.warn('Could not fetch cover image');
          }
        }
      } else {
        // For markdown/pdf, use filename as title
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(fileName);
        setAuthor('Unknown Author');
      }

      setUploadState({ status: 'idle', progress: 0, message: '' });
    } catch (error) {
      console.error('Error parsing file:', error);
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Failed to extract metadata. You can enter it manually.'
      });
      // Fallback title
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(fileName);
    }
  };

  // Handle file removal
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    // Reset metadata if we removed the last file or cleared everything
    if (files.length <= 1) {
      resetForm();
    }
  };

  // Handle custom cover image selection
  const handleCoverSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCoverBlob(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setCoverPreviewUrl(previewUrl);
    }
  }, []);

  // Remove custom cover
  const removeCover = useCallback(() => {
    setCoverBlob(null);
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
  }, [coverPreviewUrl]);

  // Handle drag events
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, [addFiles]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  }, [addFiles]);

  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) return;

    if (files.length === 1) {
      // Single file flow (keeps existing logic for single file precision)
      if (!title) return;
      setUploadState({ status: 'uploading', progress: 0, message: 'Uploading...' });

      try {
        const file = files[0];
        const formatType = getFormatType(file.name);

        const { book, error } = await uploadBook(
          file,
          coverBlob,
          { title, author: author || 'Unknown Author', description, formatType },
          undefined,
          (progress) => {
            setUploadState((prev) => ({
              ...prev,
              progress,
              message: progress < 50 ? 'Uploading book file...' :
                progress < 80 ? 'Uploading cover...' : 'Saving to library...'
            }));
          }
        );

        if (error) {
          setUploadState({ status: 'error', progress: 0, message: error.message });
          return;
        }

        setUploadState({ status: 'success', progress: 100, message: 'Upload complete!' });
        setTimeout(() => {
          onUploadComplete();
        }, 1500);

      } catch (error) {
        setUploadState({
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    } else {
      // Bulk upload flow
      if (groupAsBook) {
        // Group as one book (Tasks 1 & 2)
        if (!title) return;
        setUploadState({ status: 'uploading', progress: 0, message: 'Creating book with chapters...' });

        try {
          // Determine format
          const firstFile = files[0];
          const formatType = getFormatType(firstFile.name);

          const { book, error } = await import('@/lib/api/books').then(mod => mod.uploadBookWithChapters(
            files,
            coverBlob,
            { title, author: author || 'Unknown Author', description, formatType },
            undefined,
            (p, msg) => setUploadState({ status: 'uploading', progress: p, message: msg })
          ));

          if (error) throw error;

          setUploadState({ status: 'success', progress: 100, message: 'Book created successfully!' });
          setTimeout(() => onUploadComplete(), 1500);

        } catch (error) {
          setUploadState({
            status: 'error',
            progress: 0,
            message: error instanceof Error ? error.message : 'Chapter upload failed'
          });
        }

      } else {
        // Standard bulk upload (existing)
        setUploadState({ status: 'uploading', progress: 0, message: 'Starting batch upload...' });

        try {
          const results = await uploadMultipleBooks(
            files,
            undefined, // userId
            (current, total, fileName) => {
              const percentage = Math.round(((current - 1) / total) * 100);
              setUploadState({
                status: 'uploading',
                progress: percentage,
                message: `Uploading ${fileName} (${current} of ${total})...`,
                currentFileIndex: current,
                totalFiles: total
              });
            }
          );

          setUploadReport({
            success: results.successCount,
            failed: results.failureCount,
            errors: results.errors
          });

          if (results.failureCount > 0 && results.successCount > 0) {
            setUploadState({
              status: 'partial_success',
              progress: 100,
              message: `Completed with warnings.`
            });
          } else if (results.failureCount > 0 && results.successCount === 0) {
            setUploadState({
              status: 'error',
              progress: 100,
              message: `All uploads failed.`
            });
          } else {
            setUploadState({ status: 'success', progress: 100, message: 'All files uploaded successfully!' });
            setTimeout(() => {
              onUploadComplete();
            }, 2000);
          }

        } catch (error) {
          setUploadState({
            status: 'error',
            progress: 0,
            message: 'Batch upload failed unexpectedly.'
          });
        }
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFiles([]);
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverBlob(null);
    setCoverPreviewUrl(null);
    setTitle('');
    setAuthor('');
    setDescription('');
    setUploadState({ status: 'idle', progress: 0, message: '' });
    setUploadReport(null);
  };

  const isIdle = uploadState.status === 'idle' || uploadState.status === 'error';
  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'parsing';
  const isSuccess = uploadState.status === 'success' || uploadState.status === 'partial_success';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <h2 className="text-xl font-semibold text-foreground">
              {files.length > 1 ? `Upload ${files.length} Books` : 'Upload Book'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-foreground rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content (Scrollable) */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Drop Zone */}
            {isIdle && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragging
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-muted hover:bg-white/5'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".epub,.md,.markdown,.pdf"
                  multiple // Enabled multiple
                  onChange={handleInputChange}
                  className="hidden"
                />
                <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-accent' : 'text-muted'}`} />
                <p className="text-foreground font-medium mb-1">
                  {isDragging ? 'Drop files here' : 'Drag & drop your books'}
                </p>
                <p className="text-sm text-muted">
                  or click to browse (Multiple files allowed)
                </p>
              </div>
            )}

            {/* File List / Selected File */}
            {files.length > 0 && !isSuccess && (
              <div className="space-y-4">
                {/* Batch List Header */}
                {files.length > 1 && (
                  <div className="flex items-center justify-between text-sm text-muted px-1">
                    <span>{files.length} files selected</span>
                    <button onClick={() => setFiles([])} className="hover:text-red-400 transition-colors">Clear all</button>
                  </div>
                )}

                <div className={`space-y-2 ${files.length > 4 ? 'max-h-[200px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                  {files.map((file, index) => (
                    <motion.div
                      key={`${file.name}-${index}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group"
                    >
                      <div className="p-2 bg-accent/10 rounded-lg">
                        <FileText className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      {!isUploading && (
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Metadata Section */}
                <div className={`space-y-4 pt-4 border-t border-white/10 mt-4`}>

                  {/* Checkbox for grouping */}
                  {files.length > 1 && (
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="groupAsBook"
                        checked={groupAsBook}
                        onChange={(e) => setGroupAsBook(e.target.checked)}
                        disabled={isUploading}
                        className="w-4 h-4 rounded border-gray-600 bg-white/5 text-accent focus:ring-accent disabled:opacity-50"
                      />
                      <label htmlFor="groupAsBook" className="text-sm text-foreground cursor-pointer select-none">
                        Import as a single book (Chapter Collection)
                      </label>
                    </div>
                  )}

                  {/* Metadata fields - show if single file OR grouping is checked */}
                  {(files.length === 1 || groupAsBook) && (
                    <>
                      {/* Cover Image Picker for non-EPUB files */}
                      {!files[0]?.name.toLowerCase().endsWith('.epub') && (
                        <div>
                          <label className="block text-sm font-medium text-muted mb-1.5">Cover Image</label>
                          <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCoverSelect}
                            className="hidden"
                          />
                          <div
                            onClick={() => !isUploading && coverInputRef.current?.click()}
                            className={`
                                    relative w-24 h-36 rounded-lg border-2 border-dashed transition-all cursor-pointer
                                    ${coverPreviewUrl
                                ? 'border-accent'
                                : 'border-border hover:border-muted hover:bg-white/5'
                              }
                                    ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                                  `}
                          >
                            {coverPreviewUrl ? (
                              <>
                                <img
                                  src={coverPreviewUrl}
                                  alt="Cover preview"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                {!isUploading && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeCover(); }}
                                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-muted">
                                <ImageIcon className="w-6 h-6 mb-1" />
                                <span className="text-xs">Add Cover</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-muted mb-1.5">Title</label>
                        <input
                          type="text"
                          value={title}
                          placeholder={files.length > 1 ? "Collection Title (e.g. 48 Laws of Power)" : "Book Title"}
                          onChange={(e) => setTitle(e.target.value)}
                          disabled={isUploading}
                          className="w-full px-4 py-2 bg-white/5 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted mb-1.5">Author</label>
                        <input
                          type="text"
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          disabled={isUploading}
                          className="w-full px-4 py-2 bg-white/5 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all disabled:opacity-50"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {uploadState.status === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{uploadState.message}</p>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="py-6 text-center">
                <Loader2 className="w-10 h-10 mx-auto mb-4 text-accent animate-spin" />
                <p className="text-foreground font-medium mb-3">{uploadState.message}</p>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadState.progress}%` }}
                    className="h-full bg-accent rounded-full"
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {files.length > 1 && uploadState.totalFiles && (
                  <p className="text-xs text-muted mt-2">
                    Processed {uploadState.currentFileIndex} of {uploadState.totalFiles}
                  </p>
                )}
              </div>
            )}

            {/* Success / Report State */}
            {isSuccess && (
              <div className="py-6 text-center space-y-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{
                    scale: [0, 1.2, 0.9, 1.1, 1],
                    rotate: [180, 0, 0, 0, 0]
                  }}
                  transition={{
                    duration: 0.8,
                    times: [0, 0.4, 0.6, 0.8, 1],
                    type: 'spring',
                    stiffness: 200,
                    damping: 10
                  }}
                >
                  {uploadState.status === 'partial_success' ? (
                    <AlertCircle className="w-16 h-16 mx-auto text-yellow-500" />
                  ) : (
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 0 0 rgba(34, 197, 94, 0.4)',
                          '0 0 0 20px rgba(34, 197, 94, 0)',
                        ]
                      }}
                      transition={{ duration: 1, repeat: 2 }}
                      className="inline-block rounded-full"
                    >
                      <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                    </motion.div>
                  )}
                </motion.div>

                <div>
                  <p className="text-foreground font-medium text-lg">
                    {uploadState.status === 'success' ? 'Upload Complete!' : 'Upload Finished'}
                  </p>
                  {uploadReport ? (
                    <div className="mt-2 text-sm text-muted">
                      <span className="text-green-400">{uploadReport.success} successful</span>
                      <span className="mx-2">•</span>
                      <span className={uploadReport.failed > 0 ? "text-red-400" : "text-muted"}>
                        {uploadReport.failed} failed
                      </span>
                    </div>
                  ) : (
                    <p className="text-muted mt-1">{title}</p>
                  )}
                </div>

                {/* Show failures if any */}
                {uploadReport && uploadReport.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-white/5 rounded-xl text-left max-h-[150px] overflow-y-auto custom-scrollbar">
                    <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Error Log</p>
                    {uploadReport.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-red-400 mb-1">
                        <span className="font-mono flex-shrink-0">•</span>
                        <span>{err.fileName}: {err.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isUploading && !isSuccess && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-white/5 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={files.length === 0 || ((files.length === 1 || groupAsBook) && !title)}
                className="px-6 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                {files.length > 1 ? `Upload ${files.length} Files` : 'Upload'}
              </button>
            </div>
          )}

          {/* Close button for report view */}
          {isSuccess && uploadReport && uploadReport.failed > 0 && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-white/5 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-foreground font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
