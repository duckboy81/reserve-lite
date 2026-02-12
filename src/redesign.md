```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flight Strategy Manager</title>
    
    <!-- External Libraries: Tailwind CSS for styling, Lucide for icons, Google Fonts -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    
    <style>
        /* Base Font Settings */
        body { font-family: 'Inter', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .hide { display: none; }
        
        /* Custom Scrollbar Styling for a cleaner look in the modal */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* Dialog (Modal) Animations */
        /* 'allow-discrete' enables transition on display property change */
        dialog { opacity: 0; transition: all 0.2s allow-discrete; }
        dialog[open] { opacity: 1; }
        dialog::backdrop { background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); opacity: 0; transition: opacity 0.2s; }
        dialog[open]::backdrop { opacity: 1; }

        /* Custom Loader Spinner for Search Button */
        .loader {
            border: 2px solid #f3f3f3; 
            border-top: 2px solid #4f46e5; 
            border-radius: 50%;
            width: 16px;
            height: 16px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">

    <!-- Main Workspace Container -->
    <!-- This is where the flight cards (Inbound/Outbound) will be injected by JavaScript -->
    <div class="pt-8 pb-12 px-4 flex justify-center">
        <div id="designContainer" class="w-full max-w-2xl">
            <!-- Content injected via renderApp() JS function -->
        </div>
    </div>

    <!-- Main Application Modal -->
    <!-- Used for both Adding new flights (Search tab) and Editing existing ones (Details tab) -->
    <dialog id="flightModal" class="bg-transparent p-0 w-full h-full fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md m-4 flex flex-col max-h-[90vh] pointer-events-auto transform scale-95 transition-transform duration-200 open:scale-100">
            
            <!-- Modal Header -->
            <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl z-10 shrink-0">
                <h3 id="modal-title" class="font-bold text-lg text-slate-800">Edit Flight Option</h3>
                <button onclick="closeModal()" class="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Tab Switcher (Search vs Details) -->
            <div class="px-4 pt-4 shrink-0">
                <div class="flex p-1 bg-slate-100 rounded-lg">
                    <button onclick="setModalMode('search')" id="tab-search" class="flex-1 py-1.5 text-sm font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all flex justify-center items-center gap-2">
                        <i data-lucide="search" class="w-3 h-3"></i> Search
                    </button>
                    <button onclick="setModalMode('manual')" id="tab-manual" class="flex-1 py-1.5 text-sm font-bold rounded-md bg-white text-indigo-600 shadow-sm transition-all flex justify-center items-center gap-2">
                        <i data-lucide="pen-tool" class="w-3 h-3"></i> Details
                    </button>
                </div>
            </div>

            <!-- Modal Content Body -->
            <div class="p-6 overflow-y-auto flex-1 min-h-0">
                
                <!-- VIEW 1: SEARCH TAB -->
                <div id="view-search" class="hidden space-y-4">
                    <!-- Search Input Form -->
                    <div id="search-form-container" class="space-y-4 transition-all duration-300">
                        <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">From</label>
                                <input type="text" id="search-org" maxlength="3" oninput="this.value = this.value.toUpperCase()" class="w-full font-bold text-xl border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1 uppercase bg-transparent placeholder-slate-300 transition-colors" placeholder="ORG">
                            </div>
                            <div class="pb-3 text-slate-300"><i data-lucide="arrow-right" class="w-5 h-5"></i></div>
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">To</label>
                                <input type="text" id="search-dst" maxlength="3" oninput="this.value = this.value.toUpperCase()" class="w-full font-bold text-xl border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1 uppercase bg-transparent placeholder-slate-300 transition-colors" placeholder="DST">
                            </div>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</label>
                            <input type="date" id="search-date" class="w-full border rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200 text-slate-700">
                        </div>
                        <div class="pt-2">
                            <button onclick="performSearch()" id="btn-search" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex justify-center gap-2 items-center">
                                Search Flights
                            </button>
                        </div>
                    </div>
                    
                    <!-- Search Results List (Hidden by default, shown after search) -->
                    <div id="search-results" class="hidden mt-0">
                        
                        <!-- Header Bar: Shows current search params and Edit button to go back -->
                        <div class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                            <div class="flex items-center gap-2 text-sm">
                                <span class="font-bold text-slate-800"><span id="res-org">ATL</span> <span class="text-slate-400">→</span> <span id="res-dst">ONT</span></span>
                                <span class="text-slate-300">|</span>
                                <span class="text-slate-500" id="res-date">Feb 14</span>
                            </div>
                            <button onclick="resetSearch()" class="text-xs font-bold text-indigo-600 hover:text-indigo-800">Edit</button>
                        </div>

                        <h4 id="results-count" class="text-xs font-bold text-slate-400 uppercase mb-3">Results found (0)</h4>
                        
                        <!-- Container for dynamic result rows -->
                        <div id="results-list" class="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                            <!-- Injected by JS -->
                        </div>
                    </div>
                </div>

                <!-- VIEW 2: DETAILS TAB (Previously Manual) -->
                <div id="view-manual" class="space-y-4">
                    <!-- Flight Number Input -->
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Flight Number</label>
                        <input type="text" id="input-manual-flight" maxlength="6" oninput="this.value = this.value.toUpperCase()" class="w-full border rounded-lg p-2 text-sm font-bold uppercase font-mono focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200" placeholder="DL123">
                    </div>
                    
                    <!-- Route Inputs -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Origin</label>
                            <input type="text" id="input-manual-org" maxlength="3" oninput="handleAirportInput(this, 'org')" class="w-full border rounded-lg p-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200" placeholder="ATL">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Dest</label>
                            <!-- handleAirportInput checks if this is not the hub, triggering ground transport logic -->
                            <input type="text" id="input-manual-dst" maxlength="3" oninput="handleAirportInput(this, 'dst')" class="w-full border rounded-lg p-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200" placeholder="LAX">
                        </div>
                    </div>

                    <!-- Gate Inputs -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Dep Gate</label>
                            <input type="text" id="input-manual-dep-gate" maxlength="4" class="w-full border rounded-lg p-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200" placeholder="--">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Arr Gate</label>
                            <input type="text" id="input-manual-arr-gate" maxlength="4" class="w-full border rounded-lg p-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200" placeholder="--">
                        </div>
                    </div>

                    <!-- Date/Time Inputs -->
                    <div class="grid grid-cols-1 gap-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Departure</label>
                                <div class="relative group">
                                    <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <i data-lucide="calendar" class="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors"></i>
                                    </div>
                                    <!-- Read-only input for pretty formatting -->
                                    <input type="text" id="display-dep" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200 text-slate-700 font-medium bg-white" readonly value="Select Date">
                                    <!-- Actual datetime-local input (invisible overlay) -->
                                    <input type="datetime-local" id="input-manual-dep" class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" onchange="updateDisplayTime(this, 'display-dep')">
                                </div>
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Arrival</label>
                                <div class="relative group">
                                    <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <i data-lucide="calendar" class="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors"></i>
                                    </div>
                                    <input type="text" id="display-arr" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200 text-slate-700 font-medium bg-white" readonly value="Select Date">
                                    <input type="datetime-local" id="input-manual-arr" class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" onchange="updateDisplayTime(this, 'display-arr')">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Ground Transport Toggle & Logic -->
                    <div class="border-t border-slate-100 pt-4 mt-2">
                        <div class="flex items-center justify-between mb-2">
                            <label class="text-xs font-bold text-slate-600 flex items-center gap-2">
                                <i data-lucide="car" class="w-4 h-4 text-slate-400"></i> Ground Transportation
                            </label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="chk-ground" onchange="toggleGroundDetails()" class="sr-only peer">
                                <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        
                        <!-- Ground Transport Form (Hidden unless toggle is checked) -->
                        <div id="ground-details" class="hidden animate-in slide-in-from-top-2 fade-in duration-200 pt-1">
                            <div class="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 space-y-3">
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mode</label>
                                        <select id="input-ground-mode" class="w-full border rounded-lg p-2 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-600 outline-none border-indigo-200 text-slate-700">
                                            <option value="Car">Uber/Lyft</option>
                                            <option value="Car">Rental Car</option>
                                            <option value="Train">Train</option>
                                            <option value="Shuttle">Shuttle</option>
                                        </select>
                                    </div>
                                    <div class="flex gap-2">
                                        <div class="w-full">
                                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hrs</label>
                                            <input type="number" id="input-ground-dur-h" class="w-full border rounded-lg p-2 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-600 outline-none border-indigo-200 text-slate-700">
                                        </div>
                                         <div class="w-full">
                                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Min</label>
                                            <input type="number" id="input-ground-dur-m" class="w-full border rounded-lg p-2 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-600 outline-none border-indigo-200 text-slate-700">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons (Delete / Save) -->
                    <div class="pt-2 flex gap-3 border-t border-slate-100 mt-4">
                        <button id="btn-delete" class="hidden w-1/3 bg-white border border-red-200 text-red-600 font-bold py-3 rounded-xl shadow-sm hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Delete
                        </button>
                        <button onclick="closeModal()" class="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-700 active:scale-[0.98] transition-all">
                            Save Flight
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </dialog>

    <script>
        // --- DATA STATE CONFIGURATION ---
        const activeAirport = "PHX"; // The central hub for this demo
        const reportTime = "12:00"; // Mock report time for pill calculations
        
        // --- HELPER FUNCTIONS ---

        // Helper to format Date Objects to HH:mm string (e.g. "14:30")
        const formatTime = (dateObj) => {
            return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        };
        
        // Helper to format Date Objects to Input Value string (YYYY-MM-DDTHH:mm)
        // Needed for <input type="datetime-local"> values
        const toDatetimeLocal = (dateObj) => {
            const pad = (n) => n < 10 ? '0' + n : n;
            return dateObj.getFullYear() +
                '-' + pad(dateObj.getMonth() + 1) +
                '-' + pad(dateObj.getDate()) +
                'T' + pad(dateObj.getHours()) +
                ':' + pad(dateObj.getMinutes());
        };

        // Helper: Pretty Print for ReadOnly Inputs (e.g., "Feb 14, 14:30")
        const toPrettyDate = (dateObj) => {
            return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ', ' + 
                   dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };
        
        // Helper: Calculate time difference duration between two HH:mm strings
        // Returns string like "2h 15m"
        const calculateDuration = (startStr, endStr) => {
            const [sh, sm] = startStr.split(':').map(Number);
            const [eh, em] = endStr.split(':').map(Number);
            
            let startMins = sh * 60 + sm;
            let endMins = eh * 60 + em;
            
            if (endMins < startMins) endMins += 24 * 60; // Handle Next day arrival
            
            const diff = endMins - startMins;
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            return `${h}h ${m.toString().padStart(2, '0')}m`;
        };

        // Helper to add duration (h, m) to a time string (HH:mm)
        // Used to calculate final arrival time after ground transport
        const addTime = (timeStr, h, m) => {
            const [th, tm] = timeStr.split(':').map(Number);
            let mins = tm + parseInt(m);
            let hrs = th + parseInt(h);
            
            if (mins >= 60) {
                hrs += Math.floor(mins / 60);
                mins = mins % 60;
            }
            if (hrs >= 24) hrs = hrs % 24;
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        }

        // --- MOCK DATA ---
        
        // Inbound Flights: Standard route is ATL -> PHX
        const inboundFlights = [
            // Flight showing previous day arrival context
            { id: 'in_1', airline: 'DL', flight: '123', org: 'ATL', dst: 'PHX', dep: '22:00', arr: '01:30', depGate: 'A12', arrGate: '42', depSup: '-1' },
            { id: 'in_2', airline: 'UA', flight: '892', org: 'ATL', dst: 'PHX', dep: '09:15', arr: '11:45', depGate: 'B2', arrGate: '12' }
        ];

        // Outbound Flights: Standard route is PHX -> ONT
        const outboundFlights = [
            { id: 'out_1', airline: 'DL', flight: '881', org: 'PHX', dst: 'ONT', dep: '16:30', arr: '17:45', depGate: '24B', arrGate: 'B1' },
            // Flight showing next day departure context
            { id: 'out_2', airline: 'AA', flight: '404', org: 'PHX', dst: 'ONT', dep: '01:00', arr: '02:15', depGate: '40', arrGate: 'C2', depSup: '+1', arrSup: '+1' },
            // Flight with GROUND TRANSPORT (PHX -> LAX, then drive to ONT)
            { 
                id: 'out_3', 
                airline: 'UA', 
                flight: '221', 
                org: 'PHX', 
                dst: 'LAX', // Lands at LAX, Drives to ONT
                dep: '14:00', 
                arr: '15:15', 
                depGate: 'F1', 
                arrGate: '2',
                ground: {
                    required: true,
                    mode: 'Car',
                    durationH: '2',
                    durationM: '00',
                    dest: 'ONT'
                }
            }
        ];

        // Sort flights logic: Ensure they appear in chronological order
        const sortByDep = (a, b) => a.dep.localeCompare(b.dep);
        inboundFlights.sort(sortByDep);
        outboundFlights.sort(sortByDep);

        // --- MAIN RENDER LOGIC ---

        function renderApp() {
            const container = document.getElementById('designContainer');
            
            // 1. Generate HTML for Inbound Flights
            const inboundHTML = inboundFlights.map((fl, index) => {
                // Determine if route is standard (ATL->PHX) to hide repetitive labels
                const isStandard = fl.org === 'ATL' && fl.dst === 'PHX';

                return `
                <div class="group relative bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-300 transition-all cursor-pointer pl-3 overflow-hidden">
                    <!-- Colored Status Bar -->
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <div class="p-3 flex items-center justify-between">
                        <div class="flex items-center gap-6">
                            <!-- Flight Info -->
                            <div class="font-mono text-sm font-bold text-slate-800 w-12 flex flex-col"><span class="text-xs text-slate-800 font-bold">${fl.airline}${fl.flight}</span></div>
                            <!-- Route & Times -->
                            <div class="flex items-center">
                                <div class="flex flex-col items-center w-14">
                                    <div class="text-sm font-bold text-slate-700 relative">
                                        ${fl.dep}
                                        <!-- Superscript for +1/-1 day indicators -->
                                        ${fl.depSup ? `<span class="absolute text-[0.6em] text-blue-500 font-bold ml-0.5 -mt-1.5 absolute">${fl.depSup}</span>` : ''}
                                    </div>
                                    <div class="text-[10px] font-bold text-slate-400">${fl.depGate}</div>
                                </div>
                                <div class="flex flex-col items-center w-12">
                                    <i data-lucide="arrow-right" class="w-3 h-3 text-slate-300"></i>
                                    <!-- Hide route text if standard, show if specific -->
                                    ${!isStandard ? `<div class="text-[9px] font-bold text-slate-300">${fl.org}-${fl.dst}</div>` : ''}
                                </div>
                                <div class="flex flex-col items-center w-14">
                                    <div class="text-sm font-bold text-slate-700 relative">
                                        ${fl.arr}
                                        ${fl.arrSup ? `<span class="absolute text-[0.6em] text-blue-500 font-bold ml-0.5 -mt-1.5 absolute">${fl.arrSup}</span>` : ''}
                                    </div>
                                    <div class="text-[10px] font-bold text-slate-400">${fl.arrGate}</div>
                                </div>
                            </div>
                        </div>
                        <!-- Edit Pencil -->
                        <button onclick="openModal('edit', '${fl.id}')" class="text-slate-300 hover:text-blue-600 p-2 -mr-2"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `}).join('');

            // 2. Generate HTML for Outbound Flights
            const outboundHTML = outboundFlights.map((fl, index) => {
                let groundHTML = '';
                const isStandard = fl.org === 'PHX' && fl.dst === 'ONT';
                
                // Logic: If ground transport is required, render the additional vertical segment
                if (fl.ground && fl.ground.required) {
                    const finalArrTime = addTime(fl.arr, fl.ground.durationH, fl.ground.durationM);
                    
                    groundHTML = `
                        <div class="border-l border-slate-100 pl-3 ml-1 flex flex-col justify-center">
                            <div class="flex flex-col items-center">
                                <div class="w-full text-center relative text-sm font-bold text-slate-800">
                                    ${finalArrTime}
                                </div>
                                <div class="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                    <span class="text-indigo-500 bg-indigo-50 px-1 rounded">+${fl.ground.durationH}h</span>
                                    <span>${fl.dst}</span><i data-lucide="arrow-right" class="w-2 h-2"></i><span>${fl.ground.dest}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }

                // Logic: Generate "Pills" for Layover times
                const layover1 = calculateDuration(inboundFlights[0].arr, fl.dep);
                const layover2 = inboundFlights[1] ? calculateDuration(inboundFlights[1].arr, fl.dep) : null;
                const reportPill = "2h 00m"; 

                return `
                <div class="relative mb-6"> <!-- Wrapper to create spacing for floating pills -->
                    <div class="group relative bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 transition-all cursor-pointer pl-3 overflow-visible z-10">
                        <div class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-lg"></div>
                        <div class="p-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-6">
                                    <div class="font-mono text-sm font-bold text-slate-800 w-12 flex flex-col"><span class="text-xs text-slate-800 font-bold">${fl.airline}${fl.flight}</span></div>
                                    <div class="flex items-center">
                                        <!-- Departure Block -->
                                        <div class="flex flex-col items-center w-14">
                                            <div class="text-sm font-bold text-slate-700 relative">
                                                ${fl.dep}
                                                ${fl.depSup ? `<span class="absolute text-[0.6em] text-indigo-500 font-bold ml-0.5 -mt-1.5 absolute">${fl.depSup}</span>` : ''}
                                            </div>
                                            <div class="text-[10px] font-bold text-slate-400">${fl.depGate}</div>
                                        </div>
                                        <!-- Arrow / Route -->
                                        <div class="flex flex-col items-center w-12">
                                            <i data-lucide="arrow-right" class="w-3 h-3 text-slate-300"></i>
                                            ${!isStandard ? `<div class="text-[9px] font-bold text-slate-300">${fl.org}-${fl.dst}</div>` : ''}
                                        </div>
                                        <!-- Arrival Block -->
                                        <div class="flex flex-col items-center w-14">
                                            <div class="text-sm font-bold text-slate-700 relative">
                                                ${fl.arr}
                                                ${fl.arrSup ? `<span class="absolute text-[0.6em] text-indigo-500 font-bold ml-0.5 -mt-1.5 absolute">${fl.arrSup}</span>` : ''}
                                            </div>
                                            <div class="text-[10px] font-bold text-slate-400">${fl.arrGate}</div>
                                        </div>
                                        <!-- Optional Ground Transport Block -->
                                        ${groundHTML}
                                    </div>
                                </div>
                                <button onclick="openModal('edit', '${fl.id}')" class="text-slate-300 hover:text-indigo-600 p-2 -mr-2"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                            </div>
                        </div>
                        
                        <!-- Floating Pills: Layover Times -->
                        <div class="absolute -bottom-2.5 left-4 flex gap-1 z-20">
                            <div class="bg-white border border-slate-200 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div> ${layover1}
                            </div>
                            ${layover2 ? `
                            <div class="bg-white border border-slate-200 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                <div class="w-1.5 h-1.5 rounded-full bg-blue-300"></div> ${layover2}
                            </div>` : ''}
                        </div>
                        <!-- Floating Pill: Report Time -->
                        <div class="absolute -bottom-2.5 right-4 z-20">
                            <div class="bg-white border border-slate-200 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Report: ${reportPill}
                            </div>
                        </div>

                    </div>
                </div>
                `;
            }).join('');

            // 3. Inject Content into Main Container
            container.innerHTML = `
                <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <div class="flex justify-between items-end mb-2">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <i data-lucide="plane-takeoff" class="w-3 h-3 text-blue-500"></i> Inbound • To PHX
                            </label>
                            <button onclick="openModal('add', 'inbound')" class="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1.5 rounded hover:bg-blue-100 transition-colors">+ Add</button>
                        </div>
                        <div class="space-y-3">
                            ${inboundHTML}
                        </div>
                    </div>

                    <div>
                         <div class="flex justify-between items-end mb-2">
                             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <i data-lucide="plane-landing" class="w-3 h-3 text-indigo-500"></i> Outbound • From PHX
                            </label>
                             <button onclick="openModal('add', 'outbound')" class="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1.5 rounded hover:bg-indigo-100 transition-colors">+ Add</button>
                        </div>
                        <div class="space-y-3">
                            ${outboundHTML}
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize Lucide Icons
            lucide.createIcons();
        }

        // --- MODAL LOGIC ---

        const modal = document.getElementById('flightModal');
        let currentMode = 'manual';

        // Opens modal in either Add or Edit mode
        function openModal(action, contextId) {
            modal.showModal();
            modal.classList.add('open');
            
            // Clear inputs
            document.querySelectorAll('input').forEach(i => i.value = '');
            document.getElementById('chk-ground').checked = false;
            toggleGroundDetails(); 

            const btnDelete = document.getElementById('btn-delete');
            const title = document.getElementById('modal-title');

            // Default dates logic for input presets
            const now = new Date();
            const todayStr = toDatetimeLocal(now);
            const laterStr = toDatetimeLocal(new Date(now.getTime() + 2 * 60 * 60 * 1000));
            
            // Set default date/times for Details form
            document.getElementById('input-manual-dep').value = todayStr;
            document.getElementById('input-manual-arr').value = laterStr;
            updateDisplayTime(document.getElementById('input-manual-dep'), 'display-dep');
            updateDisplayTime(document.getElementById('input-manual-arr'), 'display-arr');

            if (action === 'add') {
                // Add Mode: Start on Search Tab
                title.innerText = 'Add Flight Option';
                btnDelete.classList.add('hidden');
                setModalMode('search'); 
                
                document.getElementById('search-date').value = now.toISOString().split('T')[0];
            } else {
                // Edit Mode: Start on Details Tab
                title.innerText = 'Edit Flight Option';
                btnDelete.classList.remove('hidden');
                setModalMode('manual');
                
                // Find and populate data
                const allFlights = [...inboundFlights, ...outboundFlights];
                const flight = allFlights.find(f => f.id === contextId);

                if (flight) {
                    document.getElementById('input-manual-flight').value = flight.airline + flight.flight;
                    document.getElementById('input-manual-org').value = flight.org;
                    document.getElementById('input-manual-dst').value = flight.dst;
                    document.getElementById('input-manual-dep-gate').value = flight.depGate;
                    document.getElementById('input-manual-arr-gate').value = flight.arrGate;

                    if (flight.ground && flight.ground.required) {
                        document.getElementById('chk-ground').checked = true;
                        document.getElementById('input-ground-mode').value = flight.ground.mode;
                        document.getElementById('input-ground-dur-h').value = flight.ground.durationH;
                        document.getElementById('input-ground-dur-m').value = flight.ground.durationM;
                        toggleGroundDetails();
                    }
                }
            }
        }

        // Close with animation
        function closeModal() {
            modal.classList.remove('open');
            setTimeout(() => modal.close(), 200);
        }

        // Tab Switching Logic
        function setModalMode(mode) {
            currentMode = mode;
            const btnSearch = document.getElementById('tab-search');
            const btnManual = document.getElementById('tab-manual');
            const viewSearch = document.getElementById('view-search');
            const viewManual = document.getElementById('view-manual');

            if (mode === 'search') {
                // Activate Search Tab
                btnSearch.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
                btnSearch.classList.remove('text-slate-500', 'hover:text-slate-700');
                btnManual.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
                btnManual.classList.add('text-slate-500', 'hover:text-slate-700');
                viewSearch.classList.remove('hidden');
                viewManual.classList.add('hidden');
            } else {
                // Activate Details Tab
                btnManual.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
                btnManual.classList.remove('text-slate-500', 'hover:text-slate-700');
                btnSearch.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
                btnSearch.classList.add('text-slate-500', 'hover:text-slate-700');
                viewManual.classList.remove('hidden');
                viewSearch.classList.add('hidden');
            }
        }

        // --- INTERACTIVITY ---

        // Update the "Pretty" input when the invisible datetime picker changes
        function updateDisplayTime(input, displayId) {
            const display = document.getElementById(displayId);
            if (input.value) {
                const date = new Date(input.value);
                display.value = toPrettyDate(date);
            } else {
                display.value = "Select Date";
            }
        }

        // Toggle visibility of Ground Transport form
        function toggleGroundDetails() {
            const chk = document.getElementById('chk-ground');
            const details = document.getElementById('ground-details');
            if (chk.checked) {
                details.classList.remove('hidden');
            } else {
                details.classList.add('hidden');
            }
        }

        // Auto-detect if Ground Transport is needed based on destination input
        function handleAirportInput(input, type) {
            input.value = input.value.toUpperCase();
            
            if (type === 'dst') {
                const val = input.value;
                const chk = document.getElementById('chk-ground');
                
                // If destination is not the active Hub (PHX), assume ground transport is needed
                // Note: Logic allows PHX to be destination without ground transport
                if (val.length === 3 && val !== activeAirport) {
                    chk.checked = true;
                    toggleGroundDetails();
                } else if (val.length === 3 && val === activeAirport) {
                    chk.checked = false;
                    toggleGroundDetails();
                }
            }
        }

        // Mock Search Functionality
        function performSearch() {
            const btn = document.getElementById('btn-search');
            const originalText = btn.innerHTML;
            const searchForm = document.getElementById('search-form-container');
            const searchResults = document.getElementById('search-results');
            const resultsList = document.getElementById('results-list');
            const resultsCount = document.getElementById('results-count');
            
            // Get user input for header
            const org = document.getElementById('search-org').value || 'ORG';
            const dst = document.getElementById('search-dst').value || 'DST';
            const dateVal = document.getElementById('search-date').value;
            const displayDate = dateVal ? new Date(dateVal).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 'Date';

            // Show Loading State
            btn.innerHTML = '<div class="loader"></div> Searching...';
            btn.disabled = true;
            btn.classList.add('opacity-80', 'cursor-not-allowed');

            // Simulate API delay
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.classList.remove('opacity-80', 'cursor-not-allowed');
                
                // Update Results Header
                document.getElementById('res-org').textContent = org;
                document.getElementById('res-dst').textContent = dst;
                document.getElementById('res-date').textContent = displayDate;

                searchForm.classList.add('hidden');
                searchResults.classList.remove('hidden');

                // Generate Mock Flight Results
                let html = '';
                const airlines = ['DL', 'UA', 'AA', 'WN'];
                const gates = ['A12', 'B04', 'C22', 'D01', 'T10', 'E15'];
                
                const searchDate = dateVal ? new Date(dateVal) : new Date();
                searchDate.setHours(0,0,0,0);

                // Generate 14 random flights
                for (let i = 0; i < 14; i++) {
                    const airline = airlines[Math.floor(Math.random() * airlines.length)];
                    const flightNum = Math.floor(100 + Math.random() * 900);
                    const gate = gates[Math.floor(Math.random() * gates.length)];
                    
                    // Logic to ensure diverse times, including overnight
                    let depH, depM;
                    if (i === 1) { // Force one late flight
                         depH = 23; 
                         depM = 30;
                    } else {
                         depH = 6 + i; 
                         if (depH > 23) depH = depH - 24; 
                         depM = Math.floor(Math.random() * 60);
                    }

                    const durH = 2 + Math.floor(Math.random() * 3);
                    const durM = Math.floor(Math.random() * 60);
                    
                    const flDep = new Date(searchDate);
                    flDep.setHours(depH, depM);
                    
                    const flArr = new Date(flDep);
                    flArr.setHours(depH + durH, depM + durM);
                    
                    const isNextDay = flArr.getDate() !== flDep.getDate();

                    const depStr = formatTime(flDep);
                    const arrStr = formatTime(flArr);
                    const depISO = toDatetimeLocal(flDep);
                    const arrISO = toDatetimeLocal(flArr);

                    html += `
                        <button onclick="selectSearchResult('${airline}${flightNum}', '${dst}', '${depISO}', '${arrISO}', '${gate}')" class="w-full bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all group text-left">
                            <div class="flex items-center gap-3">
                                <div class="bg-indigo-50 text-indigo-600 text-[10px] font-bold w-8 h-8 rounded flex items-center justify-center">${airline}</div>
                                <div>
                                    <div class="font-bold text-slate-800 text-sm relative">
                                        ${depStr} - ${arrStr}${isNextDay ? '<span class="text-[0.6em] text-indigo-500 font-bold ml-0.5 -mt-1.5 absolute">+1</span>' : ''}
                                    </div>
                                    <div class="text-xs text-slate-400 flex items-center gap-1.5">
                                        <span>${airline} ${flightNum}</span>
                                        <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>${gate}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-slate-50 text-slate-400 px-2 py-1 rounded text-xs font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">Select</div>
                        </button>
                    `;
                }

                resultsList.innerHTML = html;
                resultsCount.innerText = "Results found (14)";

            }, 800); 
        }

        // When a user selects a flight from search results, populate manual form and switch tabs
        function selectSearchResult(flightCode, dst, depISO, arrISO, gate) {
            setModalMode('manual');
            
            document.getElementById('input-manual-flight').value = flightCode;
            document.getElementById('input-manual-dst').value = dst;
            
            document.getElementById('input-manual-dep').value = depISO;
            document.getElementById('input-manual-arr').value = arrISO;
            
            document.getElementById('input-manual-dep-gate').value = gate;

            updateDisplayTime(document.getElementById('input-manual-dep'), 'display-dep');
            updateDisplayTime(document.getElementById('input-manual-arr'), 'display-arr');

            // Trigger ground transport logic
            const dstInput = document.getElementById('input-manual-dst');
            handleAirportInput(dstInput, 'dst');
        }

        function resetSearch() {
            document.getElementById('search-form-container').classList.remove('hidden');
            document.getElementById('search-results').classList.add('hidden');
        }

        // Close modal on clicking backdrop
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        // Initialize App
        renderApp();

    </script>
</body>
</html>
```