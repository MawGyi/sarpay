'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FileText,
    CheckCircle,
    AlertCircle,
    Loader2,
    Image as ImageIcon,
    Pencil,
    Plus
} from 'lucide-react';
import { updateBook, fetchChapters } from '@/lib/api/books';
import { addChaptersToBook } from '@/lib/api/books';
import type { Book } from '@/types/database';

interface EditMdBookModalProps {
    book: Book;
    onClose: () => void;
    onEditComplete: () => void;
}

interface EditState {
    status: 'idle' | 'saving' | 'success' | 'error';
    message: string;
}

export function EditMdBookModal({ book, onClose, onEditComplete }: EditMdBookModalProps) {
    const [title, setTitle] = useState(book.title);
    const [author, setAuthor] = useState(book.author);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(book.coverUrl || null);
    const [newChapterFiles, setNewChapterFiles] = useState<File[]>([]);
    const [existingChapterCount, setExistingChapterCount] = useState<number>(book.chapterCount || 0);
    const [editState, setEditState] = useState<EditState>({ status: 'idle', message: '' });
    const [isDragging, setIsDragging] = useState(false);

    const coverInputRef = useRef<HTMLInputElement>(null);
    const chapterInputRef = useRef<HTMLInputElement>(null);

    // Fetch existing chapter count on mount
    useEffect(() => {
        const loadChapters = async () => {
            const { chapters } = await fetchChapters(book.id);
            if (chapters) {
                setExistingChapterCount(chapters.length);
            }
        };
        loadChapters();
    }, [book.id]);

    // Handle cover image selection
    const handleCoverSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setCoverFile(file);
            const previewUrl = URL.createObjectURL(file);
            setCoverPreviewUrl(previewUrl);
        }
    }, []);

    // Remove cover
    const removeCover = useCallback(() => {
        setCoverFile(null);
        if (coverPreviewUrl && coverPreviewUrl !== book.coverUrl) {
            URL.revokeObjectURL(coverPreviewUrl);
        }
        setCoverPreviewUrl(null);
    }, [coverPreviewUrl, book.coverUrl]);

    // Handle chapter files
    const addChapterFiles = useCallback((files: File[]) => {
        const mdFiles = files.filter(f =>
            f.name.toLowerCase().endsWith('.md') || f.name.toLowerCase().endsWith('.markdown')
        );
        setNewChapterFiles(prev => {
            const existingNames = new Set(prev.map(f => f.name));
            const uniqueNew = mdFiles.filter(f => !existingNames.has(f.name));
            return [...prev, ...uniqueNew];
        });
    }, []);

    const removeChapterFile = (index: number) => {
        setNewChapterFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Drag handlers
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
            addChapterFiles(Array.from(e.dataTransfer.files));
        }
    }, [addChapterFiles]);

    // Handle save
    const handleSave = async () => {
        if (!title.trim()) {
            setEditState({ status: 'error', message: 'Title is required' });
            return;
        }

        setEditState({ status: 'saving', message: 'Saving changes...' });

        try {
            // Upload cover if changed
            let coverUrl = book.coverUrl;
            if (coverFile) {
                setEditState({ status: 'saving', message: 'Uploading cover image...' });
                const { uploadFile, getStorageUrl } = await import('@/lib/supabase');
                const coverPath = `covers/${book.id}_${Date.now()}.${coverFile.name.split('.').pop()}`;
                const { url, error: coverError } = await uploadFile('books', coverPath, coverFile);
                if (coverError) throw coverError;
                coverUrl = url;
            }

            // Update book metadata
            setEditState({ status: 'saving', message: 'Updating book info...' });
            const { error: updateError } = await updateBook(book.id, {
                title: title.trim(),
                author: author.trim() || 'Unknown Author',
                cover_url: coverUrl || undefined,
            });

            if (updateError) throw updateError;

            // Add new chapters if any
            if (newChapterFiles.length > 0) {
                setEditState({ status: 'saving', message: `Adding ${newChapterFiles.length} new chapters...` });
                const { error: chapterError } = await addChaptersToBook(
                    book.id,
                    newChapterFiles,
                    existingChapterCount
                );
                if (chapterError) throw chapterError;
            }

            setEditState({ status: 'success', message: 'Changes saved!' });
            setTimeout(() => {
                onEditComplete();
            }, 1000);

        } catch (error) {
            console.error('Error saving:', error);
            setEditState({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to save changes'
            });
        }
    };

    const isIdle = editState.status === 'idle' || editState.status === 'error';
    const isSaving = editState.status === 'saving';
    const isSuccess = editState.status === 'success';

    return (
        <AnimatePresence>
            <>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                />

                {/* Modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-white/10 max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex-shrink-0">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-accent/10">
                                        <Pencil className="w-5 h-5 text-accent" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Edit Book</h2>
                                        <p className="text-sm text-white/60 mt-0.5">Update cover and add chapters</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {/* Cover Image Section */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">Cover Image</label>
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverSelect}
                                    className="hidden"
                                />
                                <div className="flex items-start gap-4">
                                    <div
                                        onClick={() => !isSaving && coverInputRef.current?.click()}
                                        className={`
                      relative w-24 h-36 rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden
                      ${coverPreviewUrl ? 'border-accent' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
                      ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                                    >
                                        {coverPreviewUrl ? (
                                            <>
                                                <img
                                                    src={coverPreviewUrl}
                                                    alt="Cover preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                {!isSaving && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeCover(); }}
                                                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-white/40">
                                                <ImageIcon className="w-6 h-6 mb-1" />
                                                <span className="text-xs">Add Cover</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-sm text-white/50">
                                        <p>Click to upload a cover image</p>
                                        <p className="mt-1">Recommended: 400x600px</p>
                                    </div>
                                </div>
                            </div>

                            {/* Title & Author */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        disabled={isSaving}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">Author</label>
                                    <input
                                        type="text"
                                        value={author}
                                        onChange={(e) => setAuthor(e.target.value)}
                                        disabled={isSaving}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {/* Add Chapters Section */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Add Chapters
                                    {existingChapterCount > 0 && (
                                        <span className="text-white/40 font-normal ml-2">
                                            ({existingChapterCount} existing)
                                        </span>
                                    )}
                                </label>
                                <input
                                    ref={chapterInputRef}
                                    type="file"
                                    accept=".md,.markdown"
                                    multiple
                                    onChange={(e) => e.target.files && addChapterFiles(Array.from(e.target.files))}
                                    className="hidden"
                                />

                                {/* Drop Zone */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => !isSaving && chapterInputRef.current?.click()}
                                    className={`
                    border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
                    ${isDragging ? 'border-accent bg-accent/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
                    ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                                >
                                    <Plus className={`w-6 h-6 mx-auto mb-2 ${isDragging ? 'text-accent' : 'text-white/40'}`} />
                                    <p className="text-sm text-white/60">
                                        {isDragging ? 'Drop MD files here' : 'Drag & drop or click to add chapters'}
                                    </p>
                                </div>

                                {/* New Chapter Files List */}
                                {newChapterFiles.length > 0 && (
                                    <div className="mt-3 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                                        {newChapterFiles.map((file, index) => (
                                            <div
                                                key={`${file.name}-${index}`}
                                                className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5 group"
                                            >
                                                <FileText className="w-4 h-4 text-accent flex-shrink-0" />
                                                <span className="flex-1 text-sm text-white/80 truncate">{file.name}</span>
                                                {!isSaving && (
                                                    <button
                                                        onClick={() => removeChapterFile(index)}
                                                        className="p-1 text-white/40 hover:text-red-400 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Error Message */}
                            {editState.status === 'error' && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p className="text-sm">{editState.message}</p>
                                </div>
                            )}

                            {/* Saving State */}
                            {isSaving && (
                                <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-xl">
                                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                                    <p className="text-sm text-white/80">{editState.message}</p>
                                </div>
                            )}

                            {/* Success State */}
                            {isSuccess && (
                                <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <p className="text-sm text-green-400">{editState.message}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {!isSuccess && (
                            <div className="p-6 bg-white/5 flex items-center justify-end gap-3 border-t border-white/10 flex-shrink-0">
                                <button
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !title.trim()}
                                    className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save Changes</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </>
        </AnimatePresence>
    );
}
