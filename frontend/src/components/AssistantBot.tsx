import React, { useState, useEffect, useRef } from 'react';
import {
  ChatMessage,
  PurchaseProposal,
  TaskLifecycleEvent
} from '../types/index.js';
import { glyClient, GlyChatResponse, money, ProductCardData } from '../api/glyClient.js';
import { Markdown } from './Markdown.js';
import { PaliAvatar } from './GlyAvatar.js';
import {
  SendIcon,
  ShieldCheckIcon,
  InfoIcon,
  SparklesIcon,
  LockClosedIcon,
  SlidersIcon
} from './Icons.js';

interface AssistantBotProps {
  onProposalReceived: (proposal: PurchaseProposal) => void;
  activeProposal: PurchaseProposal | null;
  onTriggerApproval?: () => void;
  onOpenLimits?: () => void;
  isApproved?: boolean;
  onCelebrate?: () => void;
  compactMode?: boolean;
}

export const AssistantBot: React.FC<AssistantBotProps> = ({
  onProposalReceived,
  activeProposal,
  onTriggerApproval,
  onOpenLimits,
  isApproved,
  onCelebrate,
  compactMode = false
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'gly',
      content: "Hi! I'm Pali 👋\n\nI can find deals for you, prepare a purchase for you to approve, and answer questions about PayPal. What can I help with?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mascotMood, setMascotMood] = useState<'idle' | 'happy' | 'thinking' | 'celebrating'>('idle');
  const [activeTask, setActiveTask] = useState<TaskLifecycleEvent | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // follow new messages unless the user scrolled up to read
  const waitTimer = useRef<ReturnType<typeof setTimeout>>();

  // Scroll the chat box itself; scrollIntoView would scroll the whole page down.
  const scrollToBottom = () => {
    const el = scrollerRef.current;
    if (el && stickRef.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, activeTask]);

  // When payment is approved, Pali celebrates!
  useEffect(() => {
    if (isApproved) {
      setMascotMood('celebrating');
      onCelebrate?.();
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_celebrate_${Date.now()}`,
          sender: 'gly',
          content: "YAY! We did it! 🎉 Your payment went through!\n\n✓ The maximum price is locked down tight\n✓ Covered by PayPal 180-Day Buyer Protection\n✓ Receipt saved\n\nYou're completely protected! 🚀",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      const timer = setTimeout(() => setMascotMood('idle'), 5000);
      return () => clearTimeout(timer);
    }
  }, [isApproved, onCelebrate]);

  /**
   * Wire to GLY's Conversational Interface (REST/WebSocket handler)
   * Boundary rule: Pali communicates ONLY with GLY, never directly calling external LLMs or PayPal.
   */
  useEffect(() => {
    const unsubMessage = glyClient.onMessage((res: GlyChatResponse) => {
      setIsTyping(false);
      setActiveTask(null); // a reply (or an error) ends any "retrying…" status
      setMascotMood('happy');

      if (res.purchaseProposal) {
        onProposalReceived(res.purchaseProposal);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_pali_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sender: 'gly',
          content: res.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intent: res.intent,
          references: res.references,
          proposal: res.purchaseProposal,
          paymentResult: res.paymentResult,
          products: res.products
        } as ChatMessage
      ]);

      setTimeout(() => setMascotMood('idle'), 3000);
    });

    const unsubTask = glyClient.onTaskEvent((evt: TaskLifecycleEvent) => {
      setActiveTask(evt);
      if (evt.status === 'COMPLETED' || evt.status === 'FAILED') {
        setTimeout(() => setActiveTask(null), 4000);
      }
    });

    const onAsk = (e: Event) => handleSendRef.current((e as CustomEvent<string>).detail);
    window.addEventListener('pals:ask', onAsk);

    return () => {
      window.removeEventListener('pals:ask', onAsk);
      unsubMessage();
      unsubTask();
    };
  }, [onProposalReceived]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent) return;

    // Add user bubble
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);
    setMascotMood('thinking');
    stickRef.current = true;
    clearTimeout(waitTimer.current);
    waitTimer.current = setTimeout(() => setIsTyping(false), 60_000); // never show "typing" forever

    try {
      // Dispatches strictly to GLY's conversational gateway
      await glyClient.sendChatMessage(messageContent);
    } catch {
      setIsTyping(false);
      setMascotMood('idle');
    }
  };

  const handleSendRef = useRef(handleSendMessage);
  handleSendRef.current = handleSendMessage;

  const handleExplainBreakdown = () => {
    if (!activeProposal) {
      setMessages((prev) => [...prev, {
        id: `msg_pali_${Date.now()}`,
        sender: 'gly',
        content: "There's no offer to review yet. Ask me to find something, then press **Get this ready** on a result.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      return;
    }
    const { basePrice, discountApplied, shippingFee, taxes, totalPayable, currency } = activeProposal.pricingBreakdown;
    const sym = currency === 'INR' ? '₹' : '$';
    const explanation = `Here's the simple breakdown for the ${activeProposal.productTitle} from ${activeProposal.merchantName}:\n\n` +
      `- Price: ${sym}${basePrice.toFixed(2)}\n` +
      `- Discount: -${sym}${discountApplied.toFixed(2)}\n` +
      `- Shipping: ${shippingFee === 0 ? 'free' : `${sym}${shippingFee.toFixed(2)}`}\n` +
      `- Taxes: ${sym}${taxes.toFixed(2)}\n\n` +
      `**Total: ${sym}${totalPayable.toFixed(2)} ${currency}.**\n` +
      `Your approval covers exactly this amount: you can't be charged more.`;

    setMessages((prev) => [
      ...prev,
      {
        id: `msg_user_${Date.now()}`,
        sender: 'user',
        content: "Review this purchase cost breakdown",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: `msg_pali_${Date.now() + 1}`,
        sender: 'gly',
        content: explanation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setMascotMood('happy');
    setTimeout(() => setMascotMood('idle'), 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden ${
        compactMode
          ? 'border-0'
          : 'border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-card h-[75dvh] max-h-[640px] min-h-[460px]'
      }`}
    >
      {/* Bot Chat Header (only in full mode) */}
      {!compactMode && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-blue-50/30 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PaliAvatar size="md" mood={mascotMood} />
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight">Pali</h3>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950/70 text-fintech-bright dark:text-cyan-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Fintech Guide
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </p>
            </div>
          </div>


        </div>
      )}

      {/* Chat Messages List */}
      <div
        ref={scrollerRef}
        onScroll={() => {
          const el = scrollerRef.current;
          if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3.5"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-end space-x-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="shrink-0 mb-1">
                  <PaliAvatar size="sm" mood={isTyping ? 'thinking' : 'idle'} />
                </div>
              )}

              <div className={`max-w-[85%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-fintech-navy text-white rounded-br-xs shadow-sm font-medium'
                      : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-bl-xs shadow-xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : (
                    <Markdown text={msg.content} />
                  )}

                  {/* Grounded PayPal Citations */}
                  {msg.references && msg.references.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                      <span className="font-semibold text-fintech-bright dark:text-cyan-300 flex items-center space-x-1">
                        <InfoIcon className="w-3.5 h-3.5" />
                        <span>Sources</span>
                      </span>
                      {msg.references.map((ref, i) => (
                        <div key={i} className="bg-white/70 dark:bg-slate-900/70 px-2 py-1 rounded-lg text-[11px] border border-slate-200/50 dark:border-slate-800">
                          <strong>{ref.section.replace(/\D/g, '') || i + 1}.</strong> {ref.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(msg as ChatMessage & { products?: ProductCardData[] }).products?.length ? (
                  <ul className="space-y-2 pt-1">
                    {(msg as ChatMessage & { products?: ProductCardData[] }).products!.map((p, i) => (
                      <li key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{p.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{p.merchant}</p>
                          </div>
                          <span className="shrink-0 text-sm font-black text-fintech-bright">{money(p.price)}</span>
                        </div>
                        {p.highlights.length > 0 && (
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{p.highlights.slice(0, 3).join(' · ')}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={isTyping}
                            onClick={() => handleSendMessage(`Get the ${p.title} from ${p.merchant} ready`)}
                            className="text-xs font-bold bg-fintech-bright hover:bg-fintech-vibrant text-white px-3.5 py-1.5 rounded-full transition disabled:opacity-50"
                          >
                            Get this ready
                          </button>
                          {p.url && (
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-fintech-bright underline">
                              View on site
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Out-of-band asynchronous task activity indicator */}
        {activeTask && (
          <div className="mx-1 p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl flex items-center space-x-3 text-xs text-blue-950 dark:text-blue-100 animate-pulse">
            <div className="w-4 h-4 border-2 border-fintech-bright border-t-transparent rounded-full animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-bold uppercase tracking-wider text-[10px] text-fintech-bright dark:text-cyan-300">
                Working on it
              </span>
              <p className="truncate text-slate-700 dark:text-slate-300 text-[11px]">
                {activeTask.statusMessage || `Task ${activeTask.status}`}
              </p>
            </div>
            {activeTask.progressPercent !== undefined && (
              <span className="font-mono text-xs font-bold text-fintech-bright">
                {activeTask.progressPercent}%
              </span>
            )}
          </div>
        )}

        {/* Animated Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 text-slate-400">
            <div className="shrink-0">
              <PaliAvatar size="sm" mood="thinking" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-2xl rounded-bl-xs text-xs flex items-center space-x-1.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pali is typing</span>
              <span className="w-1.5 h-1.5 bg-fintech-bright rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-fintech-bright rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-fintech-bright rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

      </div>

      {/* Interactive Quick-Action Buttons */}
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-800 flex overflow-x-auto gap-2 scrollbar-none">
        <button
          onClick={handleExplainBreakdown}
          className="whitespace-nowrap text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-fintech-bright hover:text-fintech-bright px-3 py-1.5 rounded-full font-medium transition shadow-xs flex items-center space-x-1"
        >
          <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
          <span>Review this purchase</span>
        </button>

        <button
          onClick={() => onOpenLimits?.()}
          className="whitespace-nowrap text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-fintech-bright hover:text-fintech-bright px-3 py-1.5 rounded-full font-medium transition shadow-xs flex items-center space-x-1"
        >
          <SlidersIcon className="w-3.5 h-3.5 text-blue-500" />
          <span>Set a spending limit</span>
        </button>

        <button
          onClick={() => onTriggerApproval?.()}
          className="whitespace-nowrap text-xs bg-fintech-navy hover:bg-black text-white px-3 py-1.5 rounded-full font-medium transition shadow-xs flex items-center space-x-1"
        >
          <LockClosedIcon className="w-3.5 h-3.5 text-cyan-300" />
          <span>Go to approval</span>
        </button>

        <button
          onClick={() => handleSendMessage("What are PayPal's official buyer protection terms?")}
          className="whitespace-nowrap text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-fintech-bright hover:text-fintech-bright px-3 py-1.5 rounded-full font-medium transition shadow-xs flex items-center space-x-1"
        >
          <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
          <span>Buyer Protection</span>
        </button>
      </div>

      {/* Input box */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Pali anything or request a deal..."
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-fintech-bright transition"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className="bg-fintech-bright hover:bg-fintech-vibrant text-white p-2.5 rounded-full disabled:opacity-40 transition focus:outline-none focus:ring-2 focus:ring-fintech-bright shadow-pill"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
