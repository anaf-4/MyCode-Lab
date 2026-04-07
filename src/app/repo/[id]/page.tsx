'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import JSZip from 'jszip';
import { CodeSnippet, Repository, getLanguageIcon, getLanguageColor, formatFileSize } from '@/lib/db';
import { useSnippets } from '@/context/SnippetsContext';
import CodeEditor from '@/components/CodeEditor';
import ExecutionPanel from '@/components/ExecutionPanel';
import { useTheme } from '@/hooks/useTheme';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  snippet?: CodeSnippet;
  children?: TreeNode[];
}

function buildFileTree(snippets: CodeSnippet[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  // Sort snippets by path for consistent ordering
  const sorted = [...snippets].sort((a, b) => (a.path || '').localeCompare(b.path || ''));

  for (const snippet of sorted) {
    const path = snippet.path || snippet.title;
    const parts = path.split('/');

    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const currentPath = parts.slice(0, i + 1).join('/');

      if (i === parts.length - 1) {
        // File
        if (!map.has(currentPath)) {
          const node: TreeNode = {
            name: part,
            path: currentPath,
            type: 'file',
            snippet,
          };
          map.set(currentPath, node);
          currentLevel.push(node);
        }
      } else {
        // Folder
        if (!map.has(currentPath)) {
          const node: TreeNode = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: [],
          };
          map.set(currentPath, node);
          currentLevel.push(node);
        }
        currentLevel = map.get(currentPath)!.children!;
      }
    }
  }

  return root;
}

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (snippet: CodeSnippet) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isSelected = selectedPath === node.path;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${
            isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-gray-700 dark:text-gray-300 truncate">{node.name}</span>
        </button>
        {expanded && node.children?.map((child, i) => (
          <FileTreeNode
            key={i}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  const langColor = node.snippet ? getLanguageColor(node.snippet.language) : '#888';

  return (
    <button
      onClick={() => node.snippet && onSelect(node.snippet)}
      className={`w-full flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
      }`}
      style={{ paddingLeft: `${depth * 16 + 24}px` }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: langColor }}
      />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export default function RepoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { theme, toggleTheme } = useTheme();
  const { snippets: allSnippets, updateSnippet, deleteSnippet: deleteSnippetFromContext, deleteRepo, refresh } = useSnippets();

  const [repo, setRepo] = useState<Repository | null>(null);
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [code, setCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSplit, setIsSplit] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[RepoPage] Loading data for id:', id);
        const [repoData, snippetData] = await Promise.all([
          fetch(`/api/repos/${id}`).then((r) => r.json()),
          fetch(`/api/repos/${id}/snippets`).then((r) => r.json()),
        ]);
        console.log('[RepoPage] Fetched repo:', repoData);
        console.log('[RepoPage] Fetched snippets:', snippetData);
        if (repoData && !repoData.error) {
          setRepo(repoData);
          setSnippets(snippetData.sort((a: CodeSnippet, b: CodeSnippet) => (a.path || '').localeCompare(b.path || '')));
          if (snippetData.length > 0) {
            setSelectedSnippet(snippetData[0]);
            setCode(snippetData[0].code);
          }
        }
      } catch (err) {
        console.error('Failed to load repo:', err);
      }
    };
    loadData();
  }, [id]);

  // Also listen for context changes
  useEffect(() => {
    const repoSnippets = allSnippets.filter((s) => s.repositoryId === id);
    if (repoSnippets.length > 0) {
      setSnippets(repoSnippets.sort((a, b) => (a.path || '').localeCompare(b.path || '')));
      if (!selectedSnippet && repoSnippets.length > 0) {
        setSelectedSnippet(repoSnippets[0]);
        setCode(repoSnippets[0].code);
      }
    }
  }, [allSnippets, id]);

  const fileTree = useMemo(() => buildFileTree(snippets), [snippets]);

  const handleSelectFile = useCallback((snippet: CodeSnippet) => {
    setSelectedSnippet(snippet);
    setCode(snippet.code);
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedSnippet) return;
    await updateSnippet(selectedSnippet.id, { code });
    setSelectedSnippet((prev) => (prev ? { ...prev, code } : null));
    setIsEditing(false);
  }, [selectedSnippet, code, updateSnippet]);

  const handleDeleteRepo = useCallback(async () => {
    if (!repo) return;
    await deleteRepo(repo.id);
    router.push('/');
  }, [repo, router]);

  const handleDeleteSnippet = useCallback(async () => {
    if (!selectedSnippet) return;
    await deleteSnippetFromContext(selectedSnippet.id);
    const updated = snippets.filter((s) => s.id !== selectedSnippet.id);
    setSnippets(updated);
    if (updated.length > 0) {
      setSelectedSnippet(updated[0]);
      setCode(updated[0].code);
    } else {
      setSelectedSnippet(null);
      setCode('');
    }
    setIsEditing(false);
  }, [selectedSnippet, snippets, deleteSnippetFromContext]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
  }, [code]);

  const handleDownload = useCallback(async () => {
    if (!repo || snippets.length === 0) return;
    setIsDownloading(true);

    try {
      const zip = new JSZip();

      for (const snippet of snippets) {
        const path = snippet.path || snippet.title;
        zip.file(path, snippet.code);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${repo.name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [repo, snippets]);

  if (!repo) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-[#0f1117]">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Repository not found</h2>
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const canExecute = selectedSnippet && ['html', 'css', 'javascript', 'typescript', 'python'].includes(selectedSnippet.language.toLowerCase());

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0f1117]">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <Link href="/" className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{repo.name}</h1>
        </div>

        {repo.description && (
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate hidden md:block">
            {repo.description}
          </span>
        )}

        <div className="flex-1" />

        {/* Tags */}
        <div className="hidden md:flex items-center gap-1.5">
          {repo.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs">
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={isDownloading || snippets.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all"
            title="Download as ZIP"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Zipping...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </>
            )}
          </button>

          {selectedSnippet && (
            <>
              <button onClick={handleCopy} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Copy code">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              {isEditing ? (
                <button onClick={handleSave} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition-colors">Save</button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Edit">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </>
          )}
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
          <div className="relative">
            <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete repository">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            {showDeleteConfirm && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Delete &quot;{repo.name}&quot;?</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">This will remove the repository and all {snippets.length} files.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Cancel</button>
                  <button onClick={handleDeleteRepo} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors">Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto shrink-0">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Files
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {snippets.length} files
              </span>
            </div>
          </div>
          <div className="py-1">
            {fileTree.map((node, i) => (
              <FileTreeNode
                key={i}
                node={node}
                depth={0}
                selectedPath={selectedSnippet?.path || null}
                onSelect={handleSelectFile}
              />
            ))}
          </div>
        </div>

        {/* Editor + Execution */}
        <div className="flex-1 flex overflow-hidden">
          {selectedSnippet ? (
            <>
              <div className={`${isSplit && canExecute ? 'w-3/5' : 'w-full'} border-r border-gray-200 dark:border-gray-700`}>
                {/* File info bar */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  {selectedSnippet.path && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {selectedSnippet.path}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    \u2022
                  </span>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded capitalize"
                    style={{
                      backgroundColor: `${getLanguageColor(selectedSnippet.language)}20`,
                      color: getLanguageColor(selectedSnippet.language),
                    }}
                  >
                    {selectedSnippet.language}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    \u2022 {formatFileSize(new Blob([selectedSnippet.code]).size)}
                  </span>
                  {canExecute && (
                    <button
                      onClick={() => setIsSplit(!isSplit)}
                      className={`ml-auto p-1 rounded transition-colors ${
                        isSplit ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={isSplit ? 'Editor only' : 'Split view'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </button>
                  )}
                </div>
                <CodeEditor
                  value={code}
                  language={selectedSnippet.language}
                  onChange={setCode}
                  readOnly={!isEditing}
                  height="calc(100% - 37px)"
                />
              </div>
              {isSplit && canExecute && (
                <div className="w-2/5">
                  <ExecutionPanel code={code} language={selectedSnippet.language} />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Select a file to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
