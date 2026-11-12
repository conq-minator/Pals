import React, { useState } from 'react';
import { PurchaseProposal } from '../types/index.js';
import { PaliAvatar } from './GlyAvatar.js';
import { AssistantBot } from './AssistantBot.js';

interface PaliFloatingHelperProps {
  onProposalReceived: (proposal: PurchaseProposal) => void;
  activeProposal: PurchaseProposal | null;
  onTriggerApproval?: () => void;
  onOpenLimits?: () => void;
  isApproved?: boolean;
  onCelebrate?: () => void;
}

export const PaliFloatingHelper: React.FC<PaliFloatingHelperProps> = ({
  onProposalReceived,
  activeProposal,
  onTriggerApproval,
  onOpenLimits,
  isApproved,
  onCelebrate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setHasUnread(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Floating Chat Panel */}
      {isOpen && (
        <div className="mb-4 w-[90vw] sm:w-[400px] h-[580px] max-h-[82vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header Bar with close */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-fintech-deep via-fintech-bright to-fintech-cyan text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PaliAvatar size="sm" mood={isApproved ? 'celebrating' : 'happy'} />
              <div>
                <h4 className="font-black text-sm tracking-tight text-white leading-none">Pali Assistant</h4>
                <p className="text-[10px] text-cyan-200 mt-0.5">Your personal fintech guide</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white text-xs font-bold transition"
              aria-label="Minimize chat"
            >
              ✕
            </button>
          </div>

          {/* Assistant Bot conversation core */}
          <div className="flex-1 overflow-hidden">
            <AssistantBot
              onProposalReceived={onProposalReceived}
              activeProposal={activeProposal}
              onTriggerApproval={onTriggerApproval}
              onOpenLimits={onOpenLimits}
              isApproved={isApproved}
              onCelebrate={onCelebrate}
              compactMode={true}
            />
          </div>
        </div>
      )}

      {/* Floating Trigger Bubble */}
      <button
        onClick={toggleOpen}
        className="group relative flex items-center space-x-2.5 bg-white dark:bg-slate-900 hover:bg-blue-50/80 dark:hover:bg-slate-800 p-2 pr-4 rounded-full shadow-2xl border-2 border-fintech-bright transition-all transform hover:scale-105 active:scale-95 focus:outline-none"
        aria-label="Open Pali Assistant"
      >
        <PaliAvatar size="md" mood={isApproved ? 'celebrating' : 'idle'} />

        <div className="text-left hidden sm:block">
          <div className="flex items-center space-x-1">
            <span className="font-black text-xs text-slate-900 dark:text-white">Pali</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block leading-tight">
            {isOpen ? 'Click to minimize' : 'Ask me anything'}
          </span>
        </div>

        {/* Notification indicator dot */}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-900 font-bold text-[9px] rounded-full flex items-center justify-center shadow-xs animate-bounce">
            !
          </span>
        )}
      </button>
    </div>
  );
};

