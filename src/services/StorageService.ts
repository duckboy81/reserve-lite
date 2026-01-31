export const RecentAirports = {
  get: (): string[] => {
    const recentAirports = localStorage.getItem("recent_airports");
    if (!recentAirports) return [];

    try {
      return JSON.parse(recentAirports);
    } catch (e) {
      return [];
    }
  },
  add: (code: string) => {
    if (!code || code.length !== 3) return;
    const list = RecentAirports.get();
    const unique = [code, ...list.filter((c) => c !== code)].slice(0, 10);
    localStorage.setItem("recent_airports", JSON.stringify(unique));
  },
  remove: (code: string) => {
    const list = RecentAirports.get().filter((c) => c !== code);
    localStorage.setItem("recent_airports", JSON.stringify(list));
  },
};
