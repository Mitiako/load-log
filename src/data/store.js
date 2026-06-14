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
