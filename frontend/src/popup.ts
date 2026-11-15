/** Open a route as a compact demo popup that still shares the mission WebSocket. */
export function openMissionPopup(path: string, title: string) {
  const url = `${window.location.origin}${path}${path.includes("?") ? "&" : "?"}popup=1`;
  const features = "popup=yes,width=1100,height=720,menubar=no,toolbar=no,location=no,status=no";
  const win = window.open(url, title, features);
  win?.focus();
  return win;
}

export function isPopupMode() {
  return new URLSearchParams(window.location.search).get("popup") === "1";
}
