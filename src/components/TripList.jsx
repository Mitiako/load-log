import TripCard from "./TripCard";

export default function TripList({
  trips,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}) {
  return (
    <div className="flex flex-col bg-gray-950" style={{ height: "100dvh" }}>
      <div className="px-4 py-4 border-b border-gray-800">
        <h1 className="text-white text-base font-medium">Load Log</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3">
        {trips.length === 0 ? (
          <div className="text-center text-gray-500 text-sm pt-16">
            No trips yet.
            <br />
            Create your first trip below.
          </div>
        ) : (
          trips.map((trip, i) => (
            <TripCard
              key={trip.id}
              trip={trip}
              index={i}
              onClick={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <div className="px-3 pb-6 pt-2 bg-gray-950 border-t border-gray-800">
        <button
          onClick={onCreate}
          className="w-full py-3 bg-gray-900 border border-gray-700 rounded-2xl text-white text-sm font-medium"
        >
          + Create a Trip
        </button>
      </div>
    </div>
  );
}
