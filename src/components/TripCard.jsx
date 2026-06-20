import { useState } from "react";
import { calcLoad, fmtMoney } from "../data/calc";

export default function TripCard({ trip, index, onClick, onEdit, onDelete }) {
  const [confirm, setConfirm] = useState(false);

  const totalNet = (trip.loads || []).reduce((s, l) => {
    const c = calcLoad(l);
    return s + c.net;
  }, 0);

  const totalMiles = (trip.loads || []).reduce(
    (s, l) => s + l.miles + (l.dh || 0),
    0,
  );

  function handleDelete(e) {
    e.stopPropagation();
    setConfirm(true);
  }

  function handleConfirm(e) {
    e.stopPropagation();
    onDelete(index);
  }

  function handleCancel(e) {
    e.stopPropagation();
    setConfirm(false);
  }

  function handleEdit(e) {
    e.stopPropagation();
    onEdit(index);
  }

  return (
    <div
      onClick={() => onClick(index)}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3 cursor-pointer active:bg-gray-800 relative"
    >
      {confirm ? (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="text-white text-sm mb-3">
            Delete this trip and all its loads?
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 bg-red-900 border border-red-700 rounded-xl text-red-300 text-sm font-medium"
            >
              Delete
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-2 border border-gray-700 rounded-xl text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-1">
            <div className="text-white font-medium text-sm pr-16">
              {trip.name}
            </div>
            <button
              onClick={handleEdit}
              className="text-gray-500 text-xs absolute top-4 right-4"
            >
              Edit
            </button>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>
              {(trip.loads || []).length} loads · {totalMiles.toLocaleString()}{" "}
              mi
            </span>
            <span
              className={
                totalNet >= 0
                  ? "text-green-400 font-medium"
                  : "text-red-400 font-medium"
              }
            >
              {fmtMoney(totalNet)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-gray-500">{trip.createdAt}</div>
            <button onClick={handleDelete} className="text-red-500 text-xs">
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
