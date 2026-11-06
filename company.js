// Kigali Connect (kgl-c) — Company App Logic (API-Integrated)

const API_BASE = window.location.origin;

// Auth helpers
function getAuthToken() { return sessionStorage.getItem('kglc_token'); }
function getAuthAdminId() { return sessionStorage.getItem('kglc_admin_id'); }
function getAuthCompanyId() { return sessionStorage.getItem('kglc_company_id'); }

function authHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiFetch(path, options = {}) {
  const headers = { ...authHeaders(), ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error ${res.status}`);
  }
  return res.json();
}

let vehicles = [];
        let liabilities = [];
        let currentLang = 'en';
        let currentBusTab = 'ALL';
        let currentZoomLevel = 'weeks';

        let map = null;
        let homeMap = null;
        let mapInitialized = false;
        let homeMapInitialized = false;
        let pendingVehicleCache = null;

        // API data cache
        let dashboardData = null;
        let revenueData = null;
        let fleetData = [];
        let vehicleLocations = [];

        const i18n = {
            en: {
                setupEnv: "Admin Sign In",
                lblOrgName: "Email Address",
                lblPassword: "Password",
                btnEnter: "Enter System",
                navHome: "Home",
                navTransport: "Transport Status",
                navVehicle: "Vehicle Status",
                navFinancial: "Financial Status",
                navReports: "Reports",
                navSettings: "Settings",
                subReports: "Build custom reports by assembling data components on the workshop canvas.",
                reportOutput: "Report Output",
                lblExportAs: "Export as",
                btnExport: "Export",
                reportEmpty: "No report produced yet. Assemble components in the workshop, then press \"produce report\".",
                workshopTitle: "Workshop",
                componentsLbl: "Components",
                btnCreateData: "+ Create data component",
                canvasHint: "Drag components here",
                btnProduce: "produce report",
                btnClearCanvas: "clear",
                btnCancelOnboard: "\u00d7 Cancel Onboarding",
                subHome: "Here is a quick overview of your system core.",
                btnOnboard: "+ Onboard New Vehicle",
                titleAddBus: "Add Bus",
                lblPlate: "Bus Plate Number",
                lblBusModel: "Bus Model",
                lblBusCapacity: "Seating Capacity",
                lblBusYear: "Year Manufactured",
                lblBusModel: "Bus Model",
                lblBusCapacity: "Seating Capacity",
                lblBusYear: "Year Manufactured",
                lblControlDate: "Previous Control Technique Date (Optional)",
                lblHours: "Working Hours Profile (Use format HH:MM - HH:MM)",
                lblHoursSecondary: "Secondary Working Hours Profile",
                btnBuySub: "Buy Subscription",
                subReg: "Subscription Registered!",
                lblToken: "Client Token:",
                sumFleet: "Total Fleet",
                sumActive: "Active Routing",
                sumLedger: "System Ledger",
                titleActiveFleet: "Active Fleet Monitor Summary",
                thPlate: "Plate Number",
                thShift: "Shift Window",
                thStatus: "Status Metrics",
                thControl: "Technical Control Countdown",
                noFleetMsg: "No tracked telemetry logs. Launch onboard configuration button to mount vehicles.",
                titleRecentBookings: "Recent Bookings",
                thBookingId: "Ticket #",
                thPassenger: "Passenger",
                thRoute: "Route",
                thSeat: "Seat",
                thPrice: "Price",
                noBookingsMsg: "No recent bookings.",
                titleVehicleLogs: "Vehicle Activity Logs",
                thLogType: "Log Type",
                thLogNotes: "Notes",
                noLogsMsg: "No vehicle logs recorded.",
                subTransport: "Live OpenStreetMap telemetry routing overlay grids.",
                subVehicle: "Hardware telematics, live countdowns, and deployment tokens.",
                titleFleetReg: "Active Fleet Registrations",
                thHours: "Working Hours",
                thToken: "Sync Token",
                thLoc: "Live Location (Words)",
                subFinancial: "Balance sheets, live passenger counts, and liabilities auditing.",
                titleBusRevenue: "Bus Revenue & Passenger Metrics",
                btnAddLiabilities: "+ Add Liabilities",
                lblBoarded: "Passengers Boarded",
                lblGrossIncome: "Gross Revenue",
                lblNetBalance: "Net Balance",
                titleIncomeTrend: "Income vs Time Trend",
                zoomHours: "Hours",
                zoomWeeks: "Weeks",
                zoomMonths: "Months",
                zoomYears: "Years",
                titleLiabilitiesLog: "Registered System Liabilities",
                thDesc: "Description",
                thCost: "Liability Cost",
                thDate: "Timestamp",
                noLiabilitiesMsg: "No outstanding liabilities recorded.",
                titleAddLiability: "Add System Liability",
                subAddLiability: "Register operational overhead, maintenance, and fleet expenses.",
                lblLiabilityDesc: "Liabilities Description",
                lblLiabilityCost: "Liability Cost (RWF)",
                lblLiabilityCategory: "Category",
                lblLiabilityCategory: "Category",
                btnRecordLiability: "Record Liability",
                titleDayoffModes: "Select Dayoff Configuration Mode",
                btnConstantDays: "Constant Days",
                btnCalendar: "Calendar",
                btnConstantCalendar: "Constant Days + Calendar",
                subSettings: "Customize your environment and navigation access layout.",
                setTransport: "Enable Transport Status",
                setVehicle: "Enable Vehicle Status",
                setFinancial: "Enable Financial Status",
                tabSignup: "Sign Up",
                tabLogin: "Login",
                lblCompanyName: "Company Name",
                lblCompanyEmail: "Company Email",
                btnCreateAccount: "Create Account",
                linkNoAccount: "Don't have an account? Sign Up",
                linkAlreadyAccount: "Already have an account? Login",
                signupError: "Registration failed. Please try again.",
                loginError: "Login failed. Check company name and password."
            },
            rw: {
                setupEnv: "Kwinjira kwa Muyobozi",
                lblOrgName: "Imeyili",
                lblPassword: "Ijambo ry'ibanga",
                btnEnter: "Kwinjira mu Sisitemu",
                navHome: "Ahabanza",
                navTransport: "Ibisubizo by'Ingendo",
                navVehicle: "Imiterere y'Ibibaho",
                navFinancial: "Imari n'Umutungo",
                navReports: "Raporo",
                navSettings: "Igenamiterere",
                subReports: "Kora raporo zawe uhuza ibice by'amakuru ku kibaho cy'akazi.",
                reportOutput: "Ibisohoka mu Raporo",
                lblExportAs: "Ohereza nka",
                btnExport: "Ohereza",
                reportEmpty: "Nta raporo irakorwa. Huza ibice mu kazi, hanyuma ukande \"kora raporo\".",
                workshopTitle: "Ikazi",
                componentsLbl: "Ibice",
                btnCreateData: "+ Kora igice cy'amakuru",
                canvasHint: "Kurura ibice hano",
                btnProduce: "kora raporo",
                btnClearCanvas: "siba",
                btnCancelOnboard: "\u00d7 Hagarika Kwinjiza",
                subHome: "Inshamake y'imikorere ya sisitemu mu ncamake.",
                btnOnboard: "+ Kwinjiza Bisi Nshya",
                titleAddBus: "Soma Bisi",
                lblPlate: "Pulaaki ya Bisi",
                lblBusModel: "Model ya Bisi",
                lblBusCapacity: "Ubwoko bw'Intebe",
                lblBusYear: "Umwaka Wakozwemo",
                lblControlDate: "Iharagazwa rya Kontoroli (Ihitamo)",
                lblHours: "Amasaha y'Aziro (Urugero: 08:00 - 18:00)",
                lblHoursSecondary: "Amasaha ya Kabiri y'Akazi",
                btnBuySub: "Gura Ifatabuguzi",
                subReg: "Ifatabuguzi Ryemejwe!",
                lblToken: "Inyandiko y'Umutekano:",
                sumFleet: "Bisi Zose",
                sumActive: "Iziri mu Muhanda",
                sumLedger: "Imiterere y'Imari",
                titleActiveFleet: "Inshamake y'Imodoka Ziri mu Muhanda",
                thPlate: "Pulaaki",
                thShift: "Amasaha",
                thStatus: "Imiterere",
                thControl: "Igihe cya Kontoroli",
                noFleetMsg: "Nta bisi zibaruye. Kanda kuri 'Kwinjiza Bisi Nshya' ubyinjize.",
                titleRecentBookings: "Kugarura Ibyo Kwemejwe",
                thBookingId: "Tiketi #",
                thPassenger: "Umunyagendo",
                thRoute: "Umurongo",
                thSeat: "Intebe",
                thPrice: "Amafaranga",
                noBookingsMsg: "Nta byemejwe bishya.",
                titleVehicleLogs: "Ibyanditswe by'Imikorere y'Bisi",
                thLogType: "Ubwoko bw'Ibyanditswe",
                thLogNotes: "Ibisobanuro",
                noLogsMsg: "Nta byanditswe bya bisi birahari.",
                subTransport: "Ikarita irambuye y'ingendo za OpenStreetMap.",
                subVehicle: "Ibyuma by'ikoranabuhanga n'ibarura ry'ibinyabiziga.",
                titleFleetReg: "Urutonde rw'Ibinyabiziga Biri mu Muhanda",
                thHours: "Amasaha y'Akazi",
                thToken: "Ikode Ryihariye",
                thLoc: "Ahantu Herereye",
                subFinancial: "Ibarura ry'abagenzi, inyungu n'amadeni.",
                titleBusRevenue: "Umusaruro w'Abagenzi n'Inyungu",
                btnAddLiabilities: "+ Andika Umwenda / Ikigo",
                lblBoarded: "Abagenzi Binjiye",
                lblGrossIncome: "Amasunzu Yashowe",
                lblNetBalance: "Amasunzu Asigaye",
                titleIncomeTrend: "Igipimo cy'Inyungu ku gihe",
                zoomHours: "Amasaha",
                zoomWeeks: "Ibyumweru",
                zoomMonths: "Amezi",
                zoomYears: "Imyaka",
                titleLiabilitiesLog: "Urutonde rw'Amadeni y'Ikigo",
                thDesc: "Ibisobanuro",
                thCost: "Igiciro (RWF)",
                thDate: "Itariki",
                noLiabilitiesMsg: "Nta madeni cyangwa ibyakoreshejwe birandikwa.",
                titleAddLiability: "Kwandika Umwenda / Ikigo",
                subAddLiability: "Andika ibyakoreshejwe mu gusana no gukurikirana bisi.",
                lblLiabilityDesc: "Ibisobanuro by'Ibyakoreshejwe",
                lblLiabilityCost: "Amahfaranga Yakuweho (RWF)",
                lblLiabilityCategory: "Icyiciro",
                btnRecordLiability: "Bika Ibihereranyo",
                titleDayoffModes: "Hitamo Uburyo bwa Dayoffs",
                btnConstantDays: "Iminsi ihoraho",
                btnCalendar: "Kalenda",
                btnConstantCalendar: "Iminsi ihoraho + Kalenda",
                subSettings: "Hindura uko ikarita n'amenu bigaragara.",
                setTransport: "Erekana Ikarita y'Ingendo",
                setVehicle: "Erekana Imiterere y'Ibibaho",
                setFinancial: "Erekana Imari n'Umutungo",
                tabSignup: "Kwandika",
                tabLogin: "Kwinjira",
                lblCompanyName: "Izina ry'Ikigo",
                lblCompanyEmail: "Imeyili y'Ikigo",
                btnCreateAccount: "Kora Konti",
                linkNoAccount: "Nta konti ufite? Kwandika",
                linkAlreadyAccount: "Ufite konti? Kwinjira",
                signupError: "Kwandika byanze. Ongera ugerageze.",
                loginError: "Kwinjira byanze. Suzuma izina ry'ikigo n'ijambo ry'ibanga."
            },
            fr: {
                setupEnv: "Connexion Admin",
                lblOrgName: "Adresse Email",
                lblPassword: "Mot de passe",
                btnEnter: "Entrer dans le Système",
                navHome: "Accueil",
                navTransport: "Statut du Transport",
                navVehicle: "Statut du Véhicule",
                navFinancial: "Statut Financier",
                navReports: "Rapports",
                navSettings: "Paramètres",
                subReports: "Créez des rapports personnalisés en assemblant des composants de données sur le canevas de l'atelier.",
                reportOutput: "Résultat du Rapport",
                lblExportAs: "Exporter en",
                btnExport: "Exporter",
                reportEmpty: "Aucun rapport généré. Assemblez des composants dans l'atelier, puis appuyez sur \"produire le rapport\".",
                workshopTitle: "Atelier",
                componentsLbl: "Composants",
                btnCreateData: "+ Créer un composant de données",
                canvasHint: "Glissez les composants ici",
                btnProduce: "produire le rapport",
                btnClearCanvas: "effacer",
                btnCancelOnboard: "\u00d7 Annuler l'Enregistrement",
                subHome: "Aperçu rapide du cœur de votre système.",
                btnOnboard: "+ Enregistrer un Véhicule",
                titleAddBus: "Ajouter un Bus",
                lblPlate: "Plaque d'Immatriculation",
                lblBusModel: "Modèle du Bus",
                lblBusCapacity: "Capacité d'Assises",
                lblBusYear: "Année de Fabrication",
                lblControlDate: "Date du Contrôle Technique (Optionnel)",
                lblHours: "Profil Horaire (Format HH:MM - HH:MM)",
                lblHoursSecondary: "Profil Horaire Secondaire",
                btnBuySub: "Acheter un Abonnement",
                subReg: "Abonnement Enregistré !",
                lblToken: "Jeton Client :",
                sumFleet: "Flotte Totale",
                sumActive: "En Circulation",
                sumLedger: "Registre Système",
                titleActiveFleet: "Résumé du Suivi de la Flotte Active",
                thPlate: "N° de Plaque",
                thShift: "Plage Horaire",
                thStatus: "Indicateurs",
                thControl: "Décompte Contrôle Technique",
                noFleetMsg: "Aucun véhicule suivi. Cliquez sur le bouton d'embarquement pour ajouter.",
                titleRecentBookings: "Réservations Récentes",
                thBookingId: "Billet #",
                thPassenger: "Passager",
                thRoute: "Trajet",
                thSeat: "Siège",
                thPrice: "Prix",
                noBookingsMsg: "Aucune réservation récente.",
                titleVehicleLogs: "Journal d'Activité des Véhicules",
                thLogType: "Type de Journal",
                thLogNotes: "Notes",
                noLogsMsg: "Aucun journal de véhicule enregistré.",
                subTransport: "Grille de télémétrie en direct via OpenStreetMap.",
                subVehicle: "Télématique matérielle et jetons de déploiement.",
                titleFleetReg: "Inscriptions Actives de la Flotte",
                thHours: "Heures de Travail",
                thToken: "Jeton de Sync",
                thLoc: "Position En Direct",
                subFinancial: "Bilan financier, comptage des passagers et gestion des charges.",
                titleBusRevenue: "Revenus des Bus & Passagers",
                btnAddLiabilities: "+ Ajouter un Passif",
                lblBoarded: "Passagers Embarqués",
                lblGrossIncome: "Revenu Brut",
                lblNetBalance: "Solde Net",
                titleIncomeTrend: "Tendance Revenus vs Temps",
                zoomHours: "Heures",
                zoomWeeks: "Semaines",
                zoomMonths: "Mois",
                zoomYears: "Années",
                titleLiabilitiesLog: "Registre des Passifs Système",
                thDesc: "Description",
                thCost: "Coût du Passif",
                thDate: "Horodatage",
                noLiabilitiesMsg: "Aucun passif enregistré.",
                titleAddLiability: "Ajouter une Charge / Passif",
                subAddLiability: "Enregistrer les frais d'exploitation et de maintenance.",
                lblLiabilityDesc: "Description du Passif",
                lblLiabilityCost: "Coût (RWF)",
                lblLiabilityCategory: "Catégorie",
                btnRecordLiability: "Enregistrer le Passif",
                titleDayoffModes: "Sélectionner le mode de configuration",
                btnConstantDays: "Jours constants",
                btnCalendar: "Calendrier",
                btnConstantCalendar: "Jours constants + Calendrier",
                subSettings: "Personnaliser l'interface et les accès du menu.",
                setTransport: "Activer le Statut du Transport",
                setVehicle: "Activer le Statut du Véhicule",
                setFinancial: "Activer le Statut Financier",
                tabSignup: "S'inscrire",
                tabLogin: "Connexion",
                lblCompanyName: "Nom de l'Entreprise",
                lblCompanyEmail: "Email de l'Entreprise",
                btnCreateAccount: "Créer un Compte",
                linkNoAccount: "Pas de compte ? S'inscrire",
                linkAlreadyAccount: "Déjà un compte ? Connexion",
                signupError: "Échec d'inscription. Veuillez réessayer.",
                loginError: "Échec de connexion. Vérifiez le nom et le mot de passe."
            }
        };

        window.addEventListener('DOMContentLoaded', () => {
            // Don't load localStorage data — use API

            setTimeout(() => {
                const introStage = document.getElementById('intro-stage');
                const orgStage = document.getElementById('org-gate-stage');
                
                introStage.style.transition = 'opacity 0.3s ease';
                introStage.style.opacity = '0';
                
                setTimeout(() => {
                    introStage.style.display = 'none';
                    orgStage.style.display = 'flex';
                    setTimeout(() => { orgStage.style.opacity = '1'; }, 50);
                    // Set Login tab as default
                    setTimeout(() => switchGateTab('login'), 100);
                }, 300);
            }, 2200);

            initHomeMapEngine();
            renderBusTabs();
            renderFinancialMetrics();
            renderLiabilitiesTable();
            renderChart();
        });

        function loadLocalStorageData() {
            // Kept for backward compat but now we prefer API data
            const storedVehicles = localStorage.getItem('kgl_vehicles');
            if (storedVehicles) {
                vehicles = JSON.parse(storedVehicles);
                vehicles.forEach(v => { v.marker = null; v.homeMarker = null; });
            }
            const storedLiabilities = localStorage.getItem('kgl_liabilities');
            if (storedLiabilities) liabilities = JSON.parse(storedLiabilities);
        }

        function saveLocalStorageData() {
            // Only save locally-added vehicles (not API fleet)
            const localVehicles = vehicles.filter(v => v._localOnly);
            const cleanVehicles = localVehicles.map(v => ({
                plate: v.plate, hours: v.hours, token: v.token, targetTime: v.targetTime,
                lat: v.lat, lng: v.lng, passengers: v.passengers || 0, income: v.income || 0, _localOnly: true
            }));
            localStorage.setItem('kgl_vehicles', JSON.stringify(cleanVehicles));
            localStorage.setItem('kgl_liabilities', JSON.stringify(liabilities));
        }

        function changeLanguage(langKey) {
            currentLang = langKey;
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (i18n[langKey] && i18n[langKey][key]) {
                    el.textContent = i18n[langKey][key];
                }
            });
            renderFleetTable();
            renderHomeSummaryTable();
        }

        // --- Admin Login via API ---
        // --- Gate Tab Switching ---
        function switchGateTab(tabName) {
            const tabSignup = document.getElementById('tab-signup');
            const tabLogin = document.getElementById('tab-login');
            const signupForm = document.getElementById('signup-form');
            const loginForm = document.getElementById('login-form');
            const indicator = document.getElementById('gate-tab-indicator');

            if (tabName === 'signup') {
                tabSignup.classList.add('active');
                tabLogin.classList.remove('active');
                signupForm.style.display = 'block';
                loginForm.style.display = 'none';
                indicator.style.left = tabSignup.offsetLeft + 'px';
                indicator.style.width = tabSignup.offsetWidth + 'px';
            } else {
                tabLogin.classList.add('active');
                tabSignup.classList.remove('active');
                loginForm.style.display = 'block';
                signupForm.style.display = 'none';
                indicator.style.left = tabLogin.offsetLeft + 'px';
                indicator.style.width = tabLogin.offsetWidth + 'px';
            }
        }

        // --- Signup Handler ---
        async function handleSignup(e) {
            e.preventDefault();
            const companyName = document.getElementById('signup-company-name').value.trim();
            const companyEmail = document.getElementById('signup-company-email').value.trim();
            const password = document.getElementById('signup-password').value.trim();
            const dict = i18n[currentLang];

            if (!companyName || !companyEmail || !password) {
                alert('Please fill in all fields.');
                return;
            }

            try {
                const data = await apiFetch('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ company_name: companyName, company_email: companyEmail, password: password })
                });

                sessionStorage.setItem('kglc_token', data.token);
                sessionStorage.setItem('kglc_admin_id', data.admin.admin_id);
                sessionStorage.setItem('kglc_company_id', data.admin.company_id);

                sessionStorage.setItem('kglc_company_name', companyName);
                document.getElementById('sidebar-brand-logo').textContent = companyName;
                document.getElementById('org-brand-title').textContent = companyName;
                document.getElementById('welcome-heading').textContent = `Welcome, ${companyName}`;

                const orgStage = document.getElementById('org-gate-stage');
                orgStage.style.opacity = '0';
                setTimeout(() => orgStage.style.display = 'none', 400);

                if (homeMap) setTimeout(() => homeMap.invalidateSize(), 500);

                loadDashboardData();
                startVehicleLocationPolling();
            } catch (err) {
                alert(dict.signupError + ' (' + err.message + ')');
            }
        }

        async function handleOrgSubmit(e) {
            e.preventDefault();
            const companyName = document.getElementById('login-company-name').value.trim();
            const password = document.getElementById('login-password') ? document.getElementById('login-password').value.trim() : '';
            const dict = i18n[currentLang];

            if (!companyName || !password) {
                alert('Please enter both company name and password.');
                return;
            }

            try {
                const data = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ identifier: companyName, credential: password })
                });

                sessionStorage.setItem('kglc_token', data.token);
                sessionStorage.setItem('kglc_admin_id', data.admin.admin_id);
                sessionStorage.setItem('kglc_company_id', data.admin.company_id);

                const companyNameFromApi = data.admin.company_name || data.admin.full_name || companyName;
                sessionStorage.setItem('kglc_company_name', companyNameFromApi);
                document.getElementById('sidebar-brand-logo').textContent = companyNameFromApi;
                document.getElementById('org-brand-title').textContent = companyNameFromApi;
                document.getElementById('welcome-heading').textContent = `Welcome, ${companyNameFromApi}`;

                const orgStage = document.getElementById('org-gate-stage');
                orgStage.style.opacity = '0';
                setTimeout(() => orgStage.style.display = 'none', 400);

                if (homeMap) setTimeout(() => homeMap.invalidateSize(), 500);

                // Load all dashboard data from API
                loadDashboardData();
                startVehicleLocationPolling();
            } catch (err) {
                alert(dict.loginError + ' (' + err.message + ')');
            }
        }

        // --- Load Dashboard Data from API ---
        async function loadDashboardData() {
            const companyId = getAuthCompanyId();
            if (!companyId) return;

            try {
                dashboardData = await apiFetch(`/api/companies/${companyId}/dashboard`);

                // Populate fleet from API
                fleetData = (dashboardData.fleet || []).map(f => ({
                    plate: f.plate_number,
                    model: f.model,
                    driver_name: f.driver_name || 'Unassigned',
                    driver_phone: f.driver_phone || '',
                    trip_status: f.trip_status || 'standby',
                    from_location: f.from_location || '',
                    to_location: f.to_location || '',
                    departure_time: f.departure_time || '',
                    lat: f.latitude || -1.944,
                    lng: f.longitude || 30.061,
                    speed: f.speed_kmh || 0,
                    heading: f.heading || 0,
                    last_seen: f.last_seen_at || '',
                    marker: null,
                    homeMarker: null,
                    isActive: f.trip_status === 'in_transit',
                    locationString: f.latitude ? `📍 Track Route (${parseFloat(f.latitude).toFixed(3)}, ${parseFloat(f.longitude).toFixed(3)})` : '🛑 Non-Operational',
                    hours: 'N/A',
                    token: '',
                    targetTime: null
                }));

                // Merge API fleet with local vehicles
                vehicles = [...fleetData, ...vehicles.filter(v => v._localOnly)];

                // Set revenue data
                revenueData = dashboardData.revenue || {};

                // Set liabilities from API
                liabilities = (dashboardData.liabilities || []).map(l => ({
                    id: l.liability_id,
                    description: l.description,
                    cost: l.cost_rwf,
                    timestamp: l.recorded_at ? new Date(l.recorded_at).toLocaleString() : new Date().toLocaleString()
                }));

                // Update all UI
                document.getElementById('sum-total').textContent = vehicles.length;
                document.getElementById('sum-active').textContent = vehicles.filter(v => v.isActive).length;
                if (revenueData.net_balance_rwf !== undefined) {
                    document.getElementById('sum-ledger').textContent = `${parseInt(revenueData.net_balance_rwf || 0).toLocaleString()} RWF`;
                }

                renderFleetTable();
                renderHomeSummaryTable();
                renderFinancialMetrics();
                renderLiabilitiesTable();
                renderRecentBookings();
                renderVehicleLogs();
                renderChart();
                renderBusTabs();
            } catch (e) {
                console.error('Failed to load dashboard:', e);
            }
        }

        // --- Vehicle Location Polling ---
        let locationPollInterval = null;

        function startVehicleLocationPolling() {
            if (locationPollInterval) clearInterval(locationPollInterval);
            locationPollInterval = setInterval(pollVehicleLocations, 15000); // every 15s
            pollVehicleLocations();
        }

        async function pollVehicleLocations() {
            const companyId = getAuthCompanyId();
            if (!companyId) return;
            try {
                vehicleLocations = await apiFetch(`/api/vehicles/locations`);
                // Filter to this company's vehicles
                const myVehicles = vehicleLocations.filter(v => v.company_id === parseInt(companyId));

                myVehicles.forEach(vl => {
                    const match = vehicles.find(v => v.plate === vl.plate_number);
                    if (match) {
                        match.lat = vl.latitude;
                        match.lng = vl.longitude;
                        match.speed = vl.speed_kmh;
                        match.heading = vl.heading;
                        match.locationString = `📍 Track Route (${vl.latitude.toFixed(3)}, ${vl.longitude.toFixed(3)})`;
                        match.isActive = true;

                        // Update map markers
                        if (mapInitialized && match.marker) {
                            match.marker.setLatLng([vl.latitude, vl.longitude]);
                        } else if (mapInitialized) {
                            const plateIcon = L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div class="bus-plate-marker">${match.plate}</div>`,
                                iconSize: [80, 20], iconAnchor: [40, 10]
                            });
                            match.marker = L.marker([vl.latitude, vl.longitude], {icon: plateIcon}).addTo(map);
                        }

                        if (homeMapInitialized && match.homeMarker) {
                            match.homeMarker.setLatLng([vl.latitude, vl.longitude]);
                        } else if (homeMapInitialized) {
                            const plateIconHome = L.divIcon({
                                className: 'custom-div-icon-home',
                                html: `<div class="bus-plate-marker">${match.plate}</div>`,
                                iconSize: [80, 20], iconAnchor: [40, 10]
                            });
                            match.homeMarker = L.marker([vl.latitude, vl.longitude], {icon: plateIconHome}).addTo(homeMap);
                        }
                    }
                });

                // Mark vehicles not in location data as inactive
                vehicles.forEach(v => {
                    if (v._localOnly) return; // skip local-only
                    const found = myVehicles.find(vl => vl.plate_number === v.plate);
                    if (!found && !v.isActive) {
                        v.locationString = "🛑 Non-Operational Shift";
                    }
                });

                renderFleetTable();
                renderHomeSummaryTable();
            } catch (e) {
                console.warn('Vehicle location poll failed:', e);
            }
        }

        /* --- ONBOARD VEHICLE FORM TOGGLE --- */
        function activateAddBusForm() {
            const card = document.getElementById('input-bus-card');
            const trigger = document.getElementById('giant-add-bus-trigger');
            const tokenBox = document.getElementById('token-display');
            if (!card) return;

            const isHidden = card.style.display === 'none' || card.style.display === '';
            if (isHidden) {
                card.style.display = 'block';
                if (tokenBox) tokenBox.style.display = 'none';
                if (trigger) trigger.textContent = (i18n[currentLang] && i18n[currentLang].btnCancelOnboard) || '\u00d7 Cancel Onboarding';
                const firstField = document.getElementById('bus-plate');
                if (firstField) firstField.focus();
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                card.style.display = 'none';
                if (trigger) trigger.textContent = (i18n[currentLang] && i18n[currentLang].btnOnboard) || '+ Onboard New Vehicle';
            }
        }

        /* --- CONFIRM SUBSCRIPTION SUMMARY (OK button) --- */
        function finalizeSubscriptionData() {
            const card = document.getElementById('input-bus-card');
            const tokenBox = document.getElementById('token-display');
            const trigger = document.getElementById('giant-add-bus-trigger');

            if (tokenBox) tokenBox.style.display = 'none';
            if (card) card.style.display = 'none';
            if (trigger) trigger.textContent = (i18n[currentLang] && i18n[currentLang].btnOnboard) || '+ Onboard New Vehicle';

            const secContainer = document.getElementById('secondary-hours-container');
            if (secContainer) {
                secContainer.style.display = 'none';
                const secInput = document.getElementById('working-hours-secondary');
                if (secInput) secInput.value = '';
            }

            const updates = document.getElementById('home-summarized-updates');
            if (updates) updates.style.display = 'block';

            renderFleetTable();
            renderHomeSummaryTable();
            renderBusTabs();
            renderFinancialMetrics();
        }

        function addSecondaryShiftInput() {
            const secContainer = document.getElementById('secondary-hours-container');
            secContainer.style.display = 'block';
            document.getElementById('working-hours-secondary').focus();
        }

        function openDayoffsModal() {
            document.getElementById('dayoffs-modal').classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        function handleDayoffMode(mode) {
            alert(`Dayoff Mode Selected: ${mode.toUpperCase()}`);
            closeModal('dayoffs-modal');
        }

        function initMapEngine() {
            if (mapInitialized) return;
            map = L.map('map').setView([-1.944, 30.061], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);
            mapInitialized = true;
        }

        function initHomeMapEngine() {
            if (homeMapInitialized) return;
            homeMap = L.map('home-map').setView([-1.944, 30.061], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(homeMap);
            homeMapInitialized = true;
        }

        function switchView(viewId, clickedButton) {
            document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');

            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            if(clickedButton) clickedButton.classList.add('active');
            else {
                const btnId = viewId === 'transport-view' ? 'nav-transport' : (viewId === 'vehicle-view' ? 'nav-vehicle' : (viewId === 'financial-view' ? 'nav-financial' : (viewId === 'reports-view' ? 'nav-reports' : '')));
                const matchBtn = document.getElementById(btnId);
                if(matchBtn) matchBtn.classList.add('active');
            }

            if (viewId === 'transport-view') {
                initMapEngine();
                setTimeout(() => { map.invalidateSize(); }, 200);
            }
            if (viewId === 'home-view' && homeMap) {
                setTimeout(() => { homeMap.invalidateSize(); }, 200);
            }
            if (viewId === 'financial-view') {
                renderBusTabs();
                renderFinancialMetrics();
                renderChart();
            }
        }

        function toggleSidebarElement(elementId, isVisible) {
            const targetButton = document.getElementById(elementId);
            if (isVisible) targetButton.classList.add('visible');
            else {
                targetButton.classList.remove('visible');
                if (targetButton.classList.contains('active')) {
                    switchView('home-view', document.querySelector('.nav-links .nav-btn:first-child'));
                }
            }
        }

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const toggleBtn = document.getElementById('theme-btn-label');
            
            if (!currentTheme) {
                document.documentElement.setAttribute('data-theme', 'light');
                toggleBtn.textContent = "Theme: Light";
            } else if (currentTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'emerald-gold');
                toggleBtn.textContent = "Theme: Emerald Gold";
            } else {
                document.documentElement.removeAttribute('data-theme');
                toggleBtn.textContent = "Theme: Dark";
            }
            renderChart();
        }

        function generateClientCode() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
            return result;
        }

        function checkWorkingHours(hoursStr) {
            try {
                const parts = hoursStr.split('-');
                if(parts.length !== 2) return false;
                const now = new Date();
                const currentMin = (now.getHours() * 60) + now.getMinutes();
                const parseMinutes = (timeStr) => {
                    const [h, m] = timeStr.trim().split(':').map(Number);
                    return (h * 60) + m;
                };
                return currentMin >= parseMinutes(parts[0]) && currentMin <= parseMinutes(parts[1]);
            } catch(e) { return false; }
        }

        async function handleFormSubmit(event) {
            event.preventDefault();
            const plate = document.getElementById('bus-plate').value.trim();
            const busModel = document.getElementById('bus-model').value.trim() || 'Standard';
            const busCapacity = parseInt(document.getElementById('bus-capacity').value) || 25;
            const busYear = parseInt(document.getElementById('bus-year').value) || null;
            const controlDateVal = document.getElementById('control-date').value;
            const primaryHours = document.getElementById('working-hours').value;
            const secondaryHours = document.getElementById('working-hours-secondary').value;
            
            const fullHours = secondaryHours ? `${primaryHours} | ${secondaryHours}` : primaryHours;
            const appToken = generateClientCode();

            let countdownTarget = null;
            if (controlDateVal) {
                const baseDate = new Date(controlDateVal);
                countdownTarget = new Date(baseDate.setMonth(baseDate.getMonth() + 6));
            }

            const companyId = getAuthCompanyId();
            if (companyId) {
                try {
                    await apiFetch(`/api/companies/${companyId}/fleet`, {
                        method: 'POST',
                        body: JSON.stringify({
                            plate_number: plate,
                            model: busModel,
                            capacity: busCapacity,
                            year_manufactured: busYear
                        })
                    });
                    // Re-fetch dashboard to get the newly added vehicle from API
                    await loadDashboardData();
                } catch (err) {
                    console.error('Fleet POST failed:', err);
                    alert('Failed to register bus with server: ' + err.message);
                    return;
                }
            }

            // Add locally for UI fields not in API (hours, token, countdown)
            const newVehicle = {
                plate, model: busModel, capacity: busCapacity, year_manufactured: busYear,
                hours: fullHours, token: appToken, targetTime: countdownTarget,
                lat: -1.944, lng: 30.061, passengers: 0, income: 0,
                isActive: false, locationString: "🛑 Non-Operational Shift",
                marker: null, homeMarker: null
            };

            // Avoid duplicate if API already added it in dashboard reload
            if (!vehicles.find(v => v.plate === plate)) {
                vehicles.push(newVehicle);
            }

            saveLocalStorageData();
            document.getElementById('add-bus-form').reset();
            document.getElementById('token-string').textContent = appToken;

            renderFleetTable();
            renderHomeSummaryTable();
            renderBusTabs();
            document.getElementById('home-summarized-updates').classList.remove('hidden');
        }

        function renderFleetTable() {
            const tbody = document.getElementById('fleet-table-body');
            const noDataRow = document.getElementById('no-data-row');
            tbody.innerHTML = "";

            if(vehicles.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">${i18n[currentLang].noFleetMsg}</td></tr>`;
                return;
            }

            vehicles.forEach((vehicle, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${vehicle.plate}</strong></td>
                    <td>${vehicle.hours || 'N/A'}</td>
                    <td>
                        <button class="map-trigger-btn" onclick="triggerMapFocus(${index})">
                            ${vehicle.locationString}
                        </button>
                    </td>
                    <td><span id="countdown-${index}">${vehicle.targetTime ? 'Calculating...' : 'N/A'}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }

        function renderHomeSummaryTable() {
            const tbody = document.getElementById('home-summary-table-body');
            tbody.innerHTML = "";

            if(vehicles.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">${i18n[currentLang].noFleetMsg}</td></tr>`;
                return;
            }

            vehicles.forEach((vehicle, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${vehicle.plate}</strong></td>
                    <td>${vehicle.hours || 'N/A'}</td>
                    <td><span class="badge" style="background:${vehicle.isActive ? '#10b981' : '#64748b'}; color:#fff;">${vehicle.isActive ? 'Active' : 'Standby'}</span></td>
                    <td><span id="home-countdown-${index}">${vehicle.targetTime ? 'Calculating...' : 'N/A'}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }

        function renderBusTabs() {
            const container = document.getElementById('bus-tabs-container');
            container.innerHTML = `<button class="bus-tab-btn ${currentBusTab === 'ALL' ? 'active' : ''}" onclick="selectBusTab('ALL')">All Fleet Summary</button>`;

            vehicles.forEach(v => {
                const btn = document.createElement('button');
                btn.className = `bus-tab-btn ${currentBusTab === v.plate ? 'active' : ''}`;
                btn.textContent = v.plate;
                btn.onclick = () => selectBusTab(v.plate);
                container.appendChild(btn);
            });
        }

        function selectBusTab(plate) {
            currentBusTab = plate;
            renderBusTabs();
            renderFinancialMetrics();
            renderChart();
        }

        function renderFinancialMetrics() {
            let totalPassengers = 0;
            let totalGross = 0;

            // Use API revenue data when available
            if (revenueData && currentBusTab === 'ALL') {
                totalPassengers = revenueData.total_bookings || 0;
                totalGross = revenueData.total_revenue_rwf || 0;
            } else if (currentBusTab === 'ALL') {
                vehicles.forEach(v => {
                    totalPassengers += (v.passengers || 0);
                    totalGross += (v.income || 0);
                });
            } else {
                const match = vehicles.find(v => v.plate === currentBusTab);
                if (match) {
                    totalPassengers = match.passengers || 0;
                    totalGross = match.income || 0;
                }
            }

            const totalLiabilities = liabilities.reduce((sum, item) => sum + item.cost, 0);
            const netBalance = totalGross - totalLiabilities;

            document.getElementById('fin-passengers-count').textContent = totalPassengers.toLocaleString();
            document.getElementById('fin-gross-income').textContent = `${totalGross.toLocaleString()} RWF`;
            
            const netEl = document.getElementById('fin-net-balance');
            netEl.textContent = `${netBalance.toLocaleString()} RWF`;
            netEl.style.color = netBalance >= 0 ? 'var(--chart-profit)' : 'var(--chart-loss)';
        }

        // --- Liabilities: POST to API + local ---
        async function handleLiabilitySubmit(e) {
            e.preventDefault();
            const desc = document.getElementById('liability-desc').value.trim();
            const cost = parseFloat(document.getElementById('liability-cost').value);
            const category = document.getElementById('liability-category') ? document.getElementById('liability-category').value : 'other';
            const companyId = getAuthCompanyId();

            if (companyId) {
                try {
                    await apiFetch(`/api/companies/${companyId}/liabilities`, {
                        method: 'POST',
                        body: JSON.stringify({
                            description: desc,
                            cost_rwf: cost,
                            category: category
                        })
                    });
                    // Re-fetch dashboard to reflect the new liability
                    await loadDashboardData();
                } catch (err) {
                    console.error('Liability POST failed:', err);
                    alert('Failed to record liability with server: ' + err.message);
                    return;
                }
            }

            document.getElementById('add-liability-form').reset();
            switchView('financial-view', null);
            renderLiabilitiesTable();
            renderFinancialMetrics();
            renderChart();
        }

        function renderLiabilitiesTable() {
            const tbody = document.getElementById('liabilities-table-body');
            tbody.innerHTML = "";

            if (liabilities.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">${i18n[currentLang].noLiabilitiesMsg}</td></tr>`;
                return;
            }

            liabilities.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${item.description}</strong></td>
                    <td style="color:var(--chart-loss); font-weight:700;">-${item.cost.toLocaleString()} RWF</td>
                    <td style="color:var(--text-muted); font-size:0.85rem;">${item.timestamp}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function renderRecentBookings() {
            const tbody = document.getElementById('recent-bookings-table-body');
            tbody.innerHTML = "";
            const bookings = dashboardData.recent_bookings || [];

            if (bookings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">${i18n[currentLang].noBookingsMsg}</td></tr>`;
                return;
            }

            bookings.forEach(b => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#${b.booking_id || b.ticket_id || '-'}</strong></td>
                    <td>${b.passenger_name || '-'}</td>
                    <td>${b.route || (b.from_location && b.to_location ? b.from_location + ' → ' + b.to_location : '-')}</td>
                    <td>${b.seat_number || '-'}</td>
                    <td>${b.price_rwf ? parseInt(b.price_rwf).toLocaleString() + ' RWF' : '-'}</td>
                    <td style="color:var(--text-muted); font-size:0.85rem;">${b.booked_at ? new Date(b.booked_at).toLocaleString() : '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function renderVehicleLogs() {
            const tbody = document.getElementById('vehicle-logs-table-body');
            tbody.innerHTML = "";
            const logs = dashboardData.vehicle_logs || [];

            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">${i18n[currentLang].noLogsMsg}</td></tr>`;
                return;
            }

            logs.forEach(l => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${l.plate_number || '-'}</strong></td>
                    <td>${l.log_type || '-'}</td>
                    <td>${l.notes || '-'}</td>
                    <td style="color:var(--text-muted); font-size:0.85rem;">${l.logged_at ? new Date(l.logged_at).toLocaleString() : '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function setChartZoom(zoomLevel) {
            currentZoomLevel = zoomLevel;
            document.querySelectorAll('.zoom-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`zoom-${zoomLevel}`).classList.add('active');
            renderChart();
        }

        function renderChart() {
            const canvas = document.getElementById('financial-chart-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            const width = canvas.width;
            const height = canvas.height;
            const padding = 50;

            ctx.clearRect(0, 0, width, height);

            // Use API revenue data for gross
            let gross = 0;
            if (revenueData && currentBusTab === 'ALL') {
                gross = revenueData.total_revenue_rwf || 0;
            } else if (currentBusTab === 'ALL') {
                vehicles.forEach(v => gross += (v.income || 0));
            } else {
                const match = vehicles.find(v => v.plate === currentBusTab);
                if (match) gross = match.income || 0;
            }
            const totalLiabilities = liabilities.reduce((sum, item) => sum + item.cost, 0);
            const isProfitable = (gross - totalLiabilities) >= 0;
            const chartColor = isProfitable ? '#10b981' : '#ef4444';

            let labels = [];
            if (currentZoomLevel === 'hours') labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
            else if (currentZoomLevel === 'weeks') labels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'];
            else if (currentZoomLevel === 'months') labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
            else if (currentZoomLevel === 'years') labels = ['2023', '2024', '2025', '2026', '2027'];

            const dataPoints = labels.map((_, idx) => {
                const ratio = idx / (labels.length - 1);
                return (gross - totalLiabilities) * ratio;
            });

            const maxVal = Math.max(...dataPoints.map(Math.abs), 100000);
            const minVal = -maxVal;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(padding, 10);
            ctx.lineTo(padding, height - padding);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(padding, height - padding);
            ctx.lineTo(width - 10, height - padding);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '10px Roboto, sans-serif';
            
            labels.forEach((label, i) => {
                const x = padding + (i * ((width - padding - 20) / (labels.length - 1)));
                ctx.fillText(label, x - 10, height - padding + 20);
            });

            ctx.fillText(`${(maxVal/1000).toFixed(0)}k`, 10, 20);
            ctx.fillText('0', 25, (height - padding) / 2);
            ctx.fillText(`-${(maxVal/1000).toFixed(0)}k`, 10, height - padding);

            ctx.beginPath();
            ctx.strokeStyle = chartColor;
            ctx.lineWidth = 3;

            dataPoints.forEach((val, i) => {
                const x = padding + (i * ((width - padding - 20) / (dataPoints.length - 1)));
                const normalized = (val - minVal) / (maxVal - minVal);
                const y = (height - padding - 20) - (normalized * (height - padding - 30)) + 10;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            ctx.lineTo(width - 20, height - padding);
            ctx.lineTo(padding, height - padding);
            ctx.closePath();
            ctx.fillStyle = isProfitable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            ctx.fill();
        }

        // --- Main interval: countdown timers + local vehicle simulation ---
        setInterval(() => {
            const now = new Date().getTime();

            vehicles.forEach((vehicle, index) => {
                // Only simulate GPS drift for locally-added vehicles
                if (vehicle._localOnly) {
                    const hoursList = (vehicle.hours || '').split('|').map(s => s.trim()).filter(s => s);
                    const dynamicIsActive = hoursList.some(h => checkWorkingHours(h));
                    
                    if (dynamicIsActive) {
                        vehicle.isActive = true;
                        vehicle.lat += (Math.random() - 0.5) * 0.00015;
                        vehicle.lng += (Math.random() - 0.5) * 0.00015;
                        vehicle.locationString = `📍 Track Route (${vehicle.lat.toFixed(3)}, ${vehicle.lng.toFixed(3)})`;

                        if (Math.random() > 0.7) {
                            vehicle.passengers = (vehicle.passengers || 0) + 1;
                            vehicle.income = (vehicle.income || 0) + 500;
                            saveLocalStorageData();
                            if (document.getElementById('financial-view').classList.contains('active')) {
                                renderFinancialMetrics();
                                renderChart();
                            }
                        }

                        if (mapInitialized) {
                            if (!vehicle.marker) {
                                const plateIcon = L.divIcon({
                                    className: 'custom-div-icon',
                                    html: `<div class="bus-plate-marker">${vehicle.plate}</div>`,
                                    iconSize: [80, 20], iconAnchor: [40, 10]
                                });
                                vehicle.marker = L.marker([vehicle.lat, vehicle.lng], {icon: plateIcon}).addTo(map);
                            } else {
                                vehicle.marker.setLatLng([vehicle.lat, vehicle.lng]);
                            }
                        }

                        if (homeMapInitialized) {
                            if (!vehicle.homeMarker) {
                                const plateIconHome = L.divIcon({
                                    className: 'custom-div-icon-home',
                                    html: `<div class="bus-plate-marker">${vehicle.plate}</div>`,
                                    iconSize: [80, 20], iconAnchor: [40, 10]
                                });
                                vehicle.homeMarker = L.marker([vehicle.lat, vehicle.lng], {icon: plateIconHome}).addTo(homeMap);
                            } else {
                                vehicle.homeMarker.setLatLng([vehicle.lat, vehicle.lng]);
                            }
                        }
                    } else {
                        vehicle.isActive = false;
                        vehicle.locationString = "🛑 Non-Operational Shift";
                        if (vehicle.marker) { map.removeLayer(vehicle.marker); vehicle.marker = null; }
                        if (vehicle.homeMarker) { homeMap.removeLayer(vehicle.homeMarker); vehicle.homeMarker = null; }
                    }
                }

                const updateClocks = (domId) => {
                    const clk = document.getElementById(domId);
                    if (clk && vehicle.targetTime) {
                        const distance = vehicle.targetTime - now;
                        if (distance < 0) {
                            clk.textContent = "Expired";
                            clk.style.color = "var(--accent)";
                        } else {
                            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                            clk.textContent = `${days}d ${hours}h ${minutes}m`;
                            clk.style.color = "inherit";
                        }
                    }
                };

                updateClocks(`countdown-${index}`);
                updateClocks(`home-countdown-${index}`);
            });

        }, 1000);

        /* ==========================================================
           REPORTS -> WORKSHOP : drag & drop report builder
           ========================================================== */

        let wsNodes = [];            // { id, kind, x, y, config }
        let wsNodeSeq = 0;
        let wsLastReport = null;     // { title, text, html }

        /* ---- collapse / expand the whole workshop panel ---- */
        function toggleWorkshopPanel() {
            const panel = document.getElementById('workshop-panel');
            const btn = document.getElementById('workshop-collapse-btn');
            if (!panel) return;
            panel.classList.toggle('collapsed');
            btn.classList.toggle('flipped');
        }

        /* ---- inner "V": reveal / hide the components tab ---- */
        function toggleComponentsTab() {
            const tab = document.getElementById('components-tab');
            const btn = document.getElementById('components-toggle-btn');
            if (!tab) return;
            tab.classList.toggle('open');
            btn.classList.toggle('flipped');
        }

        /* ---- palette drag start (delegated, bound on load) ---- */
        function initWorkshopPalette() {
            document.querySelectorAll('.palette-item').forEach(item => {
                item.addEventListener('dragstart', ev => {
                    ev.dataTransfer.setData('text/plain', item.getAttribute('data-kind'));
                    ev.dataTransfer.effectAllowed = 'copy';
                });
            });
        }

        function handleCanvasDragOver(ev) {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'copy';
        }

        function handleCanvasDrop(ev) {
            ev.preventDefault();
            const kind = ev.dataTransfer.getData('text/plain');
            if (!kind) return;
            const canvas = document.getElementById('workshop-canvas');
            const rect = canvas.getBoundingClientRect();
            const x = ev.clientX - rect.left + canvas.scrollLeft - 30;
            const y = ev.clientY - rect.top + canvas.scrollTop - 18;
            createWorkshopNode(kind, Math.max(0, x), Math.max(0, y));
        }

        /* ---- how long the app has been in use (for date dropdowns) ---- */
        function getUsageSpan() {
            const now = new Date();
            let earliest = now;

            const pushDate = (raw) => {
                if (!raw) return;
                const d = new Date(raw);
                if (!isNaN(d.getTime()) && d < earliest) earliest = d;
            };

            if (dashboardData) {
                (dashboardData.recent_bookings || []).forEach(b => pushDate(b.booked_at));
                (dashboardData.vehicle_logs || []).forEach(l => pushDate(l.logged_at));
                (dashboardData.liabilities || []).forEach(l => pushDate(l.recorded_at));
                (dashboardData.fleet || []).forEach(f => pushDate(f.created_at || f.registered_at));
                if (dashboardData.company && dashboardData.company.created_at) pushDate(dashboardData.company.created_at);
            }

            const startYear = earliest.getFullYear();
            const endYear = now.getFullYear();
            const years = [];
            for (let y = startYear; y <= endYear; y++) years.push(y);

            // months available across the usage window (1..12 clipped for single-year usage)
            let monthStart = 1, monthEnd = 12;
            if (startYear === endYear) {
                monthStart = earliest.getMonth() + 1;
                monthEnd = now.getMonth() + 1;
            }
            const months = [];
            for (let m = monthStart; m <= monthEnd; m++) months.push(m);

            return { years, months, earliest, now };
        }

        function daysInMonth(year, month) {
            return new Date(year, month, 0).getDate();
        }

        /* ---- create a node on the canvas ---- */
        function createWorkshopNode(kind, x, y) {
            const canvas = document.getElementById('workshop-canvas');
            if (!canvas) return;

            const id = 'wsn-' + (++wsNodeSeq);
            const node = { id: id, kind: kind, x: x, y: y, config: {} };

            const el = document.createElement('div');
            el.className = 'ws-node';
            el.id = id;
            el.setAttribute('data-kind', kind);
            el.style.left = x + 'px';
            el.style.top = y + 'px';

            const inner = document.createElement('div');
            inner.className = 'ws-node-inner';

            if (kind === 'vs') {
                node.config.label = 'vs';
                const lbl = document.createElement('span');
                lbl.className = 'ws-node-label';
                lbl.textContent = 'vs';
                inner.appendChild(lbl);

            } else if (kind === 'segment') {
                node.config.width = 110;
                node.config.label = 'segment';
                const lbl = document.createElement('span');
                lbl.className = 'ws-node-label';
                lbl.textContent = 'segment';
                inner.appendChild(lbl);
                inner.style.width = node.config.width + 'px';

                const handle = document.createElement('div');
                handle.className = 'ws-seg-handle';
                handle.title = 'Stretch';
                handle.addEventListener('mousedown', ev => startSegmentStretch(ev, node, inner));
                el.appendChild(handle);

            } else if (kind === 'operation') {
                node.config.op = '+';
                const lbl = document.createElement('span');
                lbl.className = 'ws-node-label';
                lbl.textContent = 'operation';
                const sel = document.createElement('select');
                sel.className = 'ws-select';
                ['+', '-', '*', '/', '='].forEach(op => {
                    const o = document.createElement('option');
                    o.value = op; o.textContent = op;
                    sel.appendChild(o);
                });
                sel.value = node.config.op;
                sel.addEventListener('change', () => { node.config.op = sel.value; });
                sel.addEventListener('mousedown', ev => ev.stopPropagation());
                inner.appendChild(lbl);
                inner.appendChild(sel);

            } else if (kind === 'value') {
                node.config.value = '';
                node.config.saved = false;
                const lbl = document.createElement('span');
                lbl.className = 'ws-node-label';
                lbl.textContent = 'value';
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'ws-input';
                input.placeholder = '0';
                input.addEventListener('mousedown', ev => ev.stopPropagation());
                input.addEventListener('input', () => {
                    node.config.value = input.value;
                    node.config.saved = false;
                    inner.classList.remove('saved');
                });
                const saveBtn = document.createElement('button');
                saveBtn.className = 'ws-mini-btn';
                saveBtn.textContent = 'save';
                saveBtn.addEventListener('mousedown', ev => ev.stopPropagation());
                saveBtn.addEventListener('click', () => {
                    node.config.value = input.value;
                    node.config.saved = true;
                    inner.classList.add('saved');
                    saveBtn.textContent = 'saved';
                    setTimeout(() => { saveBtn.textContent = 'save'; }, 1200);
                });
                inner.appendChild(lbl);
                inner.appendChild(input);
                inner.appendChild(saveBtn);

            } else if (kind === 'data') {
                const span = getUsageSpan();
                node.config.year = span.years[span.years.length - 1];
                node.config.month = span.months[span.months.length - 1];
                node.config.day = span.now.getDate();
                node.config.metric = 'revenue';

                const lbl = document.createElement('span');
                lbl.className = 'ws-node-label';
                lbl.textContent = 'data';

                const metricSel = document.createElement('select');
                metricSel.className = 'ws-select';
                [
                    ['revenue', 'revenue'],
                    ['bookings', 'bookings'],
                    ['liabilities', 'liabilities'],
                    ['net', 'net balance'],
                    ['fleet', 'fleet size'],
                    ['active', 'active buses']
                ].forEach(pair => {
                    const o = document.createElement('option');
                    o.value = pair[0]; o.textContent = pair[1];
                    metricSel.appendChild(o);
                });
                metricSel.value = node.config.metric;

                const yearSel = document.createElement('select');
                yearSel.className = 'ws-select';
                span.years.forEach(y => {
                    const o = document.createElement('option');
                    o.value = y; o.textContent = y;
                    yearSel.appendChild(o);
                });
                yearSel.value = node.config.year;

                const monthSel = document.createElement('select');
                monthSel.className = 'ws-select';

                const daySel = document.createElement('select');
                daySel.className = 'ws-select';

                const fillMonths = () => {
                    const y = parseInt(yearSel.value, 10);
                    let mStart = 1, mEnd = 12;
                    if (y === span.earliest.getFullYear()) mStart = span.earliest.getMonth() + 1;
                    if (y === span.now.getFullYear()) mEnd = span.now.getMonth() + 1;
                    monthSel.innerHTML = '';
                    for (let m = mStart; m <= mEnd; m++) {
                        const o = document.createElement('option');
                        o.value = m; o.textContent = String(m).padStart(2, '0');
                        monthSel.appendChild(o);
                    }
                    monthSel.value = Math.min(Math.max(node.config.month, mStart), mEnd);
                    node.config.month = parseInt(monthSel.value, 10);
                };

                const fillDays = () => {
                    const y = parseInt(yearSel.value, 10);
                    const m = parseInt(monthSel.value, 10);
                    let dStart = 1;
                    let dEnd = daysInMonth(y, m);
                    if (y === span.earliest.getFullYear() && m === span.earliest.getMonth() + 1) dStart = span.earliest.getDate();
                    if (y === span.now.getFullYear() && m === span.now.getMonth() + 1) dEnd = span.now.getDate();
                    daySel.innerHTML = '';
                    for (let d = dStart; d <= dEnd; d++) {
                        const o = document.createElement('option');
                        o.value = d; o.textContent = String(d).padStart(2, '0');
                        daySel.appendChild(o);
                    }
                    daySel.value = Math.min(Math.max(node.config.day, dStart), dEnd);
                    node.config.day = parseInt(daySel.value, 10);
                };

                fillMonths();
                fillDays();

                [metricSel, yearSel, monthSel, daySel].forEach(s => {
                    s.addEventListener('mousedown', ev => ev.stopPropagation());
                });
                metricSel.addEventListener('change', () => { node.config.metric = metricSel.value; });
                yearSel.addEventListener('change', () => {
                    node.config.year = parseInt(yearSel.value, 10);
                    fillMonths(); fillDays();
                });
                monthSel.addEventListener('change', () => {
                    node.config.month = parseInt(monthSel.value, 10);
                    fillDays();
                });
                daySel.addEventListener('change', () => { node.config.day = parseInt(daySel.value, 10); });

                inner.appendChild(lbl);
                inner.appendChild(metricSel);
                inner.appendChild(yearSel);
                inner.appendChild(monthSel);
                inner.appendChild(daySel);
            }

            el.appendChild(inner);

            // white connector circles on all four sides
            ['left', 'right', 'top', 'bottom'].forEach(side => {
                const port = document.createElement('span');
                port.className = 'ws-port ' + side;
                el.appendChild(port);
            });

            // remove button
            const close = document.createElement('button');
            close.className = 'ws-node-close';
            close.textContent = '\u00d7';
            close.title = 'Remove';
            close.addEventListener('mousedown', ev => ev.stopPropagation());
            close.addEventListener('click', () => removeWorkshopNode(id));
            el.appendChild(close);

            // free 2D dragging inside canvas
            el.addEventListener('mousedown', ev => startNodeDrag(ev, node, el));

            canvas.appendChild(el);
            canvas.classList.add('has-nodes');
            wsNodes.push(node);
        }

        function removeWorkshopNode(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
            wsNodes = wsNodes.filter(n => n.id !== id);
            const canvas = document.getElementById('workshop-canvas');
            if (canvas && wsNodes.length === 0) canvas.classList.remove('has-nodes');
        }

        function clearWorkshopCanvas() {
            wsNodes.slice().forEach(n => removeWorkshopNode(n.id));
        }

        /* ---- 2D drag of a placed node ---- */
        function startNodeDrag(ev, node, el) {
            if (ev.button !== 0) return;
            ev.preventDefault();
            const canvas = document.getElementById('workshop-canvas');
            const startX = ev.clientX, startY = ev.clientY;
            const originX = node.x, originY = node.y;
            el.classList.add('dragging');

            const onMove = (mv) => {
                const maxX = Math.max(0, canvas.clientWidth - el.offsetWidth);
                const maxY = Math.max(0, canvas.clientHeight - el.offsetHeight);
                let nx = originX + (mv.clientX - startX);
                let ny = originY + (mv.clientY - startY);
                nx = Math.min(Math.max(0, nx), maxX);
                ny = Math.min(Math.max(0, ny), maxY);
                node.x = nx; node.y = ny;
                el.style.left = nx + 'px';
                el.style.top = ny + 'px';
            };
            const onUp = () => {
                el.classList.remove('dragging');
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        /* ---- stretch a segment connector horizontally ---- */
        function startSegmentStretch(ev, node, inner) {
            ev.preventDefault();
            ev.stopPropagation();
            const startX = ev.clientX;
            const startW = node.config.width || inner.offsetWidth;

            const onMove = (mv) => {
                const w = Math.max(50, startW + (mv.clientX - startX));
                node.config.width = w;
                inner.style.width = w + 'px';
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        /* ---- red button: spawn a data component with date dropdowns ---- */
        function spawnDataComponent() {
            const canvas = document.getElementById('workshop-canvas');
            if (!canvas) return;
            const offset = (wsNodes.filter(n => n.kind === 'data').length % 6) * 26;
            createWorkshopNode('data', 16 + offset, 16 + offset);
        }

        /* ---- resolve a data node into a number using dashboard data ---- */
        function resolveDataNode(cfg) {
            const target = new Date(cfg.year, (cfg.month || 1) - 1, cfg.day || 1);
            const sameDay = (raw) => {
                if (!raw) return false;
                const d = new Date(raw);
                if (isNaN(d.getTime())) return false;
                return d.getFullYear() === target.getFullYear() &&
                       d.getMonth() === target.getMonth() &&
                       d.getDate() === target.getDate();
            };
            const upToDay = (raw) => {
                if (!raw) return false;
                const d = new Date(raw);
                return !isNaN(d.getTime()) && d <= new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59);
            };

            const bookings = (dashboardData && dashboardData.recent_bookings) || [];
            const liabs = (dashboardData && dashboardData.liabilities) || [];

            switch (cfg.metric) {
                case 'bookings': {
                    const day = bookings.filter(b => sameDay(b.booked_at));
                    return day.length || bookings.length;
                }
                case 'revenue': {
                    const day = bookings.filter(b => sameDay(b.booked_at));
                    const src = day.length ? day : bookings;
                    const sum = src.reduce((s, b) => s + (parseFloat(b.price_rwf) || 0), 0);
                    return sum || parseFloat(revenueData.total_revenue_rwf || 0);
                }
                case 'liabilities': {
                    const upto = liabs.filter(l => upToDay(l.recorded_at));
                    const src = upto.length ? upto : liabs;
                    return src.reduce((s, l) => s + (parseFloat(l.cost_rwf) || 0), 0);
                }
                case 'net': {
                    const gross = parseFloat(revenueData.total_revenue_rwf || 0);
                    const cost = liabs.reduce((s, l) => s + (parseFloat(l.cost_rwf) || 0), 0);
                    return gross - cost;
                }
                case 'fleet':
                    return vehicles.length;
                case 'active':
                    return vehicles.filter(v => v.isActive).length;
                default:
                    return 0;
            }
        }

        function dataNodeLabel(cfg) {
            const dateStr = `${cfg.year}-${String(cfg.month).padStart(2, '0')}-${String(cfg.day).padStart(2, '0')}`;
            return `${cfg.metric} @ ${dateStr}`;
        }

        /* ---- produce report: read canvas layout left->right, top->bottom ---- */
        function produceReport() {
            const area = document.getElementById('report-render-area');
            if (!area) return;

            if (wsNodes.length === 0) {
                area.innerHTML = '<p class="report-empty">Nothing to produce \u2014 the workshop canvas is empty.</p>';
                wsLastReport = null;
                return;
            }

            // group nodes into rows by vertical position, then sort each row by x
            const sorted = wsNodes.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
            const rows = [];
            sorted.forEach(n => {
                const row = rows.find(r => Math.abs(r.y - n.y) < 55);
                if (row) row.items.push(n);
                else rows.push({ y: n.y, items: [n] });
            });
            rows.forEach(r => r.items.sort((a, b) => a.x - b.x));

            const companyName = sessionStorage.getItem('kglc_company_name') || 'Company';
            const generated = new Date().toLocaleString();

            let html = '<div class="report-doc">';
            html += `<h2>${escapeHtmlWs(companyName)} \u2014 Custom Report</h2>`;
            html += `<div class="report-meta">Generated ${escapeHtmlWs(generated)} \u00b7 ${wsNodes.length} component(s) \u00b7 ${rows.length} expression row(s)</div>`;

            let plain = `${companyName} - Custom Report\nGenerated ${generated}\n\n`;

            rows.forEach((row, idx) => {
                const parts = [];
                const tokens = [];   // for evaluation
                let comparison = false;

                row.items.forEach(n => {
                    if (n.kind === 'data') {
                        const val = resolveDataNode(n.config);
                        parts.push(`${dataNodeLabel(n.config)} = ${Number(val).toLocaleString()}`);
                        tokens.push({ t: 'num', v: Number(val) });
                    } else if (n.kind === 'value') {
                        const v = parseFloat(n.config.value);
                        const shown = isNaN(v) ? '(empty)' : Number(v).toLocaleString();
                        parts.push(`value ${shown}`);
                        tokens.push({ t: 'num', v: isNaN(v) ? 0 : v });
                    } else if (n.kind === 'operation') {
                        parts.push(n.config.op);
                        tokens.push({ t: 'op', v: n.config.op });
                    } else if (n.kind === 'vs') {
                        parts.push('vs');
                        tokens.push({ t: 'vs' });
                        comparison = true;
                    } else if (n.kind === 'segment') {
                        parts.push('\u2014');
                    }
                });

                const expr = parts.join('  ');
                html += `<div class="report-line"><strong>Row ${idx + 1}:</strong> ${escapeHtmlWs(expr)}</div>`;
                plain += `Row ${idx + 1}: ${expr}\n`;

                const evaluated = evaluateWorkshopRow(tokens, comparison);
                if (evaluated !== null) {
                    html += `<div class="report-result">${escapeHtmlWs(evaluated)}</div>`;
                    plain += `  => ${evaluated}\n`;
                }
                plain += '\n';
            });

            html += '</div>';
            area.innerHTML = html;
            wsLastReport = { title: companyName + ' - Custom Report', text: plain, html: html };
        }

        function evaluateWorkshopRow(tokens, comparison) {
            const nums = tokens.filter(t => t.t === 'num').map(t => t.v);
            if (nums.length < 2) {
                if (nums.length === 1) return 'Result: ' + nums[0].toLocaleString();
                return null;
            }

            if (comparison) {
                const a = nums[0], b = nums[nums.length - 1];
                const diff = a - b;
                const pct = b !== 0 ? ((diff / b) * 100).toFixed(1) + '%' : 'n/a';
                const verdict = diff > 0 ? 'higher' : (diff < 0 ? 'lower' : 'equal');
                return `Comparison: ${a.toLocaleString()} vs ${b.toLocaleString()} \u2014 difference ${diff.toLocaleString()} (${pct}, first is ${verdict})`;
            }

            // left-to-right arithmetic
            let acc = null, pendingOp = null, equality = null;
            tokens.forEach(t => {
                if (t.t === 'num') {
                    if (acc === null) { acc = t.v; return; }
                    if (pendingOp === '+') acc = acc + t.v;
                    else if (pendingOp === '-') acc = acc - t.v;
                    else if (pendingOp === '*') acc = acc * t.v;
                    else if (pendingOp === '/') acc = t.v !== 0 ? acc / t.v : NaN;
                    else if (pendingOp === '=') equality = (acc === t.v);
                    else acc = t.v;
                    pendingOp = null;
                } else if (t.t === 'op') {
                    pendingOp = t.v;
                }
            });

            if (equality !== null) return 'Equality check: ' + (equality ? 'TRUE' : 'FALSE');
            if (acc === null || isNaN(acc)) return 'Result: n/a';
            return 'Result: ' + Number(acc.toFixed(2)).toLocaleString();
        }

        function escapeHtmlWs(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        /* ---- export the produced report ---- */
        function exportProducedReport() {
            if (!wsLastReport) {
                alert('Produce a report first.');
                return;
            }
            const fmt = document.getElementById('report-export-format').value;
            const stamp = new Date().toISOString().slice(0, 10);

            if (fmt === 'txt') {
                const blob = new Blob([wsLastReport.text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kglc-report-${stamp}.txt`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                return;
            }

            // pdf via the browser print dialog on an isolated document
            const win = window.open('', '_blank');
            if (!win) {
                alert('Allow pop-ups to export as PDF.');
                return;
            }
            const doc = win.document;
            doc.title = `kglc-report-${stamp}`;
            const style = doc.createElement('style');
            style.textContent = 'body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;line-height:1.6;}' +
                'h2{font-size:20px;margin-bottom:4px;}' +
                '.report-meta{color:#666;font-size:12px;margin-bottom:20px;}' +
                '.report-line{padding:8px 0;border-bottom:1px dashed #ccc;}' +
                '.report-result{margin:12px 0 20px;padding:12px 14px;border:1px dashed #999;font-weight:bold;}';
            doc.head.appendChild(style);
            const wrap = doc.createElement('div');
            wrap.innerHTML = wsLastReport.html;
            doc.body.appendChild(wrap);
            win.focus();
            setTimeout(() => win.print(), 250);
        }

        window.addEventListener('DOMContentLoaded', initWorkshopPalette);
