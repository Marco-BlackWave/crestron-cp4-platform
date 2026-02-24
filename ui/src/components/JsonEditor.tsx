import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, foldGutter, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

interface JsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  dark?: boolean;
  onValidationError?: (error: string | null) => void;
}

export default function JsonEditor({
  value,
  onChange,
  readOnly = false,
  height = "400px",
  dark = false,
  onValidationError,
}: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onValidationErrorRef = useRef(onValidationError);
  onChangeRef.current = onChange;
  onValidationErrorRef.current = onValidationError;

  const createState = useCallback(
    (doc: string) => {
      const extensions = [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        closeBrackets(),
        foldGutter(),
        history(),
        highlightSelectionMatches(),
        json(),
        linter(jsonParseLinter()),
        lintGutter(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          ...searchKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const text = update.state.doc.toString();
            onChangeRef.current?.(text);
            try {
              JSON.parse(text);
              onValidationErrorRef.current?.(null);
            } catch (e) {
              onValidationErrorRef.current?.(
                e instanceof Error ? e.message : "Invalid JSON"
              );
            }
          }
        }),
        EditorView.theme({
          "&": { height, fontSize: "13px" },
          ".cm-scroller": { overflow: "auto", fontFamily: "var(--font-mono, monospace)" },
        }),
      ];

      if (dark) extensions.push(oneDark);
      if (readOnly) extensions.push(EditorState.readOnly.of(true));

      return EditorState.create({ doc, extensions });
    },
    [dark, readOnly, height]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: createState(value),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only create on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // Recreate state when config changes (dark/readOnly/height)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const doc = view.state.doc.toString();
    view.setState(createState(doc));
  }, [createState]);

  return <div ref={containerRef} />;
}
