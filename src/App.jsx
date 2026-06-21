import { onAuthStateChanged } from "firebase/auth";
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
import { signOut } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);

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

  // Trip handlers
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
    const updated = trips.filter((_, idx) => idx !== i);
    setTrips(updated);
    await deleteTrip(user.uid, trip.id);
  }

  // Load handlers
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
    let updatedLoads;
    if (selectedLoadIdx !== null) {
      updatedLoads = currentLoads.map((l, i) =>
        i === selectedLoadIdx ? load : l,
      );
    } else {
      updatedLoads = [...currentLoads, load];
    }
    const updatedTrip = { ...currentTrip, loads: updatedLoads };
    const updatedTrips = trips.map((t, i) =>
      i === selectedTripIdx ? updatedTrip : t,
    );
    setTrips(updatedTrips);
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
    const updatedTrips = trips.map((t, idx) =>
      idx === selectedTripIdx ? updatedTrip : t,
    );
    setTrips(updatedTrips);
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

  if (authLoading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-950"
        style={{ height: "100dvh" }}
      >
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (tripsLoading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-950"
        style={{ height: "100dvh" }}
      >
        <div className="text-gray-400 text-sm">Loading trips...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto print:max-w-full print:w-full">
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
