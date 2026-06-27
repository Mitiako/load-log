// App.jsx
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/Login";
import { useState, useEffect } from "react";
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

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

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

  // Інтро показуємо 2.5 сек при першому завантаженні
  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const [screen, setScreen] = useState("trips");
  const [selectedTripIdx, setSelectedTripIdx] = useState(null);
  const [selectedLoadIdx, setSelectedLoadIdx] = useState(null);
  const [editingTrip, setEditingTrip] = useState(false);

  function goTo(newScreen) {
    history.pushState({ screen: newScreen }, "");
    setScreen(newScreen);
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
    goTo("loads");
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
  }

  // Інтро екран
  if (showIntro) {
    return <IntroScreen />;
  }

  // Auth loading
  if (authLoading) {
    return <LoadingScreen label="LOADING..." />;
  }

  if (!user) {
    return <Login />;
  }

  if (tripsLoading) {
    return <LoadingScreen label="LOADING TRIPS..." />;
  }

  return (
    <div
      style={{ maxWidth: 480, margin: "0 auto" }}
      className="print:max-w-full print:w-full"
    >
      <Analytics />

      {screen === "trips" && (
        <TripList
          trips={trips}
          onSelect={handleSelectTrip}
          onCreate={handleCreateTrip}
          onEdit={handleEditTrip}
          onDelete={handleDeleteTrip}
          onLogout={handleLogout}
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
          load={selectedLoadIdx !== null ? currentLoads[selectedLoadIdx] : null}
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
    </div>
  );
}

// Інтро екран з анімацією логотипу
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
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
      }}
    >
      {/* Логотип */}
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

      {/* Progress bar */}
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
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function LoadingScreen({ label }) {
  return (
    <div
      style={{
        height: "100dvh",
        background: "var(--bg-base)",
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
