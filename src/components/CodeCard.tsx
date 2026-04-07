'use client';

import Link from 'next/link';
import { CodeSnippet, getLanguageIcon, getLanguageColor } from '@/lib/db';

interface CodeCardProps {
  snippet: CodeSnippet;
}

export default function CodeCard({ snippet }: CodeCardProps) {
  const langColor = getLanguageColor(snippet.language);
  const langIcon = getLanguageIcon(snippet.language);

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

  const previewCode = snippet.code.length > 120 ? snippet.code.slice(0, 120) + '...' : snippet.code;

  return (
    <Link href={`/view/${snippet.id}`} className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 overflow-hidden">
      {/* Language indicator */}
      <div className="h-1" style={{ backgroundColor: langColor }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: langColor }}
            >
              {langIcon}
            </span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[200px]">
              {snippet.title}
            </h3>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
            {formatDate(snippet.updatedAt)}
          </span>
        </div>

        {/* Code preview */}
        <pre className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-3 overflow-hidden font-mono leading-relaxed">
          {previewCode}
        </pre>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {snippet.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
          {snippet.tags.length > 4 && (
            <span className="px-2 py-0.5 text-gray-400 dark:text-gray-500 text-xs">
              +{snippet.tags.length - 4}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
