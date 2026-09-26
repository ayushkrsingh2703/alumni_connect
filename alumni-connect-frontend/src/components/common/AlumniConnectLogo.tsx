import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'auto';
  showSubtitle?: boolean;
  className?: string;
}

export const LinkoraLogo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'auto',
  showSubtitle = true,
  className = ''
}) => {
  // Size metrics
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric Mark: LINK (Nodes & Interlocking Ring) + AURA (Radiant Gradient) */}
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 via-indigo-600 to-teal-500 p-0.5 shadow-md border border-white/20 dark:border-slate-700/60 ${iconSizes[size]}`}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Linked Interlocking Orbital Aura Loops */}
          <path
            d="M8 18C8 12.4772 12.4772 8 18 8C23.5228 8 28 12.4772 28 18"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="1 1"
            className="opacity-40"
          />
          {/* Main Link Arc */}
          <path
            d="M6 18C6 11.3726 11.3726 6 18 6C24.6274 6 30 11.3726 30 18C30 24.6274 24.6274 30 18 30"
            stroke="url(#linkora-aura)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Central Connecting Diamond / Aura Core */}
          <path
            d="M18 10L23 18L18 26L13 18L18 10Z"
            fill="#FFFFFF"
            className="drop-shadow-sm"
          />
          {/* Intelligent Node Connections */}
          <circle cx="10" cy="18" r="2.5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.2" />
          <circle cx="26" cy="18" r="2.5" fill="#2DD4BF" stroke="#FFFFFF" strokeWidth="1.2" />
          <circle cx="18" cy="18" r="2" fill="#6366F1" />

          <defs>
            <linearGradient id="linkora-aura" x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="0.5" stopColor="#818CF8" />
              <stop offset="1" stopColor="#34D399" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typography: LINKORA + Connect. Mentor. Collaborate. Grow. */}
      <div className="flex flex-col">
        <div className={`font-black tracking-tight leading-none flex items-center ${textSizes[size]}`}>
          <span
            className={
              variant === 'light'
                ? 'text-slate-900 tracking-tight'
                : variant === 'dark'
                ? 'text-white tracking-tight'
                : 'text-slate-900 dark:text-white transition-colors duration-200 tracking-tight'
            }
          >
            LINK
          </span>
          <span
            className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 dark:from-blue-400 dark:via-indigo-400 dark:to-teal-400 tracking-tight"
          >
            ORA
          </span>
        </div>
        {showSubtitle && (
          <span
            className={
              variant === 'light'
                ? 'text-[8.5px] font-bold tracking-wider uppercase mt-0.5 text-slate-500'
                : variant === 'dark'
                ? 'text-[8.5px] font-bold tracking-wider uppercase mt-0.5 text-slate-400'
                : 'text-[8.5px] font-bold tracking-wider uppercase mt-0.5 text-slate-500 dark:text-slate-400 transition-colors duration-200'
            }
          >
            Connect. Mentor. Collaborate. Grow.
          </span>
        )}
      </div>
    </div>
  );
};

export const AlumniConnectLogo = LinkoraLogo;

