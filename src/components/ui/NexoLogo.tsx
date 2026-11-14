interface NexoLogoProps {
  className?: string;
  size?: number;
}

export function NexoLogo({ className = '', size = 32 }: NexoLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="34"
        height="34"
        rx="10"
        fill="#126A64"
        fillOpacity="0.16"
        stroke="#75D5C4"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      {/* Connecting network edges */}
      <path
        d="M10 25V11L26 25V11"
        stroke="#75D5C4"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 18H26"
        stroke="#B78331"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
        strokeLinecap="round"
      />
      {/* Connected nodes */}
      <circle cx="10" cy="11" r="3" fill="#75D5C4" />
      <circle cx="10" cy="25" r="3" fill="#FFFFFF" />
      <circle cx="26" cy="11" r="3" fill="#FFFFFF" />
      <circle cx="26" cy="25" r="3" fill="#E0AC52" />
      <circle cx="18" cy="18" r="2.6" fill="#80263C" stroke="#FFFFFF" strokeWidth="1.2" />
    </svg>
  );
}
