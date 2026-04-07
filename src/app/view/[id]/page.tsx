'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getLanguageIcon, getLanguageColor } from '@/lib/db';
import { useSnippets } from '@/context/SnippetsContext';
import CodeEditor from '@/components/CodeEditor';
import ExecutionPanel from '@/components/ExecutionPanel';
import { useTheme } from '@/hooks/useTheme';

export default function ViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { theme, toggleTheme } = useTheme();
  const { snippets, updateSnippet, deleteSnippet } = useSnippets();

  const snippet = useMemo(() => snippets.find((s) => s.id === id), [snippets, id]);
  const [code, setCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSplit, setIsSplit] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (snippet) {
      setCode(snippet.code);
    }
  }, [snippet]);

  const handleSave = useCallback(() => {
    if (!snippet) return;
    updateSnippet(snippet.id, { code });
    setIsEditing(false);
  }, [snippet, code, updateSnippet]);

  const handleDelete = useCallback(() => {
    if (!snippet) return;
    deleteSnippet(snippet.id);
    router.push('/');
  }, [snippet, router, deleteSnippet]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
  }, [code]);

  if (!snippet) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-[#0f1117]">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Snippet not found</h2>
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const langColor = getLanguageColor(snippet.language);
  const langIcon = getLanguageIcon(snippet.language);
  const canExecute = ['html', 'css', 'javascript', 'typescript', 'python'].includes(snippet.language.toLowerCase());

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0f1117]">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold text-white"
            style={{ backgroundColor: langColor }}
          >
            {langIcon}
          </span>
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">{snippet.title}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="capitalize">{snippet.language}</span>
              <span>\u2022</span>
              <span>Updated {new Date(snippet.updatedAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
        </div>

        {/* Tags - Centered */}
        <div className="flex-1 flex justify-center">
          <div className="hidden md:flex items-center gap-1.5">
            {snippet.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Actions - Right */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Toggle Split */}
          {canExecute && (
            <button
              onClick={() => setIsSplit(!isSplit)}
              className={`p-2 rounded-lg transition-colors ${
                isSplit
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={isSplit ? 'Show editor only' : 'Show split view'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          )}

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Copy code"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Edit/Save */}
          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Edit code"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Delete */}
          <div className="relative">
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete snippet"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            {showDeleteConfirm && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to delete this snippet?
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className={`${isSplit && canExecute ? 'w-3/5' : 'w-full'} border-r border-gray-200 dark:border-gray-700`}>
          <CodeEditor
            value={code}
            language={snippet.language}
            onChange={setCode}
            readOnly={!isEditing}
            height="100%"
          />
        </div>

        {/* Execution Panel */}
        {isSplit && canExecute && (
          <div className="w-2/5">
            <ExecutionPanel code={code} language={snippet.language} />
          </div>
        )}
      </div>
    </div>
  );
}
