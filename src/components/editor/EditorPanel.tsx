'use client';

import { useState } from 'react';
import MDViewer from './MDViewer';
import MDEditor from './MDEditor';

interface EditorPanelProps {
  path: string;
  content: string;
  fileHandle?: FileSystemFileHandle | null;
  onClose: () => void;
  onContentChange: (path: string, newContent: string) => void;
  onRescan?: () => void;
}

export default function EditorPanel({ path, content, fileHandle, onClose, onContentChange, onRescan }: EditorPanelProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[560px] lg:w-[640px] bg-[#111827] border-l border-[#506880] shadow-2xl flex flex-col transition-transform duration-200">
      {editing ? (
        <MDEditor
          path={path}
          content={content}
          fileHandle={fileHandle}
          onSave={(newContent) => {
            onContentChange(path, newContent);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
          onRescan={onRescan}
        />
      ) : (
        <MDViewer
          path={path}
          content={content}
          onEdit={() => setEditing(true)}
          onClose={onClose}
        />
      )}
    </div>
  );
}
