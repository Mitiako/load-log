// Settings.jsx
import Header from "./Header";
import { useLanguage } from "../i18n/useLanguage";

export default function Settings({ onBack }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      style={{
        height: "100svh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        title={t("settings_title")}
        right={
          <button
            onClick={onBack}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {t("common_back")}
          </button>
        }
      />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Language */}
        <div className="glass" style={{ padding: 16 }}>
          <div className="label" style={{ marginBottom: 4 }}>
            {t("settings_language")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            {t("settings_language_note")}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-btn)",
              overflow: "hidden",
            }}
          >
            {[
              { id: "en", label: "English" },
              { id: "uk", label: "Українська" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLanguage(opt.id)}
                style={{
                  padding: "12px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  background:
                    language === opt.id ? "var(--accent)" : "transparent",
                  color: language === opt.id ? "#100F0C" : "var(--text-muted)",
                  transition: "all var(--transition)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
