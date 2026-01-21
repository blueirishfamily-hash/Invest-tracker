export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      
      {/* Middle circle */}
      <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      
      {/* Inner circle */}
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      
      {/* Unaligned connecting lines */}
      {/* Line from outer to middle - offset left */}
      <line x1="5" y1="12" x2="7.5" y2="12" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Line from middle to inner - offset right */}
      <line x1="16.5" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Line from outer top to middle - offset */}
      <line x1="12" y1="2" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Line from middle bottom to inner - offset */}
      <line x1="12" y1="17.5" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
