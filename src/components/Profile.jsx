// Profile.jsx
import { useState, useEffect, useRef } from "react";
import { fetchProfile, saveProfile } from "../data/firestore";
import { AssistantIcon } from "./icons/AssistantIcon";
import ZoomableImage from "./ZoomableImage";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import Header from "./Header";
import {
  DriverIcon,
  HomeAddressIcon,
  CompanyIcon,
  TruckIcon,
  TrailerIcon,
  GoalIcon,
  CdlIcon,
  MedicalCardIcon,
  LicensePlateIcon,
  CloseIcon,
  SettingsIcon,
} from "./icons/ProfileIcons";

export default function Profile({
  user,
  onLogout,
  theme,
  onToggleTheme,
  onOpenSettings,
}) {
  const [profile, setProfile] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    address: "",
    company: "",
    companyAddress: "",
    truckUnit: "",
    truckPlate: "",
    trailerUnit: "",
    trailerPlate: "",
    payMode: "pct",
    payVal: "87",
    goalType: "",
    goalVal: "",
    truckPhoto: null,
    trailerPhoto: null,
    cdlPhoto: null,
    medPhoto: null,
  });

  const [modal, setModal] = useState(null); // який тайл відкритий
  const [viewingPhoto, setViewingPhoto] = useState(null); // фото на весь екран
  const [saving, setSaving] = useState(false);
  const truckPhotoRef = useRef(null);
  const trailerPhotoRef = useRef(null);
  const cdlRef = useRef(null);
  const medRef = useRef(null);

  useEffect(() => {
    fetchProfile(user.uid).then((data) => {
      if (data) {
        // Не даємо порожнім полям з бази затерти хороші початкові
        // значення (наприклад ім'я/email з Google-акаунту) —
        // перезаписуємо тільки те, що в базі реально заповнено.
        const nonEmpty = Object.fromEntries(
          Object.entries(data).filter(
            ([, v]) => v !== "" && v !== null && v !== undefined,
          ),
        );
        setProfile((prev) => ({ ...prev, ...nonEmpty }));
      }
    });
  }, [user.uid]);

  async function handleSave(updates) {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    setSaving(true);
    await saveProfile(user.uid, updated);
    setSaving(false);
    setModal(null);
  }

  function handlePhotoCapture(field, ref) {
    ref.current?.click();
  }

  function handlePhotoChange(field, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      handleSave({ [field]: ev.target.result });
    };
    reader.readAsDataURL(file);
  }

  function handlePhotoRemove(field, e) {
    e.stopPropagation();
    handleSave({ [field]: null });
  }

  const tileStyle = {
    cursor: "pointer",
    transition: "border-color var(--transition), box-shadow var(--transition)",
  };

  return (
    <div style={{ minHeight: "100svh", paddingBottom: 120 }}>
      <Header
        title="Profile"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => alert("Chat coming soon!")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
            >
              <AssistantIcon size={30} />
            </button>
            <button
              onClick={onOpenSettings}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "var(--text-muted)",
                display: "flex",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              <SettingsIcon size={18} />
            </button>
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
          </div>
        }
      />

      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Рядок 1: Photo + Name/Phone + Address */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          {/* Photo */}
          <div
            className="glass"
            style={{
              ...tileStyle,
              padding: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 160,
              gridRow: "span 2",
            }}
            onClick={() => setModal("photo")}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="avatar"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 99,
                  objectFit: "cover",
                  border: "2px solid var(--accent)",
                }}
              />
            ) : (
              <div style={{ textAlign: "center" }}>
                <DriverIcon
                  size={32}
                  style={{
                    display: "block",
                    margin: "0 auto 8px",
                    color: "var(--text-muted)",
                  }}
                />
                <div className="label">Photo</div>
              </div>
            )}
          </div>

          {/* Name/Phone */}
          <div
            className="glass"
            style={{
              ...tileStyle,
              padding: 16,
              minHeight: 75,
              textAlign: "center",
            }}
            onClick={() => setModal("driver")}
          >
            {profile.name || profile.phone ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--text-primary)",
                    marginBottom: 2,
                  }}
                >
                  {profile.name || "—"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginBottom: 2,
                  }}
                >
                  {profile.email}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                  }}
                >
                  {profile.phone || "No phone"}
                </div>
              </>
            ) : (
              <EmptyTile icon={DriverIcon} label="Name · Email · Phone" />
            )}
          </div>

          {/* Address */}
          <div
            className="glass"
            style={{
              ...tileStyle,
              padding: 16,
              minHeight: 75,
              textAlign: "center",
            }}
            onClick={() => setModal("address")}
          >
            {profile.address ? (
              <>
                <div className="label" style={{ marginBottom: 4 }}>
                  Home Address
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    lineHeight: 1.4,
                  }}
                >
                  {profile.address}
                </div>
              </>
            ) : (
              <EmptyTile icon={HomeAddressIcon} label="Home Address" />
            )}
          </div>
        </div>
        {/* Company */}
        <div
          className="glass"
          style={{ ...tileStyle, padding: 16, textAlign: "center" }}
          onClick={() => setModal("company")}
        >
          {profile.company ? (
            <>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                {profile.company}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                {profile.companyAddress || "No address"}
              </div>
            </>
          ) : (
            <EmptyTile icon={CompanyIcon} label="Company Name · Address" />
          )}
        </div>
        {/* Truck */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div
            className="glass"
            style={{
              ...tileStyle,
              height: 120,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
            onClick={() => setModal("truck")}
          >
            {profile.truckUnit || profile.truckPlate ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <TruckIcon
                    size={16}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    {profile.truckUnit || "—"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <LicensePlateIcon
                    size={16}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    {profile.truckPlate || "—"}
                  </span>
                </div>
              </>
            ) : (
              <EmptyTile icon={TruckIcon} label="Truck # · Plate" />
            )}
          </div>

          <div
            className="glass"
            style={{
              ...tileStyle,
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={() =>
              profile.truckPhoto
                ? setViewingPhoto(profile.truckPhoto)
                : handlePhotoCapture("truckPhoto", truckPhotoRef)
            }
          >
            {profile.truckPhoto ? (
              <>
                <img
                  src={profile.truckPhoto}
                  alt="Truck"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <button
                  onClick={(e) => handlePhotoRemove("truckPhoto", e)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    border: "none",
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <CloseIcon size={13} style={{ color: "#fff" }} />
                </button>
              </>
            ) : (
              <EmptyTile icon={TruckIcon} label="Truck Photo" />
            )}
            <input
              ref={truckPhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => handlePhotoChange("truckPhoto", e)}
            />
          </div>
        </div>
        {/* Trailer */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div
            className="glass"
            style={{
              ...tileStyle,
              height: 120,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
            onClick={() => setModal("trailer")}
          >
            {profile.trailerUnit || profile.trailerPlate ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <TrailerIcon
                    size={16}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    {profile.trailerUnit || "—"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <LicensePlateIcon
                    size={16}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    {profile.trailerPlate || "—"}
                  </span>
                </div>
              </>
            ) : (
              <EmptyTile icon={TrailerIcon} label="Trailer # · Plate" />
            )}
          </div>

          <div
            className="glass"
            style={{
              ...tileStyle,
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={() =>
              profile.trailerPhoto
                ? setViewingPhoto(profile.trailerPhoto)
                : handlePhotoCapture("trailerPhoto", trailerPhotoRef)
            }
          >
            {profile.trailerPhoto ? (
              <>
                <img
                  src={profile.trailerPhoto}
                  alt="Trailer"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <button
                  onClick={(e) => handlePhotoRemove("trailerPhoto", e)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    border: "none",
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <CloseIcon size={13} style={{ color: "#fff" }} />
                </button>
              </>
            ) : (
              <EmptyTile icon={TrailerIcon} label="Trailer Photo" />
            )}
            <input
              ref={trailerPhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => handlePhotoChange("trailerPhoto", e)}
            />
          </div>
        </div>
        {/* Pay + Goal */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div
            className="glass"
            style={{ ...tileStyle, padding: 16, textAlign: "center" }}
            onClick={() => setModal("pay")}
          >
            <div className="label" style={{ marginBottom: 4 }}>
              Pay Rate
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--accent)",
              }}
            >
              {profile.payVal
                ? profile.payMode === "pct"
                  ? `${profile.payVal}% of Gross`
                  : `${profile.payVal}¢/Mile`
                : "—"}
            </div>
          </div>
          <div
            className="glass"
            style={{ ...tileStyle, padding: 16, textAlign: "center" }}
            onClick={() => setModal("goal")}
          >
            {profile.goalType ? (
              <>
                <div className="label" style={{ marginBottom: 4 }}>
                  {profile.goalType === "rpm" ? "RPM Goal" : "Weekly Goal"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "var(--accent)",
                  }}
                >
                  {profile.goalType === "rpm"
                    ? `$${profile.goalVal}/mi`
                    : `$${profile.goalVal}`}
                </div>
              </>
            ) : (
              <EmptyTile icon={GoalIcon} label="Goal" />
            )}
          </div>
        </div>
        {/* CDL */}
        <div
          className="glass"
          style={{
            ...tileStyle,
            height: 130,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
          onClick={() =>
            profile.cdlPhoto
              ? setViewingPhoto(profile.cdlPhoto)
              : handlePhotoCapture("cdlPhoto", cdlRef)
          }
        >
          {profile.cdlPhoto ? (
            <>
              <img
                src={profile.cdlPhoto}
                alt="CDL"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "var(--radius-card)",
                  objectFit: "cover",
                }}
              />
              <button
                onClick={(e) => handlePhotoRemove("cdlPhoto", e)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  border: "none",
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <CloseIcon size={14} style={{ color: "#fff" }} />
              </button>
            </>
          ) : (
            <EmptyTile icon={CdlIcon} label="CDL License Photo" />
          )}
          <input
            ref={cdlRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handlePhotoChange("cdlPhoto", e)}
          />
        </div>
        {/* Med Card */}
        <div
          className="glass"
          style={{
            ...tileStyle,
            height: 130,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
          onClick={() =>
            profile.medPhoto
              ? setViewingPhoto(profile.medPhoto)
              : handlePhotoCapture("medPhoto", medRef)
          }
        >
          {profile.medPhoto ? (
            <>
              <img
                src={profile.medPhoto}
                alt="Med Card"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "var(--radius-card)",
                  objectFit: "cover",
                }}
              />
              <button
                onClick={(e) => handlePhotoRemove("medPhoto", e)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  border: "none",
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <CloseIcon size={14} style={{ color: "#fff" }} />
              </button>
            </>
          ) : (
            <EmptyTile icon={MedicalCardIcon} label="Medical Card Photo" />
          )}
          <input
            ref={medRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handlePhotoChange("medPhoto", e)}
          />
        </div>

        {/* Sign Out */}
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            padding: "13px 20px",
            marginTop: 8,
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

      {/* Модальні вікна */}
      {modal && (
        <Modal onClose={() => setModal(null)} saving={saving}>
          {modal === "driver" && (
            <DriverForm profile={profile} onSave={handleSave} />
          )}
          {modal === "address" && (
            <AddressForm profile={profile} onSave={handleSave} />
          )}
          {modal === "company" && (
            <CompanyForm profile={profile} onSave={handleSave} />
          )}
          {modal === "truck" && (
            <TruckForm profile={profile} onSave={handleSave} />
          )}
          {modal === "trailer" && (
            <TrailerForm profile={profile} onSave={handleSave} />
          )}
          {modal === "pay" && <PayForm profile={profile} onSave={handleSave} />}
          {modal === "goal" && (
            <GoalForm profile={profile} onSave={handleSave} />
          )}
        </Modal>
      )}

      {viewingPhoto && (
        <PhotoViewer src={viewingPhoto} onClose={() => setViewingPhoto(null)} />
      )}
    </div>
  );
}

/* ─── Empty tile ─── */
function EmptyTile({ icon: Icon, label }) {
  return (
    <div style={{ textAlign: "center", width: "100%" }}>
      <Icon
        size={24}
        style={{
          display: "block",
          margin: "0 auto 6px",
          color: "var(--text-muted)",
        }}
      />
      <div className="label">{label}</div>
    </div>
  );
}

/* ─── Повноекранний перегляд фото ─── */
function PhotoViewer({ src, onClose }) {
  useLockBodyScroll();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.9)",
      }}
    >
      <ZoomableImage src={src} alt="Full size" />
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: 99,
          border: "none",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 301,
        }}
      >
        <CloseIcon size={16} style={{ color: "#fff" }} />
      </button>
    </div>
  );
}

/* ─── Modal wrapper ─── */
function Modal({ children, onClose, saving }) {
  useLockBodyScroll();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-elevated)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid var(--border)",
          padding: "24px 20px 48px",
          boxShadow: "var(--glass-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {saving && (
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--accent)",
              marginBottom: 12,
            }}
          >
            SAVING...
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ─── Forms ─── */
function DriverForm({ profile, onSave }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  return (
    <div>
      <ModalTitle>Driver Info</ModalTitle>
      <Field
        label="Full Name"
        value={name}
        onChange={setName}
        placeholder="John Doe"
      />
      <Field
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="john@example.com"
        type="email"
      />
      <Field
        label="Phone"
        value={phone}
        onChange={setPhone}
        placeholder="+1 555 000 0000"
        type="tel"
      />
      <SaveBtn onClick={() => onSave({ name, email, phone })} />
    </div>
  );
}

function AddressForm({ profile, onSave }) {
  const [address, setAddress] = useState(profile.address);
  return (
    <div>
      <ModalTitle>Home Address</ModalTitle>
      <Field
        label="Address"
        value={address}
        onChange={setAddress}
        placeholder="123 Main St, Dallas, TX"
      />
      <SaveBtn onClick={() => onSave({ address })} />
    </div>
  );
}

function CompanyForm({ profile, onSave }) {
  const [company, setCompany] = useState(profile.company);
  const [companyAddress, setCompanyAddress] = useState(profile.companyAddress);
  return (
    <div>
      <ModalTitle>Company</ModalTitle>
      <Field
        label="Company Name"
        value={company}
        onChange={setCompany}
        placeholder="ABC Logistics"
      />
      <Field
        label="Address"
        value={companyAddress}
        onChange={setCompanyAddress}
        placeholder="456 Freight Ave, Houston, TX"
      />
      <SaveBtn onClick={() => onSave({ company, companyAddress })} />
    </div>
  );
}

function TruckForm({ profile, onSave }) {
  const [truckUnit, setTruckUnit] = useState(profile.truckUnit);
  const [truckPlate, setTruckPlate] = useState(profile.truckPlate);
  return (
    <div>
      <ModalTitle>Truck</ModalTitle>
      <Field
        label="Unit Number"
        value={truckUnit}
        onChange={setTruckUnit}
        placeholder="1042"
      />
      <Field
        label="License Plate"
        value={truckPlate}
        onChange={setTruckPlate}
        placeholder="TX-12345"
      />
      <SaveBtn onClick={() => onSave({ truckUnit, truckPlate })} />
    </div>
  );
}

function TrailerForm({ profile, onSave }) {
  const [trailerUnit, setTrailerUnit] = useState(profile.trailerUnit);
  const [trailerPlate, setTrailerPlate] = useState(profile.trailerPlate);
  return (
    <div>
      <ModalTitle>Trailer</ModalTitle>
      <Field
        label="Unit Number"
        value={trailerUnit}
        onChange={setTrailerUnit}
        placeholder="T-4421"
      />
      <Field
        label="License Plate"
        value={trailerPlate}
        onChange={setTrailerPlate}
        placeholder="TX-99887"
      />
      <SaveBtn onClick={() => onSave({ trailerUnit, trailerPlate })} />
    </div>
  );
}

function PayForm({ profile, onSave }) {
  const [payMode, setPayMode] = useState(profile.payMode);
  const [payVal, setPayVal] = useState(profile.payVal);
  return (
    <div>
      <ModalTitle>Pay Settings</ModalTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: 16,
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-btn)",
          overflow: "hidden",
        }}
      >
        {["pct", "cpm"].map((mode) => (
          <button
            key={mode}
            onClick={() => setPayMode(mode)}
            style={{
              padding: "10px",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              background: payMode === mode ? "var(--accent)" : "transparent",
              color: payMode === mode ? "#100F0C" : "var(--text-muted)",
              transition: "all var(--transition)",
            }}
          >
            {mode === "pct" ? "% of gross" : "Cents per mile"}
          </button>
        ))}
      </div>
      <Field
        label={payMode === "pct" ? "Your share %" : "Cents per mile"}
        value={payVal}
        onChange={setPayVal}
        placeholder={payMode === "pct" ? "87" : "90"}
        type="number"
      />
      <SaveBtn onClick={() => onSave({ payMode, payVal })} />
    </div>
  );
}

function GoalForm({ profile, onSave }) {
  const [goalType, setGoalType] = useState(profile.goalType || "rpm");
  const [goalVal, setGoalVal] = useState(profile.goalVal);
  return (
    <div>
      <ModalTitle>My Goal</ModalTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: 16,
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-btn)",
          overflow: "hidden",
        }}
      >
        {[
          { id: "rpm", label: "RPM Goal" },
          { id: "weekly", label: "Weekly Goal" },
        ].map((g) => (
          <button
            key={g.id}
            onClick={() => setGoalType(g.id)}
            style={{
              padding: "10px",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              background: goalType === g.id ? "var(--accent)" : "transparent",
              color: goalType === g.id ? "#100F0C" : "var(--text-muted)",
              transition: "all var(--transition)",
            }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <Field
        label={goalType === "rpm" ? "Target $ per mile" : "Target $ per week"}
        value={goalVal}
        onChange={setGoalVal}
        placeholder={goalType === "rpm" ? "2.50" : "3000"}
        type="number"
      />
      <SaveBtn onClick={() => onSave({ goalType, goalVal })} />
    </div>
  );
}

/* ─── Helpers ─── */
function ModalTitle({ children }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize: 17,
        color: "var(--text-primary)",
        marginBottom: 20,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
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
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        style={{ fontSize: 14, padding: "10px 12px" }}
      />
    </div>
  );
}

function SaveBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn-primary"
      style={{ width: "100%", fontSize: 15, marginTop: 8 }}
    >
      Save
    </button>
  );
}
