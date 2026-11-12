import React from 'react';

export interface PaliAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  mood?: 'idle' | 'happy' | 'thinking' | 'celebrating';
  className?: string;
  showSpeechBubble?: boolean;
  speechText?: string;
}

export const PaliAvatar: React.FC<PaliAvatarProps> = ({
  size = 'md',
  mood = 'idle',
  className = '',
  showSpeechBubble = false,
  speechText = "Hi, I'm Pali 👋 I'll keep your agent payments safe"
}) => {
  const sizeMap = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-18 h-18',
    xl: 'w-26 h-26',
    hero: 'w-36 h-36 sm:w-40 sm:h-40'
  };

  const eyeSize = {
    sm: 'w-2.5 h-3',
    md: 'w-3 h-4',
    lg: 'w-4 h-5.5',
    xl: 'w-5.5 h-7.5',
    hero: 'w-7 h-9'
  };

  const blushSize = {
    sm: 'w-2.5 h-1.5',
    md: 'w-3.5 h-2',
    lg: 'w-5 h-2.5',
    xl: 'w-7 h-3.5',
    hero: 'w-9 h-4.5'
  };

  const mouthSize = {
    sm: 'w-2.5',
    md: 'w-3.5',
    lg: 'w-5',
    xl: 'w-7',
    hero: 'w-8'
  };

  return (
    <div className="relative inline-flex flex-col items-center group">
      {/* Speech Bubble */}
      {showSpeechBubble && (
        <div className="mb-3 px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-bold text-xs sm:text-sm shadow-xl border border-white/80 animate-bounce relative z-20 max-w-xs text-center">
          <span className="flex items-center justify-center space-x-1.5">
            <span>{speechText}</span>
          </span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-white/80" />
        </div>
      )}

      {/* Outer wrapper with gentle bobbing animation */}
      <div
        className={`relative select-none flex items-center justify-center transition-all ${
          mood === 'celebrating' ? 'animate-bounce' : 'animate-mascot-bob'
        }`}
      >
        {/* Adorable little antenna sprout with star on top */}
        <div className="absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
          <span className="text-amber-300 dark:text-cyan-300 text-xs sm:text-sm animate-pulse drop-shadow-sm">
            ✦
          </span>
          <div className="w-1 h-2 sm:h-2.5 bg-blue-300/80 dark:bg-cyan-200/80 rounded-full -mt-0.5" />
        </div>

        {/* Mascot Body Blob:
            Light mode: Deep, velvety oceanic dark sapphire blue (#0A2540 to #001F3F) with silky cyan edge glow
            Dark mode: Bright luminous PayPal royal blue gradient (#009CDE to #0070E0) */}
        <div
          className={`relative rounded-[48%] flex items-center justify-center shadow-float transition-all ${sizeMap[size]} ${className} 
            bg-gradient-to-b from-[#0F355C] via-[#0A2540] to-[#04162B] dark:from-[#009CDE] dark:via-[#0070E0] dark:to-[#004DB3]
            border-[2.5px] border-cyan-400/30 dark:border-white/30`}
        >
          {/* Cute subtle ear-nub shapes on sides */}
          <div className="absolute -left-1 top-3 w-2.5 h-3 bg-[#0F355C] dark:bg-[#009CDE] rounded-full rotate-[-25deg] pointer-events-none" />
          <div className="absolute -right-1 top-3 w-2.5 h-3 bg-[#0F355C] dark:bg-[#009CDE] rounded-full rotate-[25deg] pointer-events-none" />

          {/* Soft outer glow aura */}
          <div className="absolute inset-0 rounded-[48%] bg-cyan-400/20 dark:bg-cyan-300/35 blur-md scale-105 pointer-events-none" />

          {/* Glossy top-left 3D highlight */}
          <div className="absolute top-2 left-3.5 w-1/3 h-1/4 rounded-full bg-white/35 dark:bg-white/45 blur-[1px] pointer-events-none" />

          {/* Mascot Chibi Face Details */}
          <div className="relative flex flex-col items-center justify-center w-full h-full pt-2">
            {/* Eyes & Cheeks Row */}
            <div className="flex items-center justify-between w-[58%] mb-1.5 relative">
              {/* LEFT EYE: Big, glassy anime/chibi eye with twin starry highlights */}
              <div className="relative flex flex-col items-center justify-center">
                <div
                  className={`bg-white dark:bg-slate-950 rounded-full animate-mascot-blink relative overflow-hidden shadow-inner ${eyeSize[size]}`}
                >
                  {/* Pupil gradient (deep blue in light mode, dark obsidian in dark mode) */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#003B73] to-[#001428] dark:from-slate-900 dark:to-black rounded-full" />

                  {/* Primary big glossy twinkle (top-right) */}
                  <div className="absolute top-0.5 right-0.5 w-[50%] h-[50%] rounded-full bg-white shadow-xs" />

                  {/* Secondary baby twinkle (bottom-left) for pure cuteness! */}
                  <div className="absolute bottom-0.5 left-0.5 w-[25%] h-[25%] rounded-full bg-white/80" />
                </div>

                {/* Soft glowing pastel pink blush cheek right under eye */}
                <div
                  className={`absolute -bottom-1 -left-1.5 bg-rose-400/90 rounded-full blur-[0.8px] shadow-sm ${blushSize[size]}`}
                />
              </div>

              {/* RIGHT EYE */}
              <div className="relative flex flex-col items-center justify-center">
                <div
                  className={`bg-white dark:bg-slate-950 rounded-full animate-mascot-blink relative overflow-hidden shadow-inner ${eyeSize[size]}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-[#003B73] to-[#001428] dark:from-slate-900 dark:to-black rounded-full" />
                  <div className="absolute top-0.5 right-0.5 w-[50%] h-[50%] rounded-full bg-white shadow-xs" />
                  <div className="absolute bottom-0.5 left-0.5 w-[25%] h-[25%] rounded-full bg-white/80" />
                </div>

                {/* Soft glowing pastel pink blush cheek */}
                <div
                  className={`absolute -bottom-1 -right-1.5 bg-rose-400/90 rounded-full blur-[0.8px] shadow-sm ${blushSize[size]}`}
                />
              </div>
            </div>

            {/* ADORABLE SWEET SMILE */}
            {mood === 'happy' || mood === 'celebrating' ? (
              // Open joyful happy mouth with tiny pink tongue
              <div className={`relative overflow-hidden bg-[#FF4081] rounded-b-full border border-white/30 h-2.5 sm:h-3 ${mouthSize[size]} -mt-0.5 shadow-xs`}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-1.5 bg-[#FF80AB] rounded-full" />
              </div>
            ) : mood === 'thinking' ? (
              // Tiny curious "o" mouth
              <div className="w-2 h-2 rounded-full border-2 border-white dark:border-slate-800 bg-[#FF80AB] -mt-0.5 animate-pulse" />
            ) : (
              // Sweet little kitten smile :3
              <div className="flex items-center justify-center -mt-0.5">
                <svg className={`h-2 sm:h-2.5 ${mouthSize[size]}`} viewBox="0 0 24 12" fill="none">
                  <path
                    d="M3 3 C 6 10, 11 10, 12 5 C 13 10, 18 10, 21 3"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="dark:stroke-slate-950"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Joyful Sparkle on happy/celebrating */}
          {(mood === 'happy' || mood === 'celebrating') && (
            <span className="absolute -top-1.5 -right-1.5 text-base animate-spin text-amber-300 drop-shadow">
              ✨
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Export GlyAvatar alias for backward compatibility
export const GlyAvatar = PaliAvatar;
