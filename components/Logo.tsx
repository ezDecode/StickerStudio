import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SkieVision Logo"
    >
      <defs>
        {/* Premium Silver/Zinc Gradient */}
        <linearGradient id="skieGradient" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#E4E4E7" /> 
          <stop offset="100%" stopColor="#71717A" />
        </linearGradient>
        
        {/* Deep Shadow for the 'Peel' effect */}
        <filter id="peelShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
        </filter>
      </defs>

      <g>
        {/* Abstract 'S' shape representing the sticker peel */}
        <path
          d="M 70 20 
             C 40 20, 30 40, 50 50 
             C 70 60, 60 80, 30 80"
          stroke="url(#skieGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Sticker peel effect at the bottom tail */}
        <path
          d="M 25 75 
             L 45 95 
             L 25 95 
             Z"
          fill="#FAFAFA"
          filter="url(#peelShadow)"
        />
        
        <path
          d="M 25 75 
             L 45 95 
             L 25 95 
             Z"
          fill="url(#skieGradient)"
        />
        
        {/* Inner Spark/Glint */}
        <circle cx="65" cy="25" r="4" fill="white" fillOpacity="0.8" />
      </g>
    </svg>
  );
};

export default Logo;