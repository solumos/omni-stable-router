export function Logo({ className = "w-8 h-8", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* White twisted arrows on transparent background */}
      <g>
        {/* Top arrow - white */}
        <path
          d="M2 6 Q12 6 18 11 L18 7 L22 12 L18 17 L18 13 Q10 8 2 8 Z"
          fill="white"
        />
        
        {/* Bottom arrow - white with slight opacity */}
        <path
          d="M22 18 Q12 18 6 13 L6 17 L2 12 L6 7 L6 11 Q14 16 22 16 Z"
          fill="white"
          opacity="0.85"
        />
      </g>
    </svg>
  )
}

export function LogoAnimated({ className = "w-8 h-8", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* White animated twisted arrows */}
      <g>
        {/* Top arrow with animation */}
        <path
          d="M2 6 Q12 6 18 11 L18 7 L22 12 L18 17 L18 13 Q10 8 2 8 Z"
          fill="white"
        >
          <animate
            attributeName="opacity"
            values="1; 0.7; 1"
            dur="3s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0.5,0; 0,0"
            dur="4s"
            repeatCount="indefinite"
          />
        </path>
        
        {/* Bottom arrow with animation */}
        <path
          d="M22 18 Q12 18 6 13 L6 17 L2 12 L6 7 L6 11 Q14 16 22 16 Z"
          fill="white"
          opacity="0.85"
        >
          <animate
            attributeName="opacity"
            values="0.85; 1; 0.85"
            dur="3s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; -0.5,0; 0,0"
            dur="4s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </svg>
  )
}

export function LogoWithBackground({ className = "w-12 h-12", animated = false }) {
  const LogoComponent = animated ? LogoAnimated : Logo
  
  return (
    <div className={`p-2 rounded-lg bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 shadow-lg ${className}`}>
      <LogoComponent className="w-full h-full text-white" />
    </div>
  )
}