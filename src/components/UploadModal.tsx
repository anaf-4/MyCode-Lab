'use client';

import { useState, useCallback, useRef } from 'react';
import { CodeSnippet, Repository, detectLanguage, formatFileSize, languageExtensions } from '@/lib/db';
import { useSnippets } from '@/context/SnippetsContext';
import { useRouter } from 'next/navigation';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingFile {
  file: File;
  content: string;
  language: string;
  size: number;
  path: string; // relative path within folder
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [mode, setMode] = useState<'single' | 'folder'>('single');
  // Single mode
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  // Folder mode
  const [repoName, setRepoName] = useState('');
  const [repoDescription, setRepoDescription] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [folderTags, setFolderTags] = useState<string[]>([]);
  const [folderTagInput, setFolderTagInput] = useState('');
  // Shared
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { saveSnippet: addSnippet, saveSnippetsBatch, saveRepo } = useSnippets();

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleSingleFile = useCallback(async (file: File) => {
    try {
      const content = await readFileContent(file);
      const lang = detectLanguage(file.name);
      setCode(content);
      setLanguage(lang);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  }, [title]);

  const handleFolderFiles = useCallback(async (files: File[], baseDir: string = '') => {
    const newFiles: PendingFile[] = [];
    for (const file of files) {
      try {
        const content = await readFileContent(file);
        const path = baseDir ? `${baseDir}/${file.name}` : file.name;
        newFiles.push({
          file,
          content,
          language: detectLanguage(file.name),
          size: file.size,
          path,
        });
      } catch (err) {
        console.error(`Failed to read ${file.name}:`, err);
      }
    }
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const items = e.dataTransfer.items;
      if (!items) return;

      const processEntry = async (entry: FileSystemEntry, currentPath: string = ''): Promise<void> => {
        if (entry.isFile) {
          const file = await new Promise<File | null>((resolve) => {
            (entry as FileSystemFileEntry).file(resolve);
          });
          if (file) {
            if (mode === 'single') {
              await handleSingleFile(file);
            } else {
              const path = currentPath ? `${currentPath}/${entry.name}` : entry.name;
              const content = await readFileContent(file);
              setPendingFiles((prev) => [...prev, {
                file,
                content,
                language: detectLanguage(file.name),
                size: file.size,
                path,
              }]);
            }
          }
        } else if (entry.isDirectory) {
          if (mode === 'single') return; // Skip folders in single mode
          const dirName = entry.name;
          const dirPath = currentPath ? `${currentPath}/${dirName}` : dirName;
          const reader = (entry as FileSystemDirectoryEntry).createReader();
          const readAllEntries = (): Promise<FileSystemEntry[]> => {
            return new Promise((resolve) => {
              reader.readEntries((entries) => {
                if (entries.length === 0) resolve([]);
                else readAllEntries().then((more) => resolve([...entries, ...more]));
              });
            });
          };
          const entries = await readAllEntries();
          for (const child of entries) {
            await processEntry(child, dirPath);
          }
        }
      };

      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) await processEntry(entry);
      }
    },
    [mode, handleSingleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        if (mode === 'single' && files.length > 0) {
          handleSingleFile(files[0]);
        } else {
          handleFolderFiles(files);
        }
      }
    },
    [mode, handleSingleFile, handleFolderFiles]
  );

  const handleFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const files = Array.from(e.target.files);
      // Extract folder structure from webkitRelativePath
      const processed: PendingFile[] = [];
      for (const file of files) {
        const fullPath = (file as any).webkitRelativePath || file.name;
        // Remove the root folder name from path
        const parts = fullPath.split('/');
        const relativePath = parts.slice(1).join('/');
        processed.push({
          file,
          content: '', // Will be read async
          language: detectLanguage(file.name),
          size: file.size,
          path: relativePath || file.name,
        });
      }
      // Set repo name from folder name
      if (processed.length > 0 && !repoName) {
        const rootFolder = (files[0] as any).webkitRelativePath?.split('/')[0] || '';
        if (rootFolder) setRepoName(rootFolder);
      }
      // Read all file contents
      Promise.all(
        processed.map(async (pf) => {
          const content = await readFileContent(pf.file);
          return { ...pf, content };
        })
      ).then((results) => {
        setPendingFiles((prev) => [...prev, ...results]);
      });
    },
    [mode, repoName]
  );

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => setTags(tags.filter((t) => t !== tag)), [tags]);

  const addFolderTag = useCallback(() => {
    const trimmed = folderTagInput.trim();
    if (trimmed && !folderTags.includes(trimmed)) {
      setFolderTags([...folderTags, trimmed]);
      setFolderTagInput('');
    }
  }, [folderTagInput, folderTags]);

  const removeFolderTag = useCallback((tag: string) => setFolderTags(folderTags.filter((t) => t !== tag)), [folderTags]);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSaveSingle = useCallback(async () => {
    if (!title.trim() || !code.trim()) return;
    setSaving(true);
    setSaveError(null);

    try {
      const now = new Date().toISOString();
      const snippet: CodeSnippet = {
        id: Date.now().toString(),
        title: title.trim(),
        language,
        code,
        tags,
        createdAt: now,
        updatedAt: now,
      };

      await addSnippet(snippet);
      setSaving(false);
      router.push(`/view/${snippet.id}`);
      resetAndClose();
    } catch (err) {
      console.error('Save failed:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }, [title, code, language, tags, router, addSnippet]);

  const handleSaveFolder = useCallback(async () => {
    if (pendingFiles.length === 0 || !repoName.trim()) return;
    setSaving(true);
    setSaveError(null);

    try {
      const now = new Date().toISOString();
      const repoId = `repo_${Date.now()}`;

      // Create repository
      const langSet = new Set(pendingFiles.map((f) => f.language));
      const repo: Repository = {
        id: repoId,
        name: repoName.trim(),
        description: repoDescription.trim(),
        tags: folderTags,
        createdAt: now,
        updatedAt: now,
        fileCount: pendingFiles.length,
        totalSize: pendingFiles.reduce((sum, f) => sum + f.size, 0),
        languages: Array.from(langSet),
      };

      await saveRepo(repo);

      // Create snippets for each file
      const snippets: CodeSnippet[] = pendingFiles.map((pf, i) => ({
        id: `${repoId}_${i}`,
        title: pf.path.split('/').pop() || pf.path,
        language: pf.language,
        code: pf.content,
        tags: folderTags,
        createdAt: now,
        updatedAt: now,
        repositoryId: repoId,
        path: pf.path,
      }));

      await saveSnippetsBatch(snippets, repoId);
      setSaving(false);
      router.push(`/repo/${repoId}`);
      resetAndClose();
    } catch (err) {
      console.error('Save failed:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }, [pendingFiles, repoName, repoDescription, folderTags, router, saveRepo, saveSnippetsBatch]);

  const resetAndClose = () => {
    setTitle('');
    setCode('');
    setLanguage('javascript');
    setTags([]);
    setTagInput('');
    setRepoName('');
    setRepoDescription('');
    setPendingFiles([]);
    setFolderTags([]);
    setFolderTagInput('');
    setSaving(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  const handleFolderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addFolderTag(); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {mode === 'single' ? 'Upload Code' : 'Upload Repository'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl">
            &times;
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
            <button
              onClick={() => { setMode('single'); setPendingFiles([]); setRepoName(''); setRepoDescription(''); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'single'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Single File
            </button>
            <button
              onClick={() => { setMode('folder'); setTitle(''); setCode(''); setTags([]); setTagInput(''); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'folder'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Repository
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="mx-auto w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {isDragging
                ? 'Drop here'
                : mode === 'single'
                ? 'Drag & drop a file, or click to browse'
                : 'Drag & drop a folder, or click to select'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No size limit &bull; Auto-detects language
              {mode === 'folder' && ' \u2022 Preserves folder structure'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple={mode === 'folder'}
              onChange={handleFileInput}
              accept="*/*"
            />
            {mode === 'folder' && (
              <button
                onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                className="mt-3 px-4 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Select Folder
              </button>
            )}
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              multiple
              {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
              onChange={handleFolderInput}
              accept="*/*"
            />
          </div>

          {mode === 'single' ? (
            <>
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all capitalize"
                >
                  {Array.from(new Set(Object.values(languageExtensions))).sort().map((lang) => (
                    <option key={lang} value={lang} className="capitalize">{lang}</option>
                  ))}
                  <option value="plaintext">Plain Text</option>
                </select>
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your code here..."
                  rows={8}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-y"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add tag and press Enter"
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                  <button onClick={addTag} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-purple-800 dark:hover:text-purple-200">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Repo Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repository Name</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-project"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Repo Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={repoDescription}
                  onChange={(e) => setRepoDescription(e.target.value)}
                  placeholder="A brief description of this repository"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              {/* File List */}
              {pendingFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Files ({pendingFiles.length}) &bull; {formatFileSize(pendingFiles.reduce((s, f) => s + f.size, 0))}
                    </label>
                    <button
                      onClick={() => setPendingFiles([])}
                      className="text-xs text-red-500 hover:text-red-400 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-gray-200 dark:border-gray-700">
                    {pendingFiles.map((pf, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate text-gray-700 dark:text-gray-300 font-mono text-xs">{pf.path}</span>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 capitalize shrink-0">
                            {pf.language}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatFileSize(pf.size)}</span>
                        </div>
                        <button
                          onClick={() => removePendingFile(i)}
                          className="ml-2 text-gray-400 hover:text-red-400 transition-colors shrink-0"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={folderTagInput}
                    onChange={(e) => setFolderTagInput(e.target.value)}
                    onKeyDown={handleFolderKeyDown}
                    placeholder="Add tag and press Enter"
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                  <button onClick={addFolderTag} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    Add
                  </button>
                </div>
                {folderTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {folderTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs">
                        {tag}
                        <button onClick={() => removeFolderTag(tag)} className="hover:text-purple-800 dark:hover:text-purple-200">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Error Message */}
        {saveError && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">
              Error: {saveError}
            </p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
              Check browser console (F12) for details. Make sure MySQL is accessible.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={resetAndClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={mode === 'single' ? handleSaveSingle : handleSaveFolder}
            disabled={
              saving ||
              (mode === 'single' && (!title.trim() || !code.trim())) ||
              (mode === 'folder' && (pendingFiles.length === 0 || !repoName.trim()))
            }
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              !saving &&
              (mode === 'single'
                ? title.trim() && code.trim()
                : pendingFiles.length > 0 && repoName.trim())
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : mode === 'folder' ? (
              `Save Repository (${pendingFiles.length} files)`
            ) : (
              'Save Code'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
