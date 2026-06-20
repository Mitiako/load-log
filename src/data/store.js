const TRIPS_KEY = "tt_trips";
const SETTINGS_KEY = "tt_settings";
const LOCATIONS_KEY = "tt_locations";

export function getTrips() {
  try {
    return JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveTrips(trips) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getLocations() {
  try {
    return JSON.parse(localStorage.getItem(LOCATIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLocation(location) {
  if (!location || location.trim().length < 2) return;
  const locations = getLocations();
  const trimmed = location.trim();
  if (!locations.includes(trimmed)) {
    locations.unshift(trimmed);
    if (locations.length > 50) locations.pop();
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  }
}

export function generateTripName(trips) {
  const num = trips.length + 1;
  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  return `Trip #${num} · ${today}`;
}

export function generateTripId() {
  return "trip_" + Date.now();
}
