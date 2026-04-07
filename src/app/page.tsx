'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSnippets } from '@/context/SnippetsContext';
import Sidebar from '@/components/Sidebar';
import SearchBar from '@/components/SearchBar';
import CodeCard from '@/components/CodeCard';
import RepositoryCard from '@/components/RepositoryCard';
import UploadModal from '@/components/UploadModal';
import { useTheme } from '@/hooks/useTheme';

export default function Home() {
  const { snippets, repos, refresh } = useSnippets();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const filteredSnippets = useMemo(() => {
    let results = snippets;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      results = snippets.filter(
        (s) =>
          s.title.toLowerCase().includes(lowerQuery) ||
          s.code.toLowerCase().includes(lowerQuery) ||
          s.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
          s.language.toLowerCase().includes(lowerQuery)
      );
    }

    if (selectedTag) {
      results = results.filter((s) => s.tags.includes(selectedTag));
    }

    if (selectedLang) {
      results = results.filter((s) => s.language.toLowerCase() === selectedLang.toLowerCase());
    }

    return results;
  }, [snippets, searchQuery, selectedTag, selectedLang]);

  const filteredRepos = useMemo(() => {
    let results = repos;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      results = repos.filter(
        (r) =>
          r.name.toLowerCase().includes(lowerQuery) ||
          r.description.toLowerCase().includes(lowerQuery) ||
          r.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
          r.languages.some((l) => l.toLowerCase().includes(lowerQuery))
      );
    }

    if (selectedTag) {
      results = results.filter((r) => r.tags.includes(selectedTag));
    }

    if (selectedLang) {
      results = results.filter((r) => r.languages.some((l) => l.toLowerCase() === selectedLang.toLowerCase()));
    }

    return results;
  }, [repos, searchQuery, selectedTag, selectedLang]);

  const handleUploadClose = () => {
    setIsUploadOpen(false);
    refresh();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0f1117]">
      {/* Sidebar */}
      <Sidebar
        selectedTag={selectedTag}
        selectedLang={selectedLang}
        onTagSelect={setSelectedTag}
        onLangSelect={setSelectedLang}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Logo */}
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
            <SearchBar onSearch={setSearchQuery} />
          </div>

          {/* Actions - Right */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {searchQuery ? `Search: "${searchQuery}"` : 'Dashboard'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredRepos.length} repo{filteredRepos.length !== 1 ? 's' : ''} &bull; {filteredSnippets.length} snippet{filteredSnippets.length !== 1 ? 's' : ''}
                {selectedTag && ` \u2022 Tag: ${selectedTag}`}
                {selectedLang && ` \u2022 Language: ${selectedLang}`}
              </p>
            </div>
          </div>

          {/* Repositories Section */}
          {filteredRepos.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Repositories
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredRepos.map((repo) => (
                  <RepositoryCard key={repo.id} repo={repo} />
                ))}
              </div>
            </div>
          )}

          {/* Snippets Section */}
          <div>
            {filteredSnippets.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Snippets
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSnippets.map((snippet) => (
                    <CodeCard key={snippet.id} snippet={snippet} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Empty State */}
          {filteredRepos.length === 0 && filteredSnippets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nothing here yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery ? 'Try a different search term' : 'Upload a file or folder to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Upload Code
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={handleUploadClose} />
    </div>
  );
}
