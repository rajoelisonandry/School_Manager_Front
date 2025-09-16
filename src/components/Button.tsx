'use client';

import React from 'react';

interface ButtonProps {
  text?: string;
  bgColor?: string;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const Button: React.FC<ButtonProps> = ({
  text = 'Generate',
  bgColor = 'bg-[#1C1A1C]',
  onClick,
  size = 'large',
}) => {
  const sizeClasses = {
    small: 'h-10 w-32 text-sm',
    medium: 'h-14 w-48 text-base',
    large: 'h-20 w-60 text-base',
  };

  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center gap-3 rounded-full ${bgColor} transition-all duration-500
        hover:bg-gradient-to-t hover:from-[var(--primary)] hover:to-[var(--secondary)]
        hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-4px_0_rgba(0,0,0,0.2),0_0_0_4px_rgba(255,255,255,0.2),0_0_180px_0_#9917FF]
        hover:-translate-y-0.5
        ${sizeClasses[size]}
      `}
    >
      <svg
        height={24}
        width={24}
        viewBox="0 0 24 24"
        className="transition-all duration-[800ms] fill-[#AAAAAA] group-hover:fill-white group-hover:scale-110"
      >
        <path d="M10,21.236,6.755,14.745.264,11.5,6.755,8.255,10,1.764l3.245,6.491L19.736,11.5l-6.491,3.245ZM18,21l1.5,3L21,21l3-1.5L21,18l-1.5-3L18,18l-3,1.5ZM19.333,4.667,20.5,7l1.167-2.333L24,3.5,21.667,2.333,20.5,0,19.333,2.333,17,3.5Z" />
      </svg>
      <span className="text-[#AAAAAA] font-semibold transition-colors duration-300 group-hover:text-white">
        {text}
      </span>
    </button>
  );
};

export default Button;
