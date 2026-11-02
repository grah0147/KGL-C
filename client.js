// Kigali Connect (kgl-c) — Client App Logic (API-Integrated)

const API_BASE = 'http://localhost:8000';

// Auth helpers
function getAuthToken() { return sessionStorage.getItem('kglc_token'); }
function getAuthUserId() { return sessionStorage.getItem('kglc_user_id'); }
function isLoggedIn() { return !!getAuthToken(); }

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

// Orchestrate Intro Stage Transition
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const introStage = document.getElementById('intro-stage');
                const entryOverlay = document.getElementById('username-entry-overlay');
                
                introStage.style.transition = 'opacity 0.3s ease';
                introStage.style.opacity = '0';
                
                setTimeout(() => {
                    introStage.style.display = 'none';
                    if (entryOverlay) {
                        entryOverlay.style.opacity = '1';
                    }
                }, 300);
            }, 2200);
        });

        // System variables
        let currentUserName = "Explorer250";
        let currentUserId = "USR-0000";
        let selectedSeatNumber = 14; 
        let bookedSeatNumbers = [];  // now populated from API
        let currentTripId = null;     // selected trip from API
        let currentTripData = null;   // full trip object
        let currentRoutePrice = 2500; // RWF — updated from trip data

        document.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            document.getElementById('activity-date').value = today.toISOString().split('T')[0];
            document.getElementById('bus-date').value = today.toISOString().split('T')[0];
            document.getElementById('bus-time').value = "14:30";
        });


        const mapThemes = {
            'black-red': 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
            'white-blue': 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            'green-gold': 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png'
        };

        const themes = [{ id: 'black-red' }, { id: 'white-blue' }, { id: 'green-gold' }];
        let currentThemeIndex = 0;
        let mapTileLayer = null;

        function cycleTheme() {
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            const currentTheme = themes[currentThemeIndex];
            document.documentElement.setAttribute('data-theme', currentTheme.id);

            if (map && mapThemes[currentTheme.id]) {
                if (mapTileLayer) map.removeLayer(mapTileLayer);
                mapTileLayer = L.tileLayer(mapThemes[currentTheme.id], { maxZoom: 19 }).addTo(map);
            }
        }

        function switchScreen(screenName, buttonElement) {
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            buttonElement.classList.add('active');
            document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
            const activeScreen = document.getElementById(`screen-${screenName}`);
            if (activeScreen) activeScreen.classList.add('active');
            if (screenName === 'home' && map) {
                setTimeout(() => { map.invalidateSize(); }, 200);
            }
        }

        function toggleForm() {
            document.getElementById('activity-form').classList.toggle('show');
        }

        /* --- LANGUAGE TRANSLATIONS --- */
        let currentLang = 'en';
        
        const entryTranslations = {
            en: {
                heading: "Welcome", subLabel: "Sign in or create an account to book rides.",
                tabLogin: "Login", tabSignup: "Sign Up",
                phoneLabel: "Phone Number", phonePlaceholder: "e.g. 0788123456",
                pinLabel: "PIN", pinPlaceholder: "••••",
                loginBtn: "Login",
                switchToSignup: "Don't have an account? Sign up",
                regPhoneLabel: "Phone Number", regFnameLabel: "First Name", regLnameLabel: "Last Name",
                regEmailLabel: "Email", regPinLabel: "Choose PIN",
                regPhonePlaceholder: "e.g. 0788123456", regFnamePlaceholder: "e.g. Jean",
                regLnamePlaceholder: "e.g. Uwimana", regEmailPlaceholder: "e.g. jean@mail.rw",
                regPinPlaceholder: "4-8 digits",
                signupBtn: "Create Account",
                switchToLogin: "Already have an account? Login",
                loginError: "Login failed. Check your phone and PIN.",
                signupError: "Registration failed. Please try again.",
                signupSuccess: "Account created! Welcome aboard.",
                emptyField: "Please fill in all fields."
            },
            rw: {
                heading: "Murakaza", subLabel: "Kwinjira cyangwa kurema konti kugira ngo ubone amatike.",
                tabLogin: "Kwinjira", tabSignup: "Kwiyandikisha",
                phoneLabel: "Numero ya Telefone", phonePlaceholder: "Urugero: 0788123456",
                pinLabel: "PIN", pinPlaceholder: "••••",
                loginBtn: "Kwinjira",
                switchToSignup: "Nta konti ufite? Kwiyandikisha",
                regPhoneLabel: "Numero ya Telefone", regFnameLabel: "Izina ry'Umbere", regLnameLabel: "Izina ry'Aza",
                regEmailLabel: "Imeyili", regPinLabel: "Hitamo PIN",
                regPhonePlaceholder: "Urugero: 0788123456", regFnamePlaceholder: "Urugero: Jean",
                regLnamePlaceholder: "Urugero: Uwimana", regEmailPlaceholder: "Urugero: jean@mail.rw",
                regPinPlaceholder: "4-8 inyuguti",
                signupBtn: "Kurema Konti",
                switchToLogin: "Ufite konti? Kwinjira",
                loginError: "Kwinjira byanze. Suzuma numero na PIN.",
                signupError: "Kwiyandikisha byanze. Mwigere mukanya.",
                signupSuccess: "Konti yaremwe! Murakaza neza.",
                emptyField: "Nyamuneka huzuzo umwanya wose."
            },
            fr: {
                heading: "Bienvenue", subLabel: "Connectez-vous ou créez un compte pour réserver.",
                tabLogin: "Connexion", tabSignup: "Inscription",
                phoneLabel: "Numéro de téléphone", phonePlaceholder: "ex: 0788123456",
                pinLabel: "PIN", pinPlaceholder: "••••",
                loginBtn: "Se connecter",
                switchToSignup: "Pas de compte ? Inscrivez-vous",
                regPhoneLabel: "Numéro de téléphone", regFnameLabel: "Prénom", regLnameLabel: "Nom",
                regEmailLabel: "Email", regPinLabel: "Choisir un PIN",
                regPhonePlaceholder: "ex: 0788123456", regFnamePlaceholder: "ex: Jean",
                regLnamePlaceholder: "ex: Uwimana", regEmailPlaceholder: "ex: jean@mail.rw",
                regPinPlaceholder: "4-8 chiffres",
                signupBtn: "Créer un compte",
                switchToLogin: "Déjà un compte ? Connexion",
                loginError: "Échec de connexion. Vérifiez votre numéro et PIN.",
                signupError: "Échec d'inscription. Réessayez.",
                signupSuccess: "Compte créé ! Bienvenue à bord.",
                emptyField: "Veuillez remplir tous les champs."
            }
        };

        const translations = {
            en: {
                nav_home: "Home", nav_schedule: "Schedule", nav_notifications: "Notifications", nav_settings: "Settings",
                hero_title: "Ready to travel", routing_engine: "LIVE ROUTING ENGINE", gps_auth: "📍 Live Location Authorization",
                dep_label: "Departure Location", dest_label: "Destination Terminal / Stop", date_label: "Date", time_label: "Time",
                route_btn: "Map Multi-Path Route", boarding_pass_title: "BOARDING PASS GENERATED", schedule_title: "Travel Schedule",
                schedule_desc: "Plan ahead and organize your upcoming trips cleanly.", add_activity_btn: "Add a travel activity",
                activity_name: "Activity Name", save_activity_btn: "Save Activity", notifications_title: "Notifications",
                notifications_desc: "Your saved tickets and transit warnings are collected here.", no_saved_tickets: "You have no saved tickets yet.",
                settings_title: "App Settings", settings_desc: "Customize your profile, configure preferences, and manage your UI layout options.",
                lang_label: "Select System Language", gps_connecting: "Requesting browser permission...", gps_connected: "📍 Live GPS Connected",
                gps_denied: "Permission Denied (Using Fallback)", ticket_prefix: "🎫 Ticket ID", route_prefix: "Route:", from_lbl: "From",
                to_lbl: "To", click_outside: "Tap anywhere outside to close", my_location_opt: "📍 My Location (Live GPS)",
                coords_opt: "🌐 Coordinates (Input Lat/Lng)", choose_company_title: "🚌 Choose Bus Company",
                choose_company_sub: "Select an available bus operator for your chosen route", cancel_btn: "Cancel",
                seat_map_title: "💺 Yutong EcoFleet Bus Map", seat_map_sub: "Select your preferred seat below",
                driver_lbl: "🚘 Driver", door_lbl: "🚪 Door", legend_available: "Available", legend_selected: "Selected",
                legend_booked: "Booked", complete_res_title: "Complete Reservation", momo_phone_lbl: "MTN MoMo Phone Number",
                pay_momo_btn: "Pay with MTN MoMo", passenger_lbl: "Passenger", operator_lbl: "Operator",
                selected_seat_lbl: "Selected Seat", total_price_lbl: "Total Price", select_btn: "Select",
                login_error: "Login failed. Please check your phone number.", no_trips: "No trips found for this route.", booking_error: "Booking failed. Please try again.", payment_error: "Payment failed. Please try again."
            },
            rw: {
                nav_home: "Ahabanza", nav_schedule: "Gahunda", nav_notifications: "Imenyekanisha", nav_settings: "Igenamiterere",
                hero_title: "Witeguye gukora urugendo", routing_engine: "ICYEREKEZO CY'INGENDO", gps_auth: "📍 Kwemerera Kubona Aho Uri",
                dep_label: "Aho Uhagurukira", dest_label: "Aho Ujya / Igaragario", date_label: "Itariki", time_label: "Isaha",
                route_btn: "Erekana Inzira Kuri Karita", boarding_pass_title: "TIKE YAWE YAGENEWE", schedule_title: "Gahunda y'Ingendo",
                schedule_desc: "Panga mbere utunganye ingendo zawe ziri imbere.", add_activity_btn: "Ongeraho igikorwa cy'urugendo",
                activity_name: "Izina ry'igikorwa", save_activity_btn: "Bika Igikorwa", notifications_title: "Imenyekanisha",
                notifications_desc: "Amatike yawe yabitswe n'imbuzi z'ingendo biri hano.", no_saved_tickets: "Nta tike urabika.",
                settings_title: "Igenamiterere ry'Aparike", settings_desc: "Hindura umwirondoro wawe, ibyo ukunda, n'iboneza rya UI.",
                lang_label: "Hitamo Ururimi rwa Sisitemu", gps_connecting: "Gusaba uruhushya rwa mushakisha...", gps_connected: "📍 GPS Yahuje",
                gps_denied: "Uruhushya rwanzwe (Kukoresha Aho Witeganyirije)", ticket_prefix: "🎫 Tike ID", route_prefix: "Inzira:",
                from_lbl: "Kuva", to_lbl: "Kujya", click_outside: "Kanda ahandi hantu ukureho", my_location_opt: "📍 Aho Mpagaze Ubu (Live GPS)",
                coords_opt: "🌐 Ibyerekezo (Shyiramo Lat/Lng)", choose_company_title: "🚌 Hitamo Kompanyi y'Ibusa",
                choose_company_sub: "Hitamo kompanyi ikora urugendo watoranyije", cancel_btn: "Kansera",
                seat_map_title: "💺 Ikarita y'Ibyitiro bya Yutong EcoFleet", seat_map_sub: "Hitamo icyicaro wifuza ku ikarita",
                driver_lbl: "🚘 Umushoferi", door_lbl: "🚪 Umuryango", legend_available: "Ikirimo", legend_selected: "Icyo Wahisemo",
                legend_booked: "Icyaguzwe", complete_res_title: "Rangiza Kutanga Komande", momo_phone_lbl: "Numero ya MTN MoMo",
                pay_momo_btn: "Kwisha na MTN MoMo", passenger_lbl: "Umutagatasi", operator_lbl: "Kompanyi",
                selected_seat_lbl: "Icyicaro Wahisemo", total_price_lbl: "Igiciro cyose", select_btn: "Hitamo",
                login_error: "Kwinjira byanze. Suzuma numero ya telefone.", no_trips: "Nta ngendo zabonetse kuri iyi nzira.", booking_error: "Kutanga komande byanze. Mwigere mukanya.", payment_error: "Kwishura byanze. Mwigere mukanya."
            },
            fr: {
                nav_home: "Accueil", nav_schedule: "Planning", nav_notifications: "Notifications", nav_settings: "Paramètres",
                hero_title: "Prêt à voyager", routing_engine: "MOTEUR D'ITINÉRAIRE EN DIRECT", gps_auth: "📍 Autorisation de localisation",
                dep_label: "Lieu de départ", dest_label: "Terminal / Arrêt de destination", date_label: "Date", time_label: "Heure",
                route_btn: "Tracer l'itinéraire", boarding_pass_title: "CARTE D'EMBARQUEMENT GÉNÉRÉE", schedule_title: "Calendrier de voyage",
                schedule_desc: "Planifiez à l'avance et organisez vos prochains voyages.", add_activity_btn: "Ajouter une activité",
                activity_name: "Nom de l'activité", save_activity_btn: "Enregistrer l'activité", notifications_title: "Notifications",
                notifications_desc: "Vos billets enregistrés et vos alertes de transport sont regroupés ici.", no_saved_tickets: "Vous n'avez pas encore de billets enregistrés.",
                settings_title: "Paramètres de l'application", settings_desc: "Personnalisez votre profil, configurez vos préférences et gérez les options d'affichage.",
                lang_label: "Sélectionner la langue", gps_connecting: "Demande d'autorisation du navigateur...", gps_connected: "📍 GPS connecté en direct",
                gps_denied: "Autorisation refusée (Localisation par défaut)", ticket_prefix: "🎫 Billet N°", route_prefix: "Itinéraire:",
                from_lbl: "De", to_lbl: "À", click_outside: "Appuyez n'importe où en dehors pour fermer", my_location_opt: "📍 Ma position (GPS en direct)",
                coords_opt: "🌐 Coordonnées (Saisie Lat/Lng)", choose_company_title: "🚌 Choisir la compagnie de bus",
                choose_company_sub: "Sélectionnez un opérateur disponible pour cet itinéraire", cancel_btn: "Annuler",
                seat_map_title: "💺 Plan des sièges Yutong EcoFleet", seat_map_sub: "Choisissez votre siège préféré ci-dessous",
                driver_lbl: "🚘 Chauffeur", door_lbl: "🚪 Porte", legend_available: "Disponible", legend_selected: "Sélectionné",
                legend_booked: "Réservé", complete_res_title: "Finaliser la réservation", momo_phone_lbl: "Numéro MTN MoMo",
                pay_momo_btn: "Payer avec MTN MoMo", passenger_lbl: "Passager", operator_lbl: "Opérateur",
                selected_seat_lbl: "Siège sélectionné", total_price_lbl: "Prix total", select_btn: "Sélectionner",
                login_error: "Échec de connexion. Vérifiez votre numéro.", no_trips: "Aucun trajet trouvé pour cet itinéraire.", booking_error: "Réservation échouée. Réessayez.", payment_error: "Paiement échoué. Réessayez."
            }
        };

        function setEntryLanguage(lang) {
            document.querySelectorAll('.entry-lang-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`lang-btn-${lang}`).classList.add('active');
            const e = entryTranslations[lang];
            document.getElementById('entry-heading').textContent = e.heading;
            document.getElementById('entry-sub-label').textContent = e.subLabel;
            // Login form labels
            document.getElementById('entry-phone-label').textContent = e.phoneLabel;
            document.getElementById('entry-phone').placeholder = e.phonePlaceholder;
            document.getElementById('entry-pin-label').textContent = e.pinLabel;
            document.getElementById('entry-pin').placeholder = e.pinPlaceholder;
            document.getElementById('entry-login-btn').textContent = e.loginBtn;
            document.getElementById('entry-switch-to-signup').textContent = e.switchToSignup;
            // Signup form labels
            document.getElementById('entry-reg-phone-label').textContent = e.regPhoneLabel;
            document.getElementById('entry-reg-phone').placeholder = e.regPhonePlaceholder;
            document.getElementById('entry-reg-fname-label').textContent = e.regFnameLabel;
            document.getElementById('entry-reg-fname').placeholder = e.regFnamePlaceholder;
            document.getElementById('entry-reg-lname-label').textContent = e.regLnameLabel;
            document.getElementById('entry-reg-lname').placeholder = e.regLnamePlaceholder;
            document.getElementById('entry-reg-email-label').textContent = e.regEmailLabel;
            document.getElementById('entry-reg-email').placeholder = e.regEmailPlaceholder;
            document.getElementById('entry-reg-pin-label').textContent = e.regPinLabel;
            document.getElementById('entry-reg-pin').placeholder = e.regPinPlaceholder;
            document.getElementById('entry-signup-btn').textContent = e.signupBtn;
            document.getElementById('entry-switch-to-login').textContent = e.switchToLogin;
            // Tab buttons
            document.getElementById('entry-tab-login').textContent = e.tabLogin;
            document.getElementById('entry-tab-signup').textContent = e.tabSignup;
            switchLanguage(lang);
        }

        /* --- ENTRY TAB SWITCHING --- */
        function switchEntryTab(tab) {
            const loginForm = document.getElementById('entry-login-form');
            const signupForm = document.getElementById('entry-signup-form');
            const loginTab = document.getElementById('entry-tab-login');
            const signupTab = document.getElementById('entry-tab-signup');
            const indicator = document.getElementById('entry-tab-indicator');

            if (tab === 'login') {
                loginForm.style.display = '';
                signupForm.style.display = 'none';
                loginTab.classList.add('active');
                signupTab.classList.remove('active');
                indicator.style.transform = 'translateX(0)';
            } else {
                loginForm.style.display = 'none';
                signupForm.style.display = '';
                loginTab.classList.remove('active');
                signupTab.classList.add('active');
                indicator.style.transform = 'translateX(100%)';
            }
        }

        /* --- CLIENT LOGIN --- */
        async function handleClientLogin() {
            const phone = document.getElementById('entry-phone').value.trim();
            const pin = document.getElementById('entry-pin').value.trim();
            const e = entryTranslations[currentLang];
            const dict = translations[currentLang];
            if (!phone || !pin) { alert(e.emptyField); return; }

            try {
                const data = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ role: 'user', phone_number: phone, pin: pin })
                });

                sessionStorage.setItem('kglc_token', data.token);
                sessionStorage.setItem('kglc_user_id', data.user.user_id);
                sessionStorage.setItem('kglc_user_name', data.user.full_name || phone);
                currentUserName = data.user.full_name || phone;
                currentUserId = data.user.user_id;

                document.getElementById('username-entry-overlay').classList.add('hidden');
                document.getElementById('core-app-wrapper').classList.remove('app-blurred');

                const heroElem = document.querySelector('.home-hero');
                if (heroElem) heroElem.textContent = `${dict.hero_title}, ${currentUserName}!`;

                loadSavedTickets();
            } catch (err) {
                alert(e.loginError + ' (' + err.message + ')');
            }
        }

        /* --- CLIENT SIGNUP --- */
        async function handleClientSignup() {
            const phone = document.getElementById('entry-reg-phone').value.trim();
            const firstName = document.getElementById('entry-reg-fname').value.trim();
            const lastName = document.getElementById('entry-reg-lname').value.trim();
            const email = document.getElementById('entry-reg-email').value.trim();
            const pin = document.getElementById('entry-reg-pin').value.trim();
            const e = entryTranslations[currentLang];
            const dict = translations[currentLang];

            if (!phone || !firstName || !lastName || !email || !pin) {
                alert(e.emptyField); return;
            }
            if (pin.length < 4) {
                alert(currentLang === 'rw' ? 'PIN igomba kugira inyuguti 4 cyangwa irenze' : currentLang === 'fr' ? 'Le PIN doit comporter au moins 4 chiffres' : 'PIN must be at least 4 digits');
                return;
            }

            const signupBtn = document.getElementById('entry-signup-btn');
            signupBtn.disabled = true;
            signupBtn.textContent = '...';

            try {
                const data = await apiFetch('/api/auth/register/client', {
                    method: 'POST',
                    body: JSON.stringify({
                        phone_number: phone,
                        first_name: firstName,
                        last_name: lastName,
                        email: email,
                        pin: pin
                    })
                });

                sessionStorage.setItem('kglc_token', data.token);
                sessionStorage.setItem('kglc_user_id', data.user.user_id);
                sessionStorage.setItem('kglc_user_name', data.user.full_name || phone);
                currentUserName = data.user.full_name || phone;
                currentUserId = data.user.user_id;

                document.getElementById('username-entry-overlay').classList.add('hidden');
                document.getElementById('core-app-wrapper').classList.remove('app-blurred');

                const heroElem = document.querySelector('.home-hero');
                if (heroElem) heroElem.textContent = `${dict.hero_title}, ${currentUserName}!`;

                loadSavedTickets();
            } catch (err) {
                alert(e.signupError + ' (' + err.message + ')');
            } finally {
                signupBtn.disabled = false;
                signupBtn.textContent = e.signupBtn;
            }
        }

        function switchLanguage(langCode) {
            currentLang = langCode;
            const dict = translations[langCode];
            document.getElementById('language-select').value = langCode;
            
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const translationKey = element.getAttribute('data-i18n');
                if (dict[translationKey]) {
                    element.textContent = dict[translationKey];
                }
            });

            const heroElem = document.querySelector('.home-hero');
            if (heroElem) {
                heroElem.textContent = `${dict.hero_title}, ${currentUserName}!`;
            }

            renderSavedTickets();
        }

        /* --- LOCATIONS FROM API --- */
        let busStations = [];  // populated from GET /api/locations

        async function loadLocations() {
            try {
                const locations = await apiFetch('/api/locations');
                busStations = locations.filter(l => l.is_active).map(l => ({
                    location_id: l.location_id,
                    name: l.name,
                    name_rw: l.name_rw || l.name,
                    coords: [l.latitude, l.longitude],
                    zoom: 18,
                    isStop: l.type === 'bus_station',
                    companies: []  // will be populated from trip results
                }));
                populateDropdowns();
            } catch (err) {
                console.error('Failed to load locations:', err);
                // Fallback minimal set so the UI still works
                busStations = [
                    { location_id: 1, name: "Nyabugogo Bus Park", name_rw: "Nyabugogo", coords: [-1.9398, 30.0427], zoom: 18, isStop: false, companies: [] },
                    { location_id: 2, name: "Musanze Bus Station", name_rw: "Musanze", coords: [-1.5034, 29.6341], zoom: 18, isStop: false, companies: [] }
                ];
                populateDropdowns();
            }
        }

        let currentStationIndex = 0;
        let map;
        let routeControlBlue = null;
        let activeMarker = null, userLocationMarker = null;
        let userCoords = [-1.9545, 30.0922]; 
        let savedTickets = [];
        let latestGeneratedTicket = null;

        function populateDropdowns() {
            const termGroups = document.querySelectorAll('.opt-terminals');
            const stopGroups = document.querySelectorAll('.opt-stops');

            let termHTML = '', stopHTML = '';

            busStations.forEach((st, idx) => {
                const opt = `<option value="${idx}">${st.name}</option>`;
                if (st.isStop) stopHTML += opt;
                else termHTML += opt;
            });

            termGroups.forEach(g => g.innerHTML = termHTML);
            stopGroups.forEach(g => g.innerHTML = stopHTML);

            if (busStations.length > 1) {
                document.getElementById('bus-destination').value = "1";
            }
        }

        function handleLocationChange(type) {
            const selectElem = document.getElementById(`bus-${type}`);
            const coordsBox = document.getElementById(`${type === 'departure' ? 'dep' : 'dest'}-coords-box`);

            if (selectElem.value === 'custom_coords') {
                coordsBox.classList.add('show');
            } else {
                coordsBox.classList.remove('show');
            }

            if (selectElem.value === 'my_location') {
                askPermissionAndConnectGPS();
            }
        }

        async function initMap() {
            await loadLocations();

            map = L.map('leaflet-map', { zoomControl: true, attributionControl: false }).setView([-1.9402, 30.0600], 11); 
            mapTileLayer = L.tileLayer(mapThemes['black-red'], { maxZoom: 19 }).addTo(map);

            if (busStations.length > 0) {
                updateMapToStation(0, false);
            }
            askPermissionAndConnectGPS();
        }

        function askPermissionAndConnectGPS() {
            if (!navigator.geolocation) {
                document.getElementById('user-gps-status').value = translations[currentLang].gps_denied;
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    userCoords = [pos.coords.latitude, pos.coords.longitude];
                    document.getElementById('user-gps-status').value = translations[currentLang].gps_connected;

                    const userIcon = L.divIcon({
                        html: '<div style="background-color: #007aff; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
                        className: ''
                    });
                    
                    if (userLocationMarker) map.removeLayer(userLocationMarker);
                    userLocationMarker = L.marker(userCoords, { icon: userIcon }).addTo(map).bindPopup("<b>Aho Mpagaze Ubu</b>");
                },
                (err) => {
                    document.getElementById('user-gps-status').value = translations[currentLang].gps_denied;
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        }

        function updateMapToStation(index, animate = true) {
            if (index < 0 || index >= busStations.length) return;
            clearAllRouting();
            const station = busStations[index];
            currentStationIndex = index;
            document.getElementById('park-display-label').textContent = station.name;

            if (activeMarker) {
                activeMarker.setLatLng(station.coords).bindPopup(`<b>${station.name}</b>`).openPopup();
            } else {
                activeMarker = L.marker(station.coords).addTo(map).bindPopup(`<b>${station.name}</b>`).openPopup();
            }

            if (animate) map.flyTo(station.coords, 14, { duration: 1.5 });
        }

        /* --- PARK NAVIGATION (arrows next to the park label) --- */
        function navigateParks(direction) {
            if (!busStations.length) return;
            let next = currentStationIndex + direction;
            if (next < 0) next = busStations.length - 1;
            if (next >= busStations.length) next = 0;
            updateMapToStation(next, true);
        }

        /* --- SEARCH TRIGGER (bound from the HTML search button) --- */
        function initiateRouteSearch() {
            return computeAndShowRoute();
        }

        function resolveCoords(selectId, latId, lngId) {
            const sel = document.getElementById(selectId);
            const val = sel.value;
            if (val === 'my_location') return { name: 'My Location', latLng: L.latLng(userCoords), raw: null };
            if (val === 'custom_coords') {
                const lat = parseFloat(document.getElementById(latId).value) || -1.95;
                const lng = parseFloat(document.getElementById(lngId).value) || 30.06;
                return { name: `Custom (${lat.toFixed(4)}, ${lng.toFixed(4)})`, latLng: L.latLng([lat, lng]), raw: null };
            }
            const idx = parseInt(val);
            const station = busStations[idx];
            if (!station) return { name: 'Unknown', latLng: L.latLng([-1.95, 30.06]), raw: null };
            return { name: station.name, latLng: L.latLng(station.coords), raw: station };
        }

        function clearAllRouting() {
            if (routeControlBlue) { map.removeControl(routeControlBlue); routeControlBlue = null; }
        }

        /* --- ROUTING ENGINE (now queries API for trips) --- */
        async function computeAndShowRoute() {
            const dep = resolveCoords('bus-departure', 'dep-lat', 'dep-lng');
            const dest = resolveCoords('bus-destination', 'dest-lat', 'dest-lng');
            const dict = translations[currentLang];

            if (dep.latLng.equals(dest.latLng)) {
                alert(currentLang === 'rw' ? 'Aho uhaguruki na ho aho ujya ni kimwe cya kimwe' : 'Departure and destination cannot be the same.');
                return;
            }

            clearAllRouting();

            // Draw visual route on map
            routeControlBlue = L.Routing.control({
                waypoints: [dep.latLng, dest.latLng],
                lineOptions: { styles: [{ color: '#3b82f6', weight: 5, opacity: 0.8 }] },
                createMarker: function(i, wp) {
                    return L.marker(wp.latLng).bindPopup(`<b>${i === 0 ? 'Guhaguruka: ' + dep.name : 'Aho Ujya: ' + dest.name}</b>`).openPopup();
                },
                addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: true
            }).addTo(map);

            // Query API for matching trips
            const travelDate = document.getElementById('bus-date').value;
            const depLocationId = dep.raw ? dep.raw.location_id : null;
            const destLocationId = dest.raw ? dest.raw.location_id : null;

            if (!depLocationId || !destLocationId) {
                // If custom coords, show company modal with all companies from any trips
                try {
                    const allTrips = await apiFetch(`/api/trips?date=${travelDate}`);
                    const companies = [...new Set(allTrips.map(t => t.company_name))];
                    if (companies.length > 0) {
                        openBusCompanyModal(companies);
                    } else {
                        alert(dict.no_trips);
                    }
                } catch (e) {
                    alert(dict.no_trips);
                }
                return;
            }

            try {
                const trips = await apiFetch(`/api/trips?from=${depLocationId}&to=${destLocationId}&date=${travelDate}`);
                if (trips.length === 0) {
                    alert(dict.no_trips);
                    return;
                }

                // Group trips by company
                const companyMap = {};
                trips.forEach(t => {
                    if (!companyMap[t.company_name]) companyMap[t.company_name] = [];
                    companyMap[t.company_name].push(t);
                });

                const companies = Object.keys(companyMap);
                // Store trips for later use
                window._availableTrips = companyMap;

                if (companies.length === 1) {
                    currentSelectedBusCompany = companies[0];
                    // Auto-select the first trip for this company
                    currentTripData = companyMap[companies[0]][0];
                    currentTripId = currentTripData.trip_id;
                    currentRoutePrice = currentTripData.base_price_rwf;
                    openPaywallModal();
                } else {
                    openBusCompanyModal(companies);
                }
            } catch (e) {
                alert(dict.no_trips + ' (' + e.message + ')');
            }
        }

        /* --- BUS SELECTION MODAL SYSTEM --- */
        function openBusCompanyModal(companies) {
            const dict = translations[currentLang];
            const container = document.getElementById('bus-companies-list');
            container.innerHTML = companies.map(comp => `
                <button class="bus-company-btn" onclick="selectBusCompany('${comp}')">
                    <span>🚍 ${comp}</span>
                    <span style="color: var(--accent-color); font-size: 12px;">${dict.select_btn} &rrarr;</span>
                </button>
            `).join('');

            document.getElementById('bus-modal-overlay').classList.add('active');
        }

        function closeBusModal() {
            document.getElementById('bus-modal-overlay').classList.remove('active');
        }

        function selectBusCompany(companyName) {
            currentSelectedBusCompany = companyName;
            // Set trip data from stored available trips
            if (window._availableTrips && window._availableTrips[companyName]) {
                currentTripData = window._availableTrips[companyName][0];
                currentTripId = currentTripData.trip_id;
                currentRoutePrice = currentTripData.base_price_rwf;
            }
            closeBusModal();
            openPaywallModal();
        }

        /* --- YUTONG ECOFLEET SEAT RENDERER ENGINE (API-backed) --- */
        async function loadSeatsForTrip() {
            if (!currentTripId) return;
            try {
                const seatData = await apiFetch(`/api/trips/${currentTripId}/seats`);
                bookedSeatNumbers = seatData.seats
                    .filter(s => s.status !== 'available')
                    .map(s => s.seat_number);
                // Reset selected seat if it's booked
                if (bookedSeatNumbers.includes(selectedSeatNumber)) {
                    const avail = seatData.seats.filter(s => s.status === 'available');
                    selectedSeatNumber = avail.length > 0 ? avail[0].seat_number : 1;
                }
            } catch (e) {
                console.error('Failed to load seats:', e);
                bookedSeatNumbers = [];
            }
        }

        function renderYutongSeatMap() {
            const mapContainer = document.getElementById('yutong-seat-map');
            let html = '';
            let currentSeatCounter = 1;

            for (let r = 0; r < 5; r++) {
                const s1 = currentSeatCounter++;
                const s2 = currentSeatCounter++;
                const s3 = currentSeatCounter++;
                const s4 = currentSeatCounter++;

                html += `
                <div class="yutong-row">
                    <div class="seat-pair">
                        ${createSeatBtn(s1)}
                        ${createSeatBtn(s2)}
                    </div>
                    <div class="bus-aisle">INZIRA</div>
                    <div class="seat-pair">
                        ${createSeatBtn(s3)}
                        ${createSeatBtn(s4)}
                    </div>
                </div>`;
            }

            html += `<div class="yutong-row" style="margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 8px;">`;
            for (let b = 0; b < 5; b++) {
                const sBack = currentSeatCounter++;
                html += createSeatBtn(sBack);
            }
            html += `</div>`;

            mapContainer.innerHTML = html;
        }

        function createSeatBtn(seatNum) {
            const isBooked = bookedSeatNumbers.includes(seatNum);
            const isSelected = (seatNum === selectedSeatNumber && !isBooked);

            if (isBooked) {
                return `<button class="yutong-seat booked" title="Icyicaro #${seatNum} cyaraguzwe" disabled>${seatNum}</button>`;
            } else {
                return `<button class="yutong-seat ${isSelected ? 'selected' : ''}" onclick="pickYutongSeat(${seatNum}, this)">${seatNum}</button>`;
            }
        }

        function pickYutongSeat(seatNum, element) {
            selectedSeatNumber = seatNum;
            document.querySelectorAll('.yutong-seat').forEach(btn => btn.classList.remove('selected'));
            element.classList.add('selected');
            updatePaywallTextSummary();
        }

        /* --- PAYWALL & MOMO ENGINE (API-backed) --- */
        async function openPaywallModal() {
            await loadSeatsForTrip();
            renderYutongSeatMap();
            updatePaywallTextSummary();
            document.getElementById('paywall-modal-overlay').classList.add('active');
        }

        function updatePaywallTextSummary() {
            const dep = resolveCoords('bus-departure', 'dep-lat', 'dep-lng');
            const dest = resolveCoords('bus-destination', 'dest-lat', 'dest-lng');
            const dict = translations[currentLang];

            document.getElementById('paywall-summary-text').innerHTML = `
                <strong>${dict.passenger_lbl}:</strong> ${currentUserName} (${currentUserId})<br>
                <strong>${dict.operator_lbl}:</strong> ${currentSelectedBusCompany}<br>
                <strong>${dict.selected_seat_lbl}:</strong> <span style="color: var(--accent-color); font-weight: bold;">Icyicaro #${selectedSeatNumber}</span><br>
                <strong>${dict.from_lbl}:</strong> ${dep.name.split('(')[0]}<br>
                <strong>${dict.to_lbl}:</strong> ${dest.name.split('(')[0]}<br>
                <strong>${dict.total_price_lbl}:</strong> <span style="color: #4cd964; font-weight: bold;">RWF ${currentRoutePrice.toLocaleString()}</span>
            `;
        }

        function closePaywallModal() {
            document.getElementById('paywall-modal-overlay').classList.remove('active');
        }

        async function executeMomoPayment() {
            const phone = document.getElementById('momo-phone').value.trim();
            const dict = translations[currentLang];
            if (!phone) { 
                alert(currentLang === 'rw' ? "Nyamuneka shyiramo numero ya MTN Mobile Money" : "Please enter your MTN Mobile Money phone number"); 
                return; 
            }

            const payBtn = document.getElementById('momo-pay-btn');
            payBtn.disabled = true;
            payBtn.textContent = currentLang === 'rw' ? "Kwohereza ubwisanzure bwa MoMo..." : "Processing MoMo API Prompt...";

            try {
                // Step 1: Create booking via API
                const bookingData = await apiFetch('/api/bookings', {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: parseInt(currentUserId),
                        trip_id: currentTripId,
                        seat_number: selectedSeatNumber
                    })
                });

                const bookingId = bookingData.booking_id;
                const qrPayload = bookingData.qr_payload || JSON.stringify({ booking_id: bookingId, seat: selectedSeatNumber, trip: currentTripId });

                // Step 2: Process MoMo payment
                const paymentData = await apiFetch('/api/payments/momo', {
                    method: 'POST',
                    body: JSON.stringify({
                        booking_id: bookingId,
                        phone_number: phone,
                        amount: currentRoutePrice
                    })
                });

                payBtn.disabled = false;
                payBtn.textContent = dict.pay_momo_btn;
                closePaywallModal();

                generateFinalTicket(bookingId, qrPayload);
            } catch (err) {
                payBtn.disabled = false;
                payBtn.textContent = dict.pay_momo_btn;
                alert(dict.payment_error + ' (' + err.message + ')');
            }
        }

        function generateFinalTicket(bookingId, qrPayload) {
            const dep = resolveCoords('bus-departure', 'dep-lat', 'dep-lng');
            const dest = resolveCoords('bus-destination', 'dest-lat', 'dest-lng');
            const travelDate = document.getElementById('bus-date').value;
            const travelTime = document.getElementById('bus-time').value;
            const ticketId = bookingId || Math.floor(100000 + Math.random() * 900000);

            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`;

            latestGeneratedTicket = {
                id: ticketId,
                user: currentUserName,
                userId: currentUserId,
                bus: currentSelectedBusCompany,
                seat: selectedSeatNumber,
                from: dep.name,
                to: dest.name,
                date: travelDate,
                time: travelTime,
                qr: qrUrl,
                qr_payload: qrPayload
            };

            document.getElementById('qr-image-placeholder').src = qrUrl;
            document.getElementById('qr-meta-text').innerHTML = `<b>Tike:</b> #${ticketId} | Icyicaro #${selectedSeatNumber} (${currentSelectedBusCompany})`;
            document.getElementById('ticket-qr-panel').classList.add('show');

            saveNewTicketToList(ticketId, dep.name, dest.name, travelDate, travelTime, qrUrl, currentSelectedBusCompany, selectedSeatNumber);
            openLargeQRFromActive();
        }

        /* --- QR ENLARGEMENT MODAL CONTROLS --- */
        function openLargeQR(id) {
            const ticket = savedTickets.find(t => t.id === id);
            if (!ticket) return;

            const dict = translations[currentLang];
            document.getElementById('modal-ticket-id').textContent = `${dict.ticket_prefix} #${ticket.id}`;
            document.getElementById('modal-qr-img').src = ticket.qr;
            document.getElementById('modal-ticket-details').innerHTML = `
                <strong>${dict.passenger_lbl}:</strong> ${ticket.user || currentUserName} (${ticket.userId || currentUserId})<br>
                <strong>${dict.operator_lbl}:</strong> ${ticket.bus || 'Bus Express'}<br>
                <strong>Icyicaro:</strong> #${ticket.seat}<br>
                <strong>${dict.from_lbl}:</strong> ${ticket.from}<br>
                <strong>${dict.to_lbl}:</strong> ${ticket.to}<br>
                <strong>${dict.date_label}/${dict.time_label}:</strong> ${ticket.date} &bull; ${ticket.time}
            `;
            document.getElementById('qr-modal-overlay').classList.add('active');
        }

        function openLargeQRFromActive() {
            if (!latestGeneratedTicket) return;
            openLargeQR(latestGeneratedTicket.id);
        }

        function closeLargeQR() {
            document.getElementById('qr-modal-overlay').classList.remove('active');
        }

        /* --- SAVED TICKETS MANAGER (API-backed) --- */
        async function loadSavedTickets() {
            if (!isLoggedIn()) return;
            try {
                const bookings = await apiFetch(`/api/users/${getAuthUserId()}/bookings`);
                savedTickets = bookings.map(b => ({
                    id: b.booking_id,
                    user: currentUserName,
                    userId: currentUserId,
                    bus: b.company_name,
                    seat: b.seat_number,
                    from: b.origin,
                    to: b.destination,
                    date: b.departure_date,
                    time: b.departure_time,
                    qr: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(b.qr_payload)}`,
                    qr_payload: b.qr_payload,
                    status: b.booking_status
                }));
                renderSavedTickets();
            } catch (e) {
                console.error('Failed to load bookings:', e);
            }
        }

        function saveNewTicketToList(id, from, to, date, time, qr, bus, seat) {
            const ticket = { id, user: currentUserName, userId: currentUserId, from, to, date, time, qr, bus, seat };
            savedTickets.unshift(ticket); 
            renderSavedTickets();
            // Reload from API to stay in sync
            setTimeout(() => loadSavedTickets(), 1000);
        }

        function deleteTicket(id) {
            savedTickets = savedTickets.filter(ticket => ticket.id !== id);
            renderSavedTickets();
        }

        function renderSavedTickets() {
            const container = document.getElementById('notifications-display-area');
            const badge = document.getElementById('notification-badge');
            const dict = translations[currentLang];

            if (savedTickets.length > 0) {
                badge.textContent = savedTickets.length;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }

            if (savedTickets.length === 0) {
                container.innerHTML = `<p style="color: var(--text-muted); margin-top: 20px; grid-column: 1/-1;">${dict.no_saved_tickets}</p>`;
                return;
            }

            container.innerHTML = savedTickets.map(ticket => `
                <div class="ticket-card">
                    <div class="ticket-info">
                        <h4>${dict.ticket_prefix} #${ticket.id}</h4>
                        <p><strong>${dict.operator_lbl}:</strong> ${ticket.bus} (Icyicaro #${ticket.seat})</p>
                        <p><strong>${dict.from_lbl}:</strong> ${ticket.from.split('(')[0]}</p>
                        <p><strong>${dict.to_lbl}:</strong> ${ticket.to.split('(')[0]}</p>
                        <div class="ticket-meta">${ticket.date} &bull; ${ticket.time}</div>
                    </div>
                    <div class="ticket-media-action">
                        <button class="qr-trigger-btn" onclick="openLargeQR(${ticket.id})" title="Fungura Tike">
                            <img src="${ticket.qr}" alt="Boarding QR">
                        </button>
                        <button class="bin-btn" style="margin-top: 4px;" onclick="deleteTicket(${ticket.id})" title="Siba Tike">🗑️</button>
                    </div>
                </div>
            `).join('');
        }

        window.onload = function() {
            initMap();
        };

        /* --- SCHEDULE TIMER --- */
        let targetTime = null;
        let timerInterval = null;

        function scheduleActivity() {
            const nameInput = document.getElementById('activity-name').value;
            const dateInput = document.getElementById('activity-date').value;
            const timeInput = document.getElementById('activity-time').value;

            if (!nameInput || !dateInput || !timeInput) return;
            targetTime = new Date(`${dateInput}T${timeInput}`);
            document.getElementById('activity-form').classList.remove('show');

            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateBackgroundTimer, 1000);
        }

        function updateBackgroundTimer() {
            if (!targetTime) return;
            const now = new Date();
            if (targetTime - now <= 0) clearInterval(timerInterval);
        }