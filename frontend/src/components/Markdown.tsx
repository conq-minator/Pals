import React from 'react';

/**
 * Renders the small Markdown subset the assistant uses: paragraphs, "- " and "1. " lists, **bold**,
 * *italic*, `code`, links and [1] citations. Builds React elements (never innerHTML), so
 * text from the server can't inject markup.
 */
export const Markdown: React.FC<{ text: string; onCite?: (n: number) => void }> = ({ text, onCite }) => {
  const blocks = toBlocks(text);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.type === 'p') return <p key={i}>{inline(b.text, onCite)}</p>;
        if (b.type === 'ul')
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {b.items.map((it, j) => <li key={j}>{inline(it, onCite)}</li>)}
            </ul>
          );
        return (
            <ol key={i} className="list-decimal pl-5 space-y-1">
              {b.items.map((it, j) => <li key={j}>{inline(it, onCite)}</li>)}
            </ol>
          );
      })}
    </div>
  );
};

type Block = { type: 'p'; text: string } | { type: 'ul' | 'ol'; items: string[] };

function toBlocks(src: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ type: 'p', text: para.join('\n') });
    para = [];
  };
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (bullet || numbered) {
      flush();
      const type = bullet ? 'ul' : 'ol';
      const last = out[out.length - 1];
      const item = (bullet ?? numbered)![1];
      if (last && last.type === type) last.items.push(item);
      else out.push({ type, items: [item] });
    } else if (!line.trim() || /^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flush();
    } else if (heading) {
      flush();
      out.push({ type: 'p', text: `**${heading[1]}**` });
    } else {
      // A wrapped continuation of a list item stays in that item.
      const last = out[out.length - 1];
      if (!para.length && last && last.type !== 'p' && /^\s{2,}/.test(raw)) last.items[last.items.length - 1] += ' ' + line.trim();
      else para.push(line);
    }
  }
  flush();
  return out;
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[\d+\](?:\[\d+\])*|https?:\/\/[^\s)]+)/g;

function inline(text: string, onCite?: (n: number) => void): React.ReactNode[] {
  const parts = text.split(TOKEN).filter((p) => p !== '');
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    if (/^\[\d+\]/.test(p)) {
      return (
        <span key={i} className="whitespace-nowrap">
          {[...p.matchAll(/\[(\d+)\]/g)].map((m) => (
            <button
              key={m[1]}
              type="button"
              onClick={() => onCite?.(Number(m[1]))}
              className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-blue-100 px-1 align-text-top text-[10px] font-semibold text-blue-700 hover:bg-blue-200 dark:bg-blue-900/60 dark:text-blue-200"
              aria-label={`Source ${m[1]}`}
            >
              {m[1]}
            </button>
          ))}
        </span>
      );
    }
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="rounded bg-slate-200/70 px-1 text-[0.9em] dark:bg-slate-700">{p.slice(1, -1)}</code>;
    if (/^\*[^*]/.test(p) && p.endsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^https?:\/\//.test(p)) {
      return (
        <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-blue-700 underline dark:text-blue-300">
          {/paypal\.com/.test(p) ? 'Open PayPal' : p.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48)}
        </a>
      );
    }
    // Keep single line breaks inside a paragraph.
    return p.split('\n').map((seg, j, arr) => (
      <React.Fragment key={`${i}-${j}`}>
        {seg}
        {j < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  });
}
