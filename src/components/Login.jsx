import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function Login() {
  async function handleGoogleLogin() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  }

  return (
    <div
      style={{
        height: "100svh",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      {/* Логотип */}
      <div
        style={{
          marginBottom: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <svg viewBox="0 0 100 100" width="56" height="56" fill="none">
          <path
            d="M31 23 V77 H59"
            stroke="#F4F1EB"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M69 77 V23 H41"
            stroke="#FF8A3D"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              lineHeight: 1,
            }}
          >
            LOAD<span style={{ color: "var(--accent)" }}>LOG</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.32em",
              color: "var(--text-muted)",
              marginTop: 8,
              paddingLeft: "0.32em",
            }}
          >
            DAILY FREIGHT JOURNAL
          </div>
        </div>
      </div>

      {/* Картка */}
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: "32px 28px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            color: "var(--text-secondary)",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Sign in to track loads and profit across every trip.
        </p>

        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "13px 20px",
            background: "var(--bg-base)",
            border: "1px solid var(--border-hover)",
            borderRadius: "var(--radius-btn)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: 15,
            cursor: "pointer",
            transition:
              "border-color var(--transition), background var(--transition)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.background = "var(--accent-subtle)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-hover)";
            e.currentTarget.style.background = "var(--bg-base)";
          }}
        >
          {/* Google G */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            style={{ flexShrink: 0 }}
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* Футер */}
      <div
        style={{
          marginTop: 32,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-muted)",
          letterSpacing: "0.04em",
        }}
      >
        Your data stays yours.
      </div>
    </div>
  );
}
