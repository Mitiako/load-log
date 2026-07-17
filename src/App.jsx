import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/Login";
import { useState, useEffect, useRef } from "react";
import { saveLocation, generateTripId } from "./data/store";
import { fetchTrips, saveTrip, deleteTrip } from "./data/firestore";
import TripList from "./components/TripList";
import TripForm from "./components/TripForm";
import LoadList from "./components/LoadList";
import LoadDetail from "./components/LoadDetail";
import LoadForm from "./components/LoadForm";
import Monthly from "./components/Monthly";
import PrintView from "./components/PrintView";
import { Analytics } from "@vercel/analytics/react";
import Profile from "./components/Profile";
import AnalyticsScreen from "./components/AnalyticsScreen";
import Settings from "./components/Settings";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark",
  );
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("activeTab") || "trips",
  );
  const [screen, setScreen] = useState(
    () => sessionStorage.getItem("screen") || "trips",
  );
  const [selectedTripIdx, setSelectedTripIdx] = useState(() => {
    const v = sessionStorage.getItem("selectedTripIdx");
    return v !== null ? Number(v) : null;
  });
  const [selectedLoadIdx, setSelectedLoadIdx] = useState(() => {
    const v = sessionStorage.getItem("selectedLoadIdx");
    return v !== null ? Number(v) : null;
  });
  const [editingTrip, setEditingTrip] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const data = await fetchTrips(u.uid);
        setTrips(data);
      } else {
        setTrips([]);
      }
      setAuthLoading(false);
      setTripsLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 2500);
    return () => clearTimeout(t);
  }, []);

  function goTo(newScreen) {
    history.pushState({ screen: newScreen }, "");
    setScreen(newScreen);
    sessionStorage.setItem("screen", newScreen);
  }

  function switchTab(tab) {
    setActiveTab(tab);
    sessionStorage.setItem("activeTab", tab);
    if (tab === "trips") {
      goTo("trips");
      setSelectedTripIdx(null);
      setSelectedLoadIdx(null);
    } else {
      goTo(tab);
    }
  }

  useEffect(() => {
    function handlePop(e) {
      const s = e.state?.screen || "trips";
      setScreen(s);
      if (s === "trips") {
        setSelectedTripIdx(null);
        setSelectedLoadIdx(null);
      }
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const currentTrip = selectedTripIdx !== null ? trips[selectedTripIdx] : null;
  const currentLoads = currentTrip?.loads || [];

  function handleSelectTrip(i) {
    setSelectedTripIdx(i);
    setSelectedLoadIdx(null);
    sessionStorage.setItem("selectedTripIdx", i);
    sessionStorage.removeItem("selectedLoadIdx");
    goTo("loads");
  }
  function handleCreateTrip() {
    setEditingTrip(false);
    goTo("tripForm");
  }
  function handleEditTrip(i) {
    setSelectedTripIdx(i);
    setEditingTrip(true);
    goTo("tripForm");
  }

  async function handleSaveTrip(name) {
    if (editingTrip && selectedTripIdx !== null) {
      const updatedTrip = { ...trips[selectedTripIdx], name };
      const updated = trips.map((t, i) =>
        i === selectedTripIdx ? updatedTrip : t,
      );
      setTrips(updated);
      await saveTrip(user.uid, updatedTrip);
      history.replaceState({ screen: "loads" }, "");
      setScreen("loads");
    } else {
      const newTrip = {
        id: generateTripId(),
        name,
        createdAt: new Date().toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        }),
        loads: [],
      };
      const updated = [newTrip, ...trips];
      setTrips(updated);
      await saveTrip(user.uid, newTrip);
      setSelectedTripIdx(0);
      history.replaceState({ screen: "loads" }, "");
      setScreen("loads");
    }
  }

  async function handleDeleteTrip(i) {
    const trip = trips[i];
    setTrips(trips.filter((_, idx) => idx !== i));
    await deleteTrip(user.uid, trip.id);
  }

  function handleSelectLoad(i) {
    setSelectedLoadIdx(i);
    sessionStorage.setItem("selectedLoadIdx", i);
    goTo("detail");
  }
  function handleGoToLoadFromAnalytics(tripIdx, loadIdx) {
    setSelectedTripIdx(tripIdx);
    setSelectedLoadIdx(loadIdx);
    sessionStorage.setItem("selectedTripIdx", tripIdx);
    sessionStorage.setItem("selectedLoadIdx", loadIdx);
    goTo("detail");
  }
  function handleAddLoad() {
    setSelectedLoadIdx(null);
    goTo("form");
  }
  function handleEditLoad() {
    goTo("form");
  }

  async function handleSaveLoad(load) {
    const updatedLoads =
      selectedLoadIdx !== null
        ? currentLoads.map((l, i) => (i === selectedLoadIdx ? load : l))
        : [...currentLoads, load];
    const updatedTrip = { ...currentTrip, loads: updatedLoads };
    setTrips(trips.map((t, i) => (i === selectedTripIdx ? updatedTrip : t)));
    await saveTrip(user.uid, updatedTrip);
    saveLocation(load.from);
    saveLocation(load.to);
    load.diesel?.forEach((d) => saveLocation(d.location));
    history.replaceState({ screen: "loads" }, "");
    setScreen("loads");
    setSelectedLoadIdx(null);
  }

  async function handleDeleteLoad(i) {
    const updatedLoads = currentLoads.filter((_, idx) => idx !== i);
    const updatedTrip = { ...currentTrip, loads: updatedLoads };
    setTrips(
      trips.map((t, idx) => (idx === selectedTripIdx ? updatedTrip : t)),
    );
    await saveTrip(user.uid, updatedTrip);
  }

  function handleBack() {
    history.back();
  }

  async function handleLogout() {
    await signOut(auth);
    setTrips([]);
    setScreen("trips");
    setActiveTab("trips");
    sessionStorage.clear();
  }

  if (showIntro) return <IntroScreen />;
  if (authLoading) return <LoadingScreen label="LOADING..." />;
  if (!user) return <Login />;
  if (tripsLoading) return <LoadingScreen label="LOADING TRIPS..." />;

  const showBottomNav = ["trips", "analytics", "profile"].includes(screen);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
      className="print:max-w-full print:w-full"
    >
      <Analytics />
      <div style={{ flex: 1, paddingBottom: showBottomNav ? 72 : 0 }}>
        {screen === "trips" && (
          <TripList
            trips={trips}
            onSelect={handleSelectTrip}
            onCreate={handleCreateTrip}
            onEdit={handleEditTrip}
            onDelete={handleDeleteTrip}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
        {screen === "tripForm" && (
          <TripForm
            trips={trips}
            trip={
              editingTrip && selectedTripIdx !== null
                ? trips[selectedTripIdx]
                : null
            }
            onSave={handleSaveTrip}
            onBack={handleBack}
          />
        )}
        {screen === "loads" && currentTrip && (
          <LoadList
            trip={currentTrip}
            loads={currentLoads}
            onSelect={handleSelectLoad}
            onAdd={handleAddLoad}
            onMonthly={() => goTo("monthly")}
            onDelete={handleDeleteLoad}
            onBack={handleBack}
          />
        )}
        {screen === "detail" && selectedLoadIdx !== null && currentTrip && (
          <LoadDetail
            load={currentLoads[selectedLoadIdx]}
            onBack={handleBack}
            onEdit={handleEditLoad}
          />
        )}
        {screen === "form" && currentTrip && (
          <LoadForm
            load={
              selectedLoadIdx !== null ? currentLoads[selectedLoadIdx] : null
            }
            onSave={handleSaveLoad}
            onBack={handleBack}
          />
        )}
        {screen === "monthly" && currentTrip && (
          <Monthly
            loads={currentLoads}
            onBack={handleBack}
            onPrint={() => goTo("print")}
          />
        )}
        {screen === "print" && currentTrip && (
          <PrintView loads={currentLoads} onClose={() => goTo("monthly")} />
        )}
        {screen === "analytics" && (
          <AnalyticsScreen
            user={user}
            trips={trips}
            theme={theme}
            onToggleTheme={toggleTheme}
            onGoToLoad={handleGoToLoadFromAnalytics}
          />
        )}
        {screen === "profile" && (
          <Profile
            user={user}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenSettings={() => goTo("settings")}
          />
        )}
      </div>

      {screen === "settings" && <Settings onBack={() => history.back()} />}

      {showBottomNav && (
        <BottomNav activeTab={activeTab} onSwitch={switchTab} theme={theme} />
      )}
    </div>
  );
}

function BottomNav({ activeTab, onSwitch, theme }) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef(null);
  const tabRefs = useRef({});

  const tabs = [
    {
      id: "trips",
      label: "Trips",
      icon: (active, theme) => (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={
            active
              ? theme === "light"
                ? "#1A1813"
                : "#fff"
              : "var(--text-muted)"
          }
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: (active, theme) => (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={
            active
              ? theme === "light"
                ? "#1A1813"
                : "#fff"
              : "var(--text-muted)"
          }
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (active, theme) => (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={
            active
              ? theme === "light"
                ? "#1A1813"
                : "#fff"
              : "var(--text-muted)"
          }
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    const nav = navRef.current;
    if (el && nav) {
      const navRect = nav.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - navRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        zIndex: 100,
        padding: "12px 16px 24px",
      }}
    >
      <div
        ref={navRef}
        style={{
          display: "flex",
          background:
            theme === "light"
              ? "rgba(255, 255, 255, 0.8)"
              : "rgba(15, 13, 10, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 99,
          border:
            theme === "light"
              ? "1px solid rgba(0,0,0,0.08)"
              : "1px solid rgba(255,255,255,0.08)",
          padding: "5px",
          position: "relative",
        }}
      >
        {/* Ковзаюча капсула */}
        <div
          style={{
            position: "absolute",
            top: 5,
            bottom: 5,
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            background:
              theme === "light"
                ? "rgba(255,138,61,0.12)"
                : "rgba(255,255,255,0.08)",
            borderRadius: 99,
            transition:
              "left 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow:
              theme === "light"
                ? `0 0 20px rgba(255,138,61,0.5), 0 0 40px rgba(255,138,61,0.25), inset 0 1px 0 rgba(255,255,255,0.9)`
                : `0 0 16px rgba(255,138,61,0.35), 0 0 32px rgba(255,138,61,0.15), 0 0 64px rgba(255,138,61,0.08), inset 0 1px 0 rgba(255,255,255,0.12)`,
            pointerEvents: "none",
          }}
        />

        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[tab.id] = el)}
              onClick={() => onSwitch(tab.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: "8px 0",
                background: "transparent",
                border: "none",
                borderRadius: 99,
                cursor: "pointer",
                position: "relative",
                zIndex: 1,
              }}
            >
              {tab.icon(active, theme)}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  letterSpacing: "0.08em",
                  color: active
                    ? theme === "light"
                      ? "#1A1813"
                      : "#fff"
                    : "var(--text-muted)",
                  transition: "color 300ms ease-out",
                }}
              >
                {tab.label.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IntroScreen() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 2200;
    const frame = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setProgress(p);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, []);

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="64"
          height="64"
          fill="none"
          style={{ animation: "fadeIn 0.6s ease-out" }}
        >
          <path
            d="M31 23 V77 H59"
            stroke="#F4F1EB"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 120,
              strokeDashoffset: 120,
              animation: "drawPath 0.8s ease-out 0.2s forwards",
            }}
          />
          <path
            d="M69 77 V23 H41"
            stroke="#FF8A3D"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 120,
              strokeDashoffset: 120,
              animation: "drawPath 0.8s ease-out 0.6s forwards",
            }}
          />
        </svg>
        <div
          style={{
            textAlign: "center",
            animation: "fadeIn 0.6s ease-out 0.8s both",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 32,
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
      <div
        style={{
          width: 120,
          height: 2,
          background: "var(--border)",
          borderRadius: 99,
          overflow: "hidden",
          animation: "fadeIn 0.4s ease-out 0.4s both",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: "var(--accent)",
            borderRadius: 99,
            transition: "width 0.05s linear",
          }}
        />
      </div>
      <style>{`
        @keyframes drawPath { to { stroke-dashoffset: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function LoadingScreen({ label }) {
  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.12em",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
