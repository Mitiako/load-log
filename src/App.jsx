import { useState, useEffect } from "react";
import { getLoads, saveLoads, saveLocation } from "./data/store";
import LoadList from "./components/LoadList";
import LoadDetail from "./components/LoadDetail";
import LoadForm from "./components/LoadForm";
import Monthly from "./components/Monthly";
import PrintView from "./components/PrintView";

export default function App() {
  const [loads, setLoads] = useState(getLoads);
  const [screen, setScreen] = useState("list");
  const [printLoads, setPrintLoads] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);

  function goTo(newScreen) {
    history.pushState({ screen: newScreen }, "");
    setScreen(newScreen);
  }

  useEffect(() => {
    function handlePop(e) {
      const s = e.state?.screen || "list";
      setScreen(s);
      if (s === "list") setSelectedIdx(null);
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  function handleSelect(i) {
    setSelectedIdx(i);
    goTo("detail");
  }

  function handleAdd() {
    setSelectedIdx(null);
    goTo("form");
  }

  function handleEdit() {
    goTo("form");
  }

  function handleSave(load) {
    let updated;
    if (selectedIdx !== null) {
      updated = loads.map((l, i) => (i === selectedIdx ? load : l));
    } else {
      updated = [...loads, load];
    }
    setLoads(updated);
    saveLoads(updated);
    // зберігаємо локації
    saveLocation(load.from);
    saveLocation(load.to);
    load.diesel?.forEach((d) => saveLocation(d.location));
    setScreen("list");
    setSelectedIdx(null);
  }

  function handleDelete(i) {
    const updated = loads.filter((_, idx) => idx !== i);
    setLoads(updated);
    saveLoads(updated);
  }

  function handleBack() {
    history.back();
  }

  return (
    <div className="max-w-md mx-auto">
      {screen === "list" && (
        <LoadList
          loads={loads}
          onSelect={handleSelect}
          onAdd={handleAdd}
          onMonthly={() => goTo("monthly")}
          onDelete={handleDelete}
        />
      )}
      {screen === "detail" && selectedIdx !== null && (
        <LoadDetail
          load={loads[selectedIdx]}
          onBack={handleBack}
          onEdit={handleEdit}
        />
      )}
      {screen === "form" && (
        <LoadForm
          load={selectedIdx !== null ? loads[selectedIdx] : null}
          onSave={handleSave}
          onBack={handleBack}
        />
      )}
      {screen === "monthly" && (
        <Monthly
          loads={loads}
          onBack={handleBack}
          onPrint={() => {
            setPrintLoads(loads);
            setScreen("print");
          }}
        />
      )}
      {screen === "print" && (
        <PrintView loads={printLoads} onClose={() => setScreen("monthly")} />
      )}
    </div>
  );
}
