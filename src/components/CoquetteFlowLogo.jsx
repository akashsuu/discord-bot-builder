import React from 'react';

export default function CoquetteFlowLogo({ size = 28, className = '' }) {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 rounded-lg bg-[#181818] border border-[#303030] shadow-sm select-none ${className}`}
      style={{ width: size, height: size }}
      title="CoquetteFlow"
    >
      <svg
        width={Math.round(size * 0.65)}
        height={Math.round(size * 0.65)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sleek stylized fluid C curve matching the reference aesthetic */}
        <path
          d="M19 8.5C18.2 5.5 15.4 3.5 12 3.5C7.3 3.5 3.5 7.3 3.5 12C3.5 16.7 7.3 20.5 12 20.5C15.6 20.5 18.5 18.3 19.3 15C19.5 14.2 18.8 13.5 18 13.5C17.3 13.5 16.7 14 16.5 14.6C15.8 16.7 13.9 18 12 18C8.7 18 6 15.3 6 12C6 8.7 8.7 6 12 6C14.1 6 16 7.1 16.7 8.8C17 9.5 17.7 10 18.5 10C19.3 10 20 9.2 19 8.5Z"
          fill="#F5F5F5"
        />
        <circle cx="12" cy="12" r="2.2" fill="#FFFFFF" opacity="0.9" />
      </svg>
    </div>
  );
}
