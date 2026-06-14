import LoadCard from "./LoadCard";

export default function LoadList({
  loads,
  onSelect,
  onAdd,
  onMonthly,
  onDelete,
}) {
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="px-4 py-4 border-b border-gray-800">
        <h1 className="text-white text-base font-medium">Load tracker</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3">
        {loads.length === 0 ? (
          <div className="text-center text-gray-500 text-sm pt-16">
            No loads yet.
            <br />
            Add your first load below.
          </div>
        ) : (
          loads.map((load, i) => (
            <LoadCard
              key={i}
              load={load}
              index={i}
              onClick={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <div className="px-3 pb-6 pt-2 space-y-2">
        <button
          onClick={onAdd}
          className="w-full py-3 bg-gray-900 border border-gray-700 rounded-2xl text-white text-sm font-medium"
        >
          + Add load
        </button>
        <button
          onClick={onMonthly}
          className="w-full py-3 border border-gray-800 rounded-2xl text-gray-400 text-sm"
        >
          Monthly summary
        </button>
      </div>
    </div>
  );
}
