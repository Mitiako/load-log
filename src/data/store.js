const LOADS_KEY = "tt_loads";
const SETTINGS_KEY = "tt_settings";

export function getLoads() {
  try {
    return JSON.parse(localStorage.getItem(LOADS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLoads(loads) {
  localStorage.setItem(LOADS_KEY, JSON.stringify(loads));
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

const LOCATIONS_KEY = "tt_locations";

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
