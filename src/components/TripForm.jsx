import { useState } from "react";
import { generateTripName } from "../data/store";

export default function TripForm({ trips, trip, onSave, onBack }) {
  const [name, setName] = useState(trip ? trip.name : generateTripName(trips));

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim());
  }

  return (
    <div className="flex flex-col bg-gray-950" style={{ height: "100dvh" }}>
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 text-sm">
          ← Back
        </button>
        <h1 className="text-white text-base font-medium flex-1">
          {trip ? "Edit Trip" : "New Trip"}
        </h1>
      </div>

      <div className="flex-1 p-4">
        <label className="block text-xs text-gray-500 mb-2">Trip name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-3 text-white text-sm outline-none focus:border-gray-500"
          autoFocus
        />
        <p className="text-xs text-gray-600 mt-2">
          You can use any name — the default is auto-generated.
        </p>
      </div>

      <div className="px-4 pb-8">
        <button
          onClick={handleSave}
          className="w-full py-3 bg-gray-900 border border-gray-700 rounded-2xl text-white font-medium"
        >
          {trip ? "Save changes" : "Create Trip"}
        </button>
      </div>
    </div>
  );
}
