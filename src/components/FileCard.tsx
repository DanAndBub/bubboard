'use client';

import type { FileCardData } from '@/lib/types';

interface FileCardProps {
  file: FileCardData;
  onClick?: () => void;
}

const CATEGORY_ICONS: Record<FileCardData['category'], React.ReactNode> = {
  core: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  operations: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  protocols: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  memory: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  custom: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const CATEGORY_COLORS: Record<FileCardData['category'], string> = {
  core: '#3b82f6',
  operations: '#a78bfa',
  protocols: '#fbbf24',
  memory: '#34d399',
  custom: '#6b7280',
};

export default function FileCard({ file, onClick }: FileCardProps) {
  const color = CATEGORY_COLORS[file.category];
  const icon = CATEGORY_ICONS[file.category];

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-[#506880] bg-[#111827] card-hover relative overflow-hidden group"
      style={file.present ? {} : { opacity: 0.5 }}
    >
      {/* Present/absent indicator */}
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{
            color: file.present ? color : '#7a8a9b',
            backgroundColor: file.present ? `${color}18` : 'transparent',
            border: `1px solid ${file.present ? `${color}30` : '#506880'}`,
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs font-medium text-[#f1f5f9] truncate leading-tight">
            {file.name}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {file.present ? (
              <span className="text-xs text-[#34d399]">✓ found</span>
            ) : (
              <span className="text-xs text-[#f87171]">✗ missing</span>
            )}
            {file.content && (
              <span className="text-xs text-[#7a8a9b] ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                · click to view
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
