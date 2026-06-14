import { useState } from "react";
import { calcLoad, fmtDate, fmtMoney } from "../data/calc";

export default function LoadCard({ load, index, onClick, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const c = calcLoad(load);

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

  return (
    <div
      onClick={() => onClick(index)}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3 cursor-pointer active:bg-gray-800 relative"
    >
      {confirm ? (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="text-white text-sm mb-3">Delete this load?</div>
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
          <button
            onClick={handleDelete}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-600 hover:text-red-400 text-lg leading-none"
          >
            ×
          </button>
          <div className="text-white font-medium mb-1 pr-6">
            {load.from} → {load.to}
          </div>
          <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
            <span>
              {load.miles.toLocaleString()} mi · {fmtMoney(load.gross)}
            </span>
            <span
              className={
                c.net >= 0
                  ? "text-green-400 font-medium"
                  : "text-red-400 font-medium"
              }
            >
              Net profit: {fmtMoney(c.net)}
            </span>
          </div>
          <div className="text-xs text-gray-500">{fmtDate(load.date)}</div>
        </>
      )}
    </div>
  );
}
