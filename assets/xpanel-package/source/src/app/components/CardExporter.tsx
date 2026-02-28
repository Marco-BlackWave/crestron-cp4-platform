import React, { useCallback, useRef, useState } from "react";
import { Download, Code2, Copy, Check, FileCode2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/* ── Clipboard fallback for sandboxed iframes ── */
function copyToClipboard(text: string): boolean {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────────
   CardExporter — Standalone HTML export for
   Crestron HTML Joins / embedded panels.

   Captures a card's rendered DOM, inlines ALL
   computed styles, and emits a self-contained
   .html file with:
     • CSS custom properties for easy retheming
     • container-type: size for CSS-only resize
     • @container breakpoints at 3 tier heights
     • No external dependencies
   ───────────────────────────────────────────── */

/* ── Crestron-ready HTML shell ── */
function buildStandaloneHTML(
  cardHTML: string,
  inlinedCSS: string,
  cardId: string,
  width: number,
  height: number
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Crestron Card — ${cardId}</title>

<!-- ═══════════════════════════════════════════
     CRESTRON HTML JOIN — ${cardId.toUpperCase()}
     Generated: ${new Date().toISOString()}
     
     Resize: Set --card-w and --card-h on :root
     or resize the .crestron-card-root container.
     Container queries handle layout adaptation.
     ═══════════════════════════════════════════ -->

<style>
  /* ── Design Tokens (edit these for your panel) ── */
  :root {
    /* Card dimensions — change these to resize */
    --card-w: ${width}px;
    --card-h: ${height}px;

    /* Glass surface */
    --glass-bg: rgba(255, 255, 255, 0.07);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-hover: rgba(255, 255, 255, 0.12);

    /* Accent palette */
    --accent-amber: rgba(251, 191, 36, 1);
    --accent-amber-glow: rgba(251, 191, 36, 0.5);
    --accent-blue: rgba(59, 130, 246, 1);
    --accent-blue-glow: rgba(59, 130, 246, 0.35);

    /* Typography scale (cqi-based, scales with container) */
    --text-xs:   clamp(9px,  2.2cqi, 12px);
    --text-sm:   clamp(11px, 2.6cqi, 14px);
    --text-base: clamp(13px, 3cqi,   16px);
    --text-lg:   clamp(16px, 3.8cqi, 20px);
    --text-xl:   clamp(20px, 5cqi,   28px);
    --text-2xl:  clamp(24px, 6.5cqi, 36px);
    --text-3xl:  clamp(28px, 8cqi,   48px);

    /* Spacing scale */
    --space-1: clamp(2px, 0.5cqi, 4px);
    --space-2: clamp(4px, 1cqi,   8px);
    --space-3: clamp(6px, 1.5cqi, 12px);
    --space-4: clamp(8px, 2cqi,   16px);
    --space-5: clamp(12px, 3cqi,  20px);
    --space-6: clamp(16px, 4cqi,  24px);

    /* Border radius */
    --radius-sm: clamp(4px, 1cqi, 8px);
    --radius-md: clamp(8px, 2cqi, 12px);
    --radius-lg: clamp(12px, 3cqi, 16px);
    --radius-xl: clamp(16px, 4cqi, 20px);
  }

  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a0a14;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  /* ── Card Root — CSS-only Resizable ── */
  .crestron-card-root {
    width: var(--card-w);
    height: var(--card-h);
    container-type: size;
    container-name: card;

    /* Enable CSS resize handle for dev/preview */
    resize: both;
    overflow: hidden;

    /* Tier constraints */
    min-width: 200px;
    min-height: 280px;
    max-width: 800px;
    max-height: 900px;

    border-radius: var(--radius-xl);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  /* ── Container Query Tiers ── */
  /* Tier 1: Compact (≤ 420px height) */
  @container card (max-height: 420px) {
    .card-tier-adaptive {
      --tier: 1;
      --card-pad: var(--space-4);
      --header-gap: var(--space-2);
      --section-gap: var(--space-3);
    }
    .card-tier-expanded,
    .card-tier-full { display: none !important; }
  }

  /* Tier 2: Expanded (421px–600px height) */
  @container card (min-height: 421px) and (max-height: 600px) {
    .card-tier-adaptive {
      --tier: 2;
      --card-pad: var(--space-5);
      --header-gap: var(--space-3);
      --section-gap: var(--space-4);
    }
    .card-tier-full { display: none !important; }
  }

  /* Tier 3: Full (601px+ height) */
  @container card (min-height: 601px) {
    .card-tier-adaptive {
      --tier: 3;
      --card-pad: var(--space-6);
      --header-gap: var(--space-4);
      --section-gap: var(--space-5);
    }
  }

  /* ── Width-based container queries ── */
  @container card (max-width: 300px) {
    .card-tier-adaptive {
      --text-scale: 0.85;
    }
  }

  @container card (min-width: 500px) {
    .card-tier-adaptive {
      --text-scale: 1.1;
    }
  }

  /* ── Captured Styles ── */
  ${inlinedCSS}
</style>
</head>
<body>
  <div class="crestron-card-root">
    <div class="card-tier-adaptive" style="width:100%;height:100%;overflow:hidden;">
      ${cardHTML}
    </div>
  </div>

  <script>
    /* ═══ Crestron Digital/Analog/Serial Join Hooks ═══
       Replace these stubs with your CrComLib calls:
       
       CrComLib.subscribeState('b', '1', (value) => { ... });  // Digital
       CrComLib.subscribeState('n', '1', (value) => { ... });  // Analog
       CrComLib.subscribeState('s', '1', (value) => { ... });  // Serial
       
       CrComLib.publishEvent('b', '1', true);   // Send digital
       CrComLib.publishEvent('n', '1', 65535);   // Send analog
       CrComLib.publishEvent('s', '1', 'text');  // Send serial
    */

    // Example: Map analog join 1 to brightness slider
    // CrComLib.subscribeState('n', '1', (val) => {
    //   const pct = Math.round((val / 65535) * 100);
    //   document.querySelector('[data-join="brightness"]')?.setAttribute('data-value', pct);
    // });

    console.log('[Crestron Card] ${cardId} loaded — ${width}x${height}');
  </script>
</body>
</html>`;
}

/* ── Deep-clone with inlined computed styles ── */
function cloneWithStyles(source: Element): { html: string; css: string } {
  const styleMap = new Map<string, string>();
  let classCounter = 0;

  function processNode(el: Element): Element {
    const clone = el.cloneNode(false) as Element;
    const computed = window.getComputedStyle(el);

    // Generate a unique class
    const cls = `_c${classCounter++}`;
    clone.setAttribute("class", cls);

    // Capture key visual properties
    const props = [
      "display", "flex-direction", "align-items", "justify-content",
      "flex-wrap", "flex-grow", "flex-shrink", "flex-basis", "gap",
      "grid-template-columns", "grid-template-rows", "grid-auto-rows",
      "grid-column", "grid-row",
      "position", "top", "right", "bottom", "left", "z-index",
      "width", "height", "min-width", "min-height", "max-width", "max-height",
      "padding", "margin", "overflow",
      "border", "border-radius", "border-color", "border-width", "border-style",
      "background", "background-color", "background-image",
      "box-shadow", "opacity", "backdrop-filter",
      "color", "font-family", "font-size", "font-weight", "line-height",
      "letter-spacing", "text-align", "text-transform", "text-decoration",
      "white-space", "text-overflow",
      "transition", "transform", "cursor",
      "fill", "stroke", "stroke-width",
    ];

    const rules: string[] = [];
    for (const prop of props) {
      const val = computed.getPropertyValue(prop);
      if (val && val !== "none" && val !== "normal" && val !== "auto" && val !== "0px" && val !== "0s") {
        rules.push(`  ${prop}: ${val};`);
      }
    }

    if (rules.length > 0) {
      styleMap.set(`.${cls}`, `{\n${rules.join("\n")}\n}`);
    }

    // Process children
    for (const child of el.children) {
      clone.appendChild(processNode(child));
    }

    // Preserve text nodes
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        clone.appendChild(document.createTextNode(node.textContent));
      }
    }

    return clone;
  }

  const cloned = processNode(source);
  const css = Array.from(styleMap.entries())
    .map(([sel, rules]) => `${sel} ${rules}`)
    .join("\n\n");

  return {
    html: (cloned as HTMLElement).outerHTML,
    css,
  };
}

/* ── Download helper ── */
function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

/* ═══════════════════════════════════════════════
   Export Button — attaches to any card wrapper
   ═══════════════════════════════════════════════ */

interface CardExportButtonProps {
  cardId: string;
  cardRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

export function CardExportButton({ cardId, cardRef, className = "" }: CardExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHTML, setPreviewHTML] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const generateHTML = useCallback(() => {
    const el = cardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const { html, css } = cloneWithStyles(el);
    return buildStandaloneHTML(html, css, cardId, Math.round(rect.width), Math.round(rect.height));
  }, [cardId, cardRef]);

  const handleDownload = useCallback(() => {
    const result = generateHTML();
    if (result) {
      downloadFile(result, `crestron-${cardId}-card.html`);
      setShowMenu(false);
    }
  }, [generateHTML, cardId]);

  const handleCopySource = useCallback(async () => {
    const result = generateHTML();
    if (result) {
      copyToClipboard(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generateHTML]);

  const handlePreview = useCallback(() => {
    const result = generateHTML();
    if (result) {
      setPreviewHTML(result);
      setShowPreview(true);
      setShowMenu(false);
    }
  }, [generateHTML]);

  return (
    <>
      <div className={`relative ${className}`} ref={menuRef}>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowMenu(!showMenu)}
          className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.12] transition-all"
          title="Export as Crestron HTML"
        >
          <Code2 className="w-3.5 h-3.5" />
        </motion.button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1.5 z-[100] w-52 rounded-xl bg-[rgba(10,10,18,0.97)] border border-white/[0.1] shadow-2xl shadow-black/60 overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <span className="text-white/25 text-[9px] tracking-widest uppercase">
                  Crestron Export
                </span>
              </div>

              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.06] transition-all group"
              >
                <Download className="w-3.5 h-3.5 text-blue-400/70 group-hover:text-blue-400 transition-colors" />
                <div className="text-left">
                  <span className="group-hover:text-white/80 transition-colors block">
                    Download HTML
                  </span>
                  <span className="text-white/20 text-[9px]">
                    Standalone .html file
                  </span>
                </div>
              </button>

              <div className="h-px bg-white/[0.04] mx-3" />

              <button
                onClick={handleCopySource}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.06] transition-all group"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 transition-colors" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-400/70 group-hover:text-amber-400 transition-colors" />
                )}
                <div className="text-left">
                  <span className="group-hover:text-white/80 transition-colors block">
                    {copied ? "Copied!" : "Copy Source"}
                  </span>
                  <span className="text-white/20 text-[9px]">
                    HTML to clipboard
                  </span>
                </div>
              </button>

              <div className="h-px bg-white/[0.04] mx-3" />

              <button
                onClick={handlePreview}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.06] transition-all group"
              >
                <FileCode2 className="w-3.5 h-3.5 text-cyan-400/70 group-hover:text-cyan-400 transition-colors" />
                <div className="text-left">
                  <span className="group-hover:text-white/80 transition-colors block">
                    Preview Source
                  </span>
                  <span className="text-white/20 text-[9px]">
                    View generated HTML
                  </span>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Source Preview Modal ── */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-[90vw] max-w-4xl h-[80vh] rounded-2xl bg-[rgba(10,10,18,0.98)] border border-white/[0.1] shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] shrink-0">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-cyan-400/60" />
                  <span className="text-white/60 text-xs tracking-widest uppercase">
                    Generated HTML — {cardId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      copyToClipboard(previewHTML);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/50 text-[11px] hover:bg-white/[0.1] transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Copy All"}
                  </motion.button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto p-5 text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap font-mono">
                {previewHTML}
              </pre>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════
   Exportable Card Wrapper — wraps any card with
   container-type: size + export button
   ═══════════════════════════════════════════════ */

interface ExportableCardProps {
  cardId: string;
  children: React.ReactNode;
  showExport?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ExportableCard({ cardId, children, showExport = true, className = "", style }: ExportableCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`relative group/export ${className}`}
      style={{
        containerType: "size",
        containerName: "card",
        ...style,
      }}
    >
      <div ref={contentRef} className="w-full h-full">
        {children}
      </div>

      {/* Export button — appears on hover */}
      {showExport && (
        <div className="absolute top-2 right-2 z-30 opacity-0 group-hover/export:opacity-100 transition-opacity duration-200">
          <CardExportButton cardId={cardId} cardRef={contentRef} />
        </div>
      )}
    </div>
  );
}