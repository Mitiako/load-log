import { useState, useEffect } from "react";
import {
  getTrips,
  saveTrips,
  saveLocation,
  generateTripId,
} from "./data/store";
import TripList from "./components/TripList";
import TripForm from "./components/TripForm";
import LoadList from "./components/LoadList";
import LoadDetail from "./components/LoadDetail";
import LoadForm from "./components/LoadForm";
import Monthly from "./components/Monthly";
import PrintView from "./components/PrintView";
import { Analytics } from "@vercel/analytics/react";

export default function App() {
  const [trips, setTrips] = useState(getTrips);
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

  function handleSaveTrip(name) {
    if (editingTrip && selectedTripIdx !== null) {
      const updated = trips.map((t, i) =>
        i === selectedTripIdx ? { ...t, name } : t,
      );
      setTrips(updated);
      saveTrips(updated);
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
      saveTrips(updated);
      setSelectedTripIdx(0);
      history.replaceState({ screen: "loads" }, "");
      setScreen("loads");
    }
  }

  function handleDeleteTrip(i) {
    const updated = trips.filter((_, idx) => idx !== i);
    setTrips(updated);
    saveTrips(updated);
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

  function handleSaveLoad(load) {
    let updatedLoads;
    if (selectedLoadIdx !== null) {
      updatedLoads = currentLoads.map((l, i) =>
        i === selectedLoadIdx ? load : l,
      );
    } else {
      updatedLoads = [...currentLoads, load];
    }
    const updatedTrips = trips.map((t, i) =>
      i === selectedTripIdx ? { ...t, loads: updatedLoads } : t,
    );
    setTrips(updatedTrips);
    saveTrips(updatedTrips);
    saveLocation(load.from);
    saveLocation(load.to);
    load.diesel?.forEach((d) => saveLocation(d.location));
    goTo("loads");
    setSelectedLoadIdx(null);
  }

  function handleDeleteLoad(i) {
    const updatedLoads = currentLoads.filter((_, idx) => idx !== i);
    const updatedTrips = trips.map((t, idx) =>
      idx === selectedTripIdx ? { ...t, loads: updatedLoads } : t,
    );
    setTrips(updatedTrips);
    saveTrips(updatedTrips);
  }

  function handleBack() {
    history.back();
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
