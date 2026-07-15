// Profile.jsx
import { useState, useEffect } from "react";
import { fetchProfile, saveProfile } from "../data/firestore";
import Header from "./Header";

export default function Profile({ user, onLogout, theme, onToggleTheme }) {
  const [profile, setProfile] = useState({
    // Дані водія
    name: user?.displayName || "",
    phone: "",
    email: user?.email || "",
    // Компанія
    company: "",
    companyAddress: "",
    // Трак
    truckUnit: "",
    truckModel: "",
    truckPlate: "",
    // Трейлер
    trailerUnit: "",
    trailerPlate: "",
    // Налаштування
    payMode: "pct",
    payVal: "87",
  });
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile(user.uid).then((data) => {
      if (data) setProfile((prev) => ({ ...prev, ...data }));
    });
  }, [user.uid]);

  function handleChange(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await saveProfile(user.uid, profile);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: 100 }}>
      {/* Header */}
      <Header
        title="Profile"
        right={
          <button
            onClick={onToggleTheme}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "4px",
              color: "var(--text-muted)",
              transition: "color var(--transition)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        }
      />
      <div style={{ padding: "16px" }}>
        {/* Аватар */}
        {user?.photoURL && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <img
              src={user.photoURL}
              alt="avatar"
              style={{
                width: 64,
                height: 64,
                borderRadius: 99,
                objectFit: "cover",
                border: "2px solid var(--accent)",
              }}
            />
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: 16,
                  color: "var(--text-primary)",
                }}
              >
                {user.displayName}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                {user.email}
              </div>
            </div>
          </div>
        )}

        {/* Driver */}
        <Section label="DRIVER" />
        <Field
          label="Full name"
          value={profile.name}
          onChange={(v) => handleChange("name", v)}
          placeholder="John Doe"
        />
        <Field
          label="Phone"
          value={profile.phone}
          onChange={(v) => handleChange("phone", v)}
          placeholder="+1 555 000 0000"
          type="tel"
        />

        {/* Company */}
        <Section label="COMPANY" />
        <Field
          label="Company name"
          value={profile.company}
          onChange={(v) => handleChange("company", v)}
          placeholder="ABC Logistics"
        />
        <Field
          label="Address"
          value={profile.companyAddress}
          onChange={(v) => handleChange("companyAddress", v)}
          placeholder="123 Main St, Dallas, TX"
        />

        {/* Truck */}
        <Section label="TRUCK" />
        <Field
          label="Unit number"
          value={profile.truckUnit}
          onChange={(v) => handleChange("truckUnit", v)}
          placeholder="1042"
        />
        <Field
          label="Model"
          value={profile.truckModel}
          onChange={(v) => handleChange("truckModel", v)}
          placeholder="Freightliner Cascadia"
        />
        <Field
          label="License plate"
          value={profile.truckPlate}
          onChange={(v) => handleChange("truckPlate", v)}
          placeholder="TX-12345"
        />

        {/* Trailer */}
        <Section label="TRAILER" />
        <Field
          label="Unit number"
          value={profile.trailerUnit}
          onChange={(v) => handleChange("trailerUnit", v)}
          placeholder="T-4421"
        />
        <Field
          label="Plate number"
          value={profile.trailerPlate}
          onChange={(v) => handleChange("trailerPlate", v)}
          placeholder="TX-99887"
        />

        {/* Pay defaults */}
        <Section label="PAY DEFAULTS" />
        <div style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>
            Pay mode
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "var(--bg-elevated)",
              backdropFilter: "var(--glass-blur)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-btn)",
              overflow: "hidden",
            }}
          >
            {["pct", "cpm"].map((mode) => (
              <button
                key={mode}
                onClick={() => handleChange("payMode", mode)}
                style={{
                  padding: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  background:
                    profile.payMode === mode ? "var(--accent)" : "transparent",
                  color:
                    profile.payMode === mode ? "#100F0C" : "var(--text-muted)",
                  transition: "all var(--transition)",
                }}
              >
                {mode === "pct" ? "% of gross" : "Cents per mile"}
              </button>
            ))}
          </div>
        </div>
        <Field
          label={
            profile.payMode === "pct" ? "Default share %" : "Default cents/mile"
          }
          value={profile.payVal}
          onChange={(v) => handleChange("payVal", v)}
          placeholder={profile.payMode === "pct" ? "87" : "90"}
          type="number"
        />

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 24,
          }}
        >
          <button
            onClick={handleSave}
            disabled={saved || saving}
            style={{
              width: "100%",
              padding: "13px 20px",
              background: saved ? "var(--bg-elevated)" : "var(--accent)",
              border: `1px solid ${saved ? "var(--border)" : "transparent"}`,
              borderRadius: "var(--radius-btn)",
              color: saved ? "var(--text-muted)" : "#100F0C",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 15,
              cursor: saved ? "not-allowed" : "pointer",
              transition: "all var(--transition)",
              backdropFilter: "var(--glass-blur)",
            }}
          >
            {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
          </button>
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "13px 20px",
              background: "transparent",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-btn)",
              color: "#f87171",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              fontSize: 15,
              cursor: "pointer",
              transition: "all var(--transition)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(239,68,68,0.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label }) {
  return (
    <div
      style={{
        padding: "20px 0 8px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.2em",
        color: "var(--text-muted)",
      }}
    >
      {label}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
        style={{ fontSize: 14, padding: "10px 12px" }}
      />
    </div>
  );
}
