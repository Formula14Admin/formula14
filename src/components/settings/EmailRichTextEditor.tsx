'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { useEffect, useCallback } from 'react'
import {
  IconBold, IconItalic, IconUnderline,
  IconH1, IconH2, IconLink, IconMinus,
  IconAlphabetLatin, IconCursorText,
} from '@tabler/icons-react'

const ACCENT = '#6BA3D6'

interface Props {
  content:   string
  onChange:  (html: string) => void
  onEditorReady?: (getHtml: () => string) => void
}

function ToolbarButton({
  active, onClick, title, children,
}: {
  active?:   boolean
  onClick:   () => void
  title:     string
  children:  React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        active
          ? 'text-white'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
      style={active ? { backgroundColor: ACCENT } : {}}
    >
      {children}
    </button>
  )
}

export default function EmailRichTextEditor({ content, onChange, onEditorReady }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener' } }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[280px] px-4 py-3 outline-none focus:outline-none',
      },
    },
  })

  // Sync external content changes (e.g. reset to default)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  const getHtml = useCallback(() => editor?.getHTML() ?? '', [editor])
  useEffect(() => { onEditorReady?.(getHtml) }, [getHtml, onEditorReady])

  if (!editor) return null

  function insertLink() {
    const url = window.prompt('Enter URL:', 'https://')
    if (!url) return
    editor.chain().focus().setLink({ href: url }).run()
  }

  function insertCtaButton() {
    const text = window.prompt('Button label:', 'View My Bookings →') ?? 'View My Bookings →'
    const url  = window.prompt('Button URL:', 'https://formula14.com.au/athlete/bookings') ?? '#'
    editor.chain().focus().insertContent(
      `<p><a data-cta="true" href="${url}">${text}</a></p>`
    ).run()
  }

  function insertDivider() {
    editor.chain().focus().setHorizontalRule().run()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50 px-2 py-1.5">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <IconBold size={13} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <IconItalic size={13} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <IconUnderline size={13} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-gray-200" />

        <ToolbarButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <IconH1 size={14} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <IconH2 size={14} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} title="Normal text">
          <IconAlphabetLatin size={13} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-gray-200" />

        {/* Text colour */}
        <label title="Text colour" className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-100">
          <IconCursorText size={13} />
          <input
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={e => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>

        <div className="mx-1 h-5 w-px bg-gray-200" />

        <ToolbarButton onClick={insertLink} title="Insert link" active={editor.isActive('link')}>
          <IconLink size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={insertCtaButton} title="Insert CTA button">
          <span className="text-[9px] font-black">CTA</span>
        </ToolbarButton>
        <ToolbarButton onClick={insertDivider} title="Insert divider">
          <IconMinus size={13} />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
