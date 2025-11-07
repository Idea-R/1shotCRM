'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  editable = true,
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none min-h-[150px] px-4 py-3 text-gray-900 dark:text-white',
      },
    },
  });

  // Update editor content when prop changes (but only after mount)
  useEffect(() => {
    if (mounted && editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor, mounted]);

  if (!mounted || !editor) {
    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 min-h-[150px] px-4 py-3">
        <div className="text-gray-400 text-sm">{placeholder}</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500 relative">
      {editable && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-500' : ''
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-500' : ''
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-500' : ''
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-500' : ''
            }`}
            title="Numbered List"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

