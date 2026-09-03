export const INCIDENTS_UPDATED_EVENT = "veyra:incidents-updated";

export function notifyIncidentsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INCIDENTS_UPDATED_EVENT));
  }
}
