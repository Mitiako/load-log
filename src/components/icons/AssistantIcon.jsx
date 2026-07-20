// AssistantIcon.jsx
// Анімована іконка AI-асистента для хедера — антена похитується,
// праве око зрідка "моргає". Анімації через CSS keyframes (inline
// style не підтримує @keyframes напряму, тому вбудовуємо <style>).
export function AssistantIcon({ size = 20, ...rest }) {
  return (
    <>
      <style>{`
        @keyframes antenna-rock {
          0%, 100% { transform: rotate(-45deg); }
          50% { transform: rotate(45deg); }
        }
        @keyframes eye-wink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes assistant-glow {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(255,138,61,0.5)); }
          50% { filter: drop-shadow(0 0 6px rgba(255,138,61,0.9)); }
        }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: "assistant-glow 2.4s ease-in-out infinite",
        }}
        {...rest}
      >
        <rect x="5" y="7" width="14" height="10" rx="3" />
        <g
          style={{
            transformOrigin: "12px 7px",
            animation: "antenna-rock 2.4s ease-in-out infinite",
          }}
        >
          <path d="M12 7V4" />
          <circle cx="12" cy="3" r="1" />
        </g>
        <circle cx="9" cy="12" r="1" />
        <circle
          cx="15"
          cy="12"
          r="1"
          style={{
            transformOrigin: "15px 12px",
            animation: "eye-wink 4s ease-in-out infinite",
          }}
        />
        <path d="M9.5 15c.8.7 1.6 1 2.5 1s1.7-.3 2.5-1" />
        <path d="M20 6v2" />
        <path d="M19 7h2" />
        <path d="M18.5 4.5l.7.7" />
        <path d="M20.8 4.5l-.7.7" />
      </svg>
    </>
  );
}
