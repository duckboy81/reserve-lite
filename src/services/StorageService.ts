export const RecentAirports = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem('recent_airports') || '["ATL", "LAX", "DTW", "MSP", "SLC", "JFK", "LGA", "SEA", "SFO", "ORD"]');
    } catch (e) { return ["ATL", "LAX"]; }
  },
  add: (code) => {
    if(!code || code.length !== 3) return;
    const list = RecentAirports.get();
    const unique = [code, ...list.filter(c => c !== code)].slice(0, 10);
    localStorage.setItem('recent_airports', JSON.stringify(unique));
  },
  remove: (code) => {
    const list = RecentAirports.get().filter(c => c !== code);
    localStorage.setItem('recent_airports', JSON.stringify(list));
  }
};
