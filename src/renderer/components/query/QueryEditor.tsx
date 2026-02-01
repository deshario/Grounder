import { useState, useRef, useCallback, useEffect } from 'react'
import Editor, { type OnMount, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { Play, Loader2 } from 'lucide-react'
import { ipc } from '../../lib/ipc'
import { useTabStore } from '../../stores/tabStore'
import { toast } from '../../stores/toastStore'
import { QueryResults } from './QueryResults'
import type { QueryResult } from '@shared/types'

// Use local monaco-editor instead of CDN
loader.config({ monaco })

// Define custom theme with green strings
monaco.editor.defineTheme('grounder-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'string', foreground: '6A9955' },
    { token: 'string.sql', foreground: '6A9955' },
  ],
  colors: {}
})

interface QueryBlock {
  startLine: number
  endLine: number
  text: string
}

interface QueryEditorProps {
  tabId: string
  connectionId: string
}

export function QueryEditor({ tabId, connectionId }: QueryEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const query = useTabStore((state) => {
    const tab = state.tabs.find((t) => t.id === tabId)
    return tab?.type === 'query' ? tab.query : ''
  })
  const updateQueryTab = useTabStore((state) => state.updateQueryTab)

  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [queryBlocks, setQueryBlocks] = useState<QueryBlock[]>([])

  // Parse query blocks from editor content
  const parseQueryBlocks = useCallback((text: string): QueryBlock[] => {
    const blocks: QueryBlock[] = []
    const lines = text.split('\n')
    let currentBlock: string[] = []
    let startLine = 1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      if (trimmedLine) {
        if (currentBlock.length === 0) {
          startLine = i + 1
        }
        currentBlock.push(line)

        // Check if line ends with semicolon
        if (trimmedLine.endsWith(';')) {
          blocks.push({
            startLine,
            endLine: i + 1,
            text: currentBlock.join('\n').trim()
          })
          currentBlock = []
        }
      } else if (currentBlock.length > 0) {
        // Empty line - end current block if it has content
        blocks.push({
          startLine,
          endLine: i,
          text: currentBlock.join('\n').trim()
        })
        currentBlock = []
      }
    }

    // Handle remaining content
    if (currentBlock.length > 0) {
      blocks.push({
        startLine,
        endLine: lines.length,
        text: currentBlock.join('\n').trim()
      })
    }

    return blocks.filter(b => b.text.length > 0)
  }, [])

  // Update query blocks when content changes
  useEffect(() => {
    setQueryBlocks(parseQueryBlocks(query))
  }, [query, parseQueryBlocks])

  const runQueryBlock = useCallback(async (queryText: string) => {
    if (!queryText.trim()) return

    setExecuting(true)
    setError(null)
    setResult(null)

    try {
      const res = await ipc.query(connectionId, queryText)
      if (res.success && res.data) {
        setResult(res.data)
        if (res.data.rowCount !== undefined && res.data.rows.length === 0) {
          toast.success(`Query OK, ${res.data.rowCount} row(s) affected`)
        }
      } else {
        setError(res.error || 'Query failed')
        toast.error(res.error || 'Query failed')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Query failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setExecuting(false)
    }
  }, [connectionId])

  const executeCurrentBlock = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    // Check for selection first
    const selection = editor.getSelection()
    if (selection && !selection.isEmpty()) {
      const selectedText = editor.getModel()?.getValueInRange(selection) || ''
      runQueryBlock(selectedText)
      return
    }

    // Find block at cursor
    const position = editor.getPosition()
    if (!position) return

    const currentLine = position.lineNumber
    for (const block of queryBlocks) {
      if (currentLine >= block.startLine && currentLine <= block.endLine) {
        runQueryBlock(block.text)
        return
      }
    }

    // Fallback: run all
    runQueryBlock(editor.getValue())
  }, [queryBlocks, runQueryBlock])

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
      executeCurrentBlock()
    })
    editor.focus()
  }

  const handleEditorChange = (value: string | undefined) => {
    updateQueryTab(tabId, value || '')
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Editor with run buttons */}
      <div className="flex-1 min-h-[120px] relative">
        <Editor
          height="100%"
          defaultLanguage="sql"
          defaultValue={query}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="grounder-dark"
          loading=""
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { vertical: 'auto', horizontal: 'hidden' },
            folding: false,
            glyphMargin: true,
            lineDecorationsWidth: 16,
            lineNumbersMinChars: 3
          }}
        />

        {/* Run buttons for each query block */}
        {queryBlocks.map((block, idx) => (
          <button
            key={`${block.startLine}-${idx}`}
            onClick={() => runQueryBlock(block.text)}
            disabled={executing}
            className="absolute flex items-center justify-center rounded-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white z-10 opacity-80 hover:opacity-100"
            style={{
              top: `${(block.startLine - 1) * 19 + 11}px`,
              left: '8px',
              width: '18px',
              height: '18px'
            }}
            title="Run (⌘↵)"
          >
            {executing ? (
              <Loader2 className="w-[10px] h-[10px] animate-spin" />
            ) : (
              <Play className="w-[10px] h-[10px]" />
            )}
          </button>
        ))}
      </div>


      {/* Results */}
      <div className="flex-1 min-h-[150px] border-t border-white/10 bg-[#1e1e1e]">
        {error ? (
          <div className="p-3 text-red-400 text-xs font-mono">{error}</div>
        ) : result ? (
          <QueryResults result={result} />
        ) : (
          <div className="h-full flex items-center justify-center text-white/30 text-xs">
            Results will appear here
          </div>
        )}
      </div>
    </div>
  )
}
