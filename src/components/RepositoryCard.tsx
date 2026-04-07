'use client';

import Link from 'next/link';
import { Repository, formatFileSize, getLanguageColor } from '@/lib/db';

interface RepositoryCardProps {
  repo: Repository;
}

export default function RepositoryCard({ repo }: RepositoryCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Link href={`/repo/${repo.id}`} className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 overflow-hidden">
      {/* Top accent line */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Repo icon */}
            <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {repo.name}
            </h3>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
            {formatDate(repo.updatedAt)}
          </span>
        </div>

        {/* Description */}
        {repo.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
            {repo.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {repo.fileCount} files
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            {formatFileSize(repo.totalSize)}
          </span>
        </div>

        {/* Language bars */}
        {repo.languages.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
              {repo.languages.map((lang, i) => {
                const width = 100 / repo.languages.length;
                return (
                  <div
                    key={lang}
                    className="h-full rounded-full"
                    style={{
                      width: `${width}%`,
                      backgroundColor: getLanguageColor(lang),
                      marginLeft: i > 0 ? '2px' : '0',
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Languages + Tags */}
        <div className="flex flex-wrap gap-1.5">
          {repo.languages.slice(0, 4).map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs capitalize"
              style={{
                backgroundColor: `${getLanguageColor(lang)}20`,
                color: getLanguageColor(lang),
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getLanguageColor(lang) }} />
              {lang}
            </span>
          ))}
          {repo.tags.slice(0, 3).map((tag) => (
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
}
