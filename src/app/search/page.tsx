'use client';

import { Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getLanguageIcon, getLanguageColor } from '@/lib/db';
import { useSnippets } from '@/context/SnippetsContext';
import SearchBar from '@/components/SearchBar';
import { useTheme } from '@/hooks/useTheme';

function SearchContent() {
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const { snippets } = useSnippets();
  const query = searchParams.get('q') || '';

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return snippets.filter(
      (s) =>
        s.title.toLowerCase().includes(lowerQuery) ||
        s.code.toLowerCase().includes(lowerQuery) ||
        s.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
        s.language.toLowerCase().includes(lowerQuery)
    );
  }, [query, snippets]);

  const highlightCode = (code: string, searchQuery: string) => {
    if (!searchQuery.trim()) return code.slice(0, 150);
    const index = code.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (index === -1) return code.slice(0, 150);

    const start = Math.max(0, index - 40);
    const end = Math.min(code.length, index + searchQuery.length + 40);
    const before = code.slice(start, index);
    const match = code.slice(index, index + searchQuery.length);
    const after = code.slice(index + searchQuery.length, end);

    return (
      <>
        {start > 0 && '...'}
        {before}
        <mark className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100 rounded px-0.5">
          {match}
        </mark>
        {after}
        {end < code.length && '...'}
      </>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0f1117]">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">{'</>'}</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 hidden sm:block">
            MyCode Lab
          </span>
        </Link>

        {/* Search - Centered */}
        <div className="flex-1 flex justify-center">
          <SearchBar initialValue={query} />
        </div>

        {/* Actions - Right */}
        <div className="flex items-center gap-2 shrink-0">
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
        </div>
      </header>

      {/* Results */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Search Results
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {query ? (
              <>
                Found <span className="font-semibold text-gray-700 dark:text-gray-300">{results.length}</span> result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
              </>
            ) : (
              'Enter a search term to find code snippets'
            )}
          </p>

          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((snippet) => {
                const langColor = getLanguageColor(snippet.language);
                const langIcon = getLanguageIcon(snippet.language);

                return (
                  <Link
                    key={snippet.id}
                    href={`/view/${snippet.id}`}
                    className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all overflow-hidden"
                  >
                    <div className="h-1" style={{ backgroundColor: langColor }} />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold text-white"
                          style={{ backgroundColor: langColor }}
                        >
                          {langIcon}
                        </span>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {snippet.title}
                        </h3>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto capitalize">
                          {snippet.language}
                        </span>
                      </div>

                      {/* Highlighted code snippet */}
                      <pre className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 font-mono leading-relaxed overflow-x-auto">
                        {highlightCode(snippet.code, query)}
                      </pre>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
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
                  </Link>
                );
              })}
            </div>
          ) : query ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                No results found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Try different keywords or browse your dashboard
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function SearchLoading() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0f1117]">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white text-sm font-bold">{'</>'}</span>
        </div>
        <div className="flex-1 max-w-2xl h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500">Loading search...</div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
