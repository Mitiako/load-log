import { useState } from "react";
import { getLoads, saveLoads } from "./data/store";
import LoadList from "./components/LoadList";
import LoadDetail from "./components/LoadDetail";
import LoadForm from "./components/LoadForm";
import Monthly from "./components/Monthly";

export default function App() {
  const [loads, setLoads] = useState(getLoads);
  const [screen, setScreen] = useState("list");
  const [selectedIdx, setSelectedIdx] = useState(null);

  function handleSelect(i) {
    setSelectedIdx(i);
    setScreen("detail");
  }

  function handleAdd() {
    setSelectedIdx(null);
    setScreen("form");
  }

  function handleEdit() {
    setScreen("form");
  }

  function handleDelete() {
    const updated = loads.filter((_, i) => i !== selectedIdx);
    setLoads(updated);
    saveLoads(updated);
    setScreen("list");
    setSelectedIdx(null);
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
    setScreen("list");
    setSelectedIdx(null);
  }

  function handleBack() {
    if (screen === "detail") setScreen("list");
    else if (screen === "form" && selectedIdx !== null) setScreen("detail");
    else setScreen("list");
  }

  return (
    <div className="max-w-md mx-auto">
      {screen === "list" && (
        <LoadList
          loads={loads}
          onSelect={handleSelect}
          onAdd={handleAdd}
          onMonthly={() => setScreen("monthly")}
          onDelete={handleDelete}
        />
      )}
      {screen === "detail" && selectedIdx !== null && (
        <LoadDetail
          load={loads[selectedIdx]}
          onBack={handleBack}
          onEdit={handleEdit}
          onDelete={handleDelete}
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
        <Monthly loads={loads} onBack={() => setScreen("list")} />
      )}
    </div>
  );
}
