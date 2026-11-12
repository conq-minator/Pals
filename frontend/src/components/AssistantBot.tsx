import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, PurchaseProposal, TaskLifecycleEvent } from '../types/index.js';
import { glyClient, GlyChatResponse, money, ProductCardData } from '../api/glyClient.js';
import { Markdown } from './Markdown.js';
import { ShoppingBagIcon } from './Icons.js';
import { LogoMark } from './Logo.js';

type Msg = ChatMessage & { products?: ProductCardData[]; sources?: { n: number; title: string; url: string }[] };

const SUGGESTIONS = [
  'Find wireless earbuds under $100',
  'How do I pay with PayPal?',
  'How do PayPal refunds work?',
  'How do you pick the best deal?',
];

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const id = () => `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The chat. Only this box scrolls; the page never jumps. */
export const AssistantBot: React.FC<{ onProposalReceived: (p: PurchaseProposal) => void }> = ({ onProposalReceived }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [task, setTask] = useState<TaskLifecycleEvent | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // follow new messages unless the user scrolled up to read
  const waitTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const offMsg = glyClient.onMessage((res: GlyChatResponse) => {
      setWaiting(false);
      if (res.purchaseProposal) onProposalReceived(res.purchaseProposal);
      setMessages((prev) => [
        ...prev,
        {
          id: id(),
          sender: 'gly',
          content: res.replyText,
          timestamp: now(),
          intent: res.intent,
          products: res.products,
          sources: res.references?.map((r, i) => ({ n: Number(r.section.replace(/\D/g, '')) || i + 1, title: r.title, url: r.url }))
        }
      ]);
    });
    const offTask = glyClient.onTaskEvent((evt) => {
      setTask(evt.status === 'COMPLETED' || evt.status === 'FAILED' ? null : evt);
    });
    return () => {
      offMsg();
      offTask();
    };
  }, [onProposalReceived]);

  // Scroll the chat box itself (scrollIntoView would scroll the whole page).
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, waiting, task]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    stick.current = true;
    setMessages((prev) => [...prev, { id: id(), sender: 'user', content: t, timestamp: now() }]);
    setInput('');
    setWaiting(true);
    clearTimeout(waitTimer.current);
    waitTimer.current = setTimeout(() => setWaiting(false), 60_000); // never spin forever
    void glyClient.sendChatMessage(t);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <LogoMark className="h-9 w-9" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">PALS assistant</h2>
          <p className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400">Finds deals and answers PayPal questions</p>
        </div>
      </header>

      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md py-6 text-center">
            <p className="text-base font-semibold text-slate-900 dark:text-white">Hi, how can I help?</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              I can find deals, prepare a purchase for you to approve, and answer questions about PayPal.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 transition hover:border-fintech-bright hover:text-fintech-bright dark:border-slate-700 dark:text-slate-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} onPick={(p) => send(`Get the ${p.title} from ${p.merchant} ready`)} disabled={waiting} />
        ))}

        {(waiting || task) && (
          <div className="flex items-center gap-2 pl-1 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fintech-bright" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fintech-bright [animation-delay:0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fintech-bright [animation-delay:0.3s]" />
            </span>
            <span className="truncate">{task?.statusMessage || 'Thinking…'}</span>
          </div>
        )}
      </div>

      <form
        className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">Message PALS</label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a product or PayPal…"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-fintech-bright focus:outline-none focus:ring-2 focus:ring-fintech-bright/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fintech-bright text-white transition hover:bg-fintech-vibrant disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 16V4M5 9l5-5 5 5" /></svg>
        </button>
      </form>
    </section>
  );
};

const MessageBubble: React.FC<{ msg: Msg; onPick: (p: ProductCardData) => void; disabled: boolean }> = ({ msg, onPick, disabled }) => {
  const user = msg.sender === 'user';
  const [showSources, setShowSources] = useState(false);
  const error = msg.intent === 'INTENT_ERROR' || msg.intent === 'INTENT_PAYMENT_FAILED';
  return (
    <div className={`flex ${user ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[92%] sm:max-w-[80%] ${user ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            user
              ? 'rounded-br-md bg-fintech-navy text-white'
              : error
              ? 'rounded-bl-md border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100'
              : 'rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
          }`}
        >
          {user ? <p className="whitespace-pre-wrap break-words">{msg.content}</p> : <Markdown text={msg.content} onCite={() => setShowSources(true)} />}
        </div>

        {msg.products && msg.products.length > 0 && (
          <ul className="mt-1 w-full space-y-2">
            {msg.products.map((p, i) => (
              <li key={i} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{p.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{p.merchant}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">{money(p.price)}</p>
                </div>
                {p.highlights.length > 0 && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{p.highlights.slice(0, 3).join(' · ')}</p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(p)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-fintech-bright px-3 py-1.5 text-xs font-medium text-white transition hover:bg-fintech-vibrant disabled:opacity-50"
                  >
                    <ShoppingBagIcon className="h-3.5 w-3.5" />
                    Get this ready
                  </button>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 underline hover:text-fintech-bright dark:text-slate-400">
                      View on site
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {msg.sources && msg.sources.length > 0 && (
          <div className="px-1 text-xs text-slate-500 dark:text-slate-400">
            <button type="button" onClick={() => setShowSources((v) => !v)} className="underline-offset-2 hover:underline">
              {showSources ? 'Hide sources' : `Sources (${msg.sources.length})`}
            </button>
            {showSources && (
              <ol className="mt-1 space-y-0.5">
                {msg.sources.map((s) => (
                  <li key={s.n}>
                    <span className="font-semibold">{s.n}.</span>{' '}
                    {/^https?:\/\//.test(s.url) ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-fintech-bright hover:underline">{s.title}</a>
                    ) : (
                      s.title
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        <span className={`px-1 text-[10px] text-slate-400 ${user ? 'text-right' : ''}`}>{msg.timestamp}</span>
      </div>
    </div>
  );
};
