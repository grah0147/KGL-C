// Kigali Connect (kgl-c) — Driver App Logic (API-Integrated)

const API_BASE = 'http://localhost:8000';

// Auth helpers
function getAuthToken() { return sessionStorage.getItem('kglc_token'); }
function getAuthDriverId() { return sessionStorage.getItem('kglc_driver_id'); }
function getAuthBusId() { return sessionStorage.getItem('kglc_bus_id'); }
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

// --- Casual Professional Multi-Language Dictionary ---
    const translations = {
      en: {
        entryTitle: "Driver Access",
        entrySubtitle: "Sign in or register to access the driver dashboard",
        plateLabel: "Plate Number",
        codeLabel: "Entry Code",
        accessBtn: "Access Dashboard",
        tabLogin: "Login",
        tabSignup: "Sign Up",
        regCompanyLabel: "Bus Company",
        regCompanyPlaceholder: "-- Select Company --",
        regFnameLabel: "First Name",
        regLnameLabel: "Last Name",
        regPhoneLabel: "Phone Number",
        regLicenseLabel: "License Number",
        regPinLabel: "Choose PIN",
        signupBtn: "Create Account",
        switchToSignup: "Don't have an account? Sign up",
        switchToLogin: "Already have an account? Login",
        signupError: "Registration failed. Please check your details and try again.",
        emptyField: "Please fill out all required fields.",
        pinLengthError: "PIN must be 4-8 digits.",
        sideBrand: "Dashboard",
        navHome: "Home",
        navVehicle: "Vehicle Status",
        navTravel: "Travel Status",
        navSettings: "Settings",
        themeBtn: "Theme",
        homeTitle: "Home Dashboard",
        qrTitle: "QR Code Scanner",
        camOffline: "CAMERA FEED OFFLINE",
        btnScan: "Start Camera Scan",
        qrOr: "Or Upload File",
        chooseImg: "Choose QR Code Image",
        qrEngineText: "QR Code Engine is currently inactive. Ready for library hookup.",
        vehTitle: "Vehicle Status Logs",
        addVehBtn: "+ Add Vehicle Status",
        newLogTitle: "New Status Log",
        lblLogTitle: "Log Title",
        lblLogBody: "Status Report",
        btnCancelVeh: "Cancel",
        btnPostVeh: "Post Log",
        initLogTitle: "Initial Diagnostics Run",
        initLogTag: "System Generated",
        initLogDesc: "All core systems calibrated. GPS lock active, network latency within normal parameters, and battery levels stable at 98%.",
        namedStations: "Named Stations",
        addStationBtn: "+ Add Station",
        drawerHint: "Click the > button to toggle this drawer.",
        modalTitle: "Query & Select Station",
        modalDesc: "Direct text input is locked. Use the selection parameters below to query database registry points.",
        modalLbl: "Query Station Registry",
        modalCancel: "Cancel",
        modalPlot: "Query & Plot",
        settTitle: "Settings",
        settHead: "General App Configurations",
        settDesc: "Manage display attributes and diagnostic properties.",
        settLangHead: "Language Preferences",
        settLangDesc: "Choose your preferred system language anytime during your session.",
        loginError: "Login failed. Check plate number and entry code.",
        scheduleEmpty: "No upcoming trips scheduled.",
        qrValid: "Ticket VALID",
        qrInvalid: "Ticket INVALID",
        signupSuccess: "Account created! You can now login."
      },
      rw: {
        entryTitle: "Kwinjira ku Nkumi y'Igare",
        entrySubtitle: "Kwinjira cyangwa kwiyandikisha kugira ngo ukore ku kibazo",
        plateLabel: "Puwaki y'Ikinyabiziga",
        codeLabel: "Kodi yo Kwinjira",
        accessBtn: "Injira mu Sisitemu",
        tabLogin: "Kwinjira",
        tabSignup: "Kwiyandikisha",
        regCompanyLabel: "Sosiyete y'Ibinyabiziga",
        regCompanyPlaceholder: "-- Hitamo Sosiyete --",
        regFnameLabel: "Izina ry'Imbere",
        regLnameLabel: "Izina ry'Isekere",
        regPhoneLabel: "Nimero y'Ifumbire",
        regLicenseLabel: "Nimero y'Urwangye",
        regPinLabel: "Hitamo PIN",
        signupBtn: "Kora Konti",
        switchToSignup: "Nta konti ufite? Yandikisha",
        switchToLogin: "Ufite konti? Kwinjira",
        signupError: "Kwiyandikisha byanze. Reba neza amakuru yawe.",
        emptyField: "Nyamuneka uzuza ibisabwa byose.",
        pinLengthError: "PIN igomba kuba imibare 4-8.",
        sideBrand: "Icyerekezo",
        navHome: "Ahabanza",
        navVehicle: "Imiterere y'Ikinyabiziga",
        navTravel: "Imiterere y'Ingendo",
        navSettings: "Igenamiterere",
        themeBtn: "Insumba",
        homeTitle: "Ikirenga cy'Ahabanza",
        qrTitle: "Gusoma QR Code",
        camOffline: "KAMERA NTIKORA",
        btnScan: "Tangira Gusoma",
        qrOr: "Cyangwa Shyiraho Idosiye",
        chooseImg: "Hitamo Ishusho ya QR",
        qrEngineText: "Kamere ya QR ntirakora. Tegereza guhuza n'ububiko.",
        vehTitle: "Inyandiko z'Ikinyabiziga",
        addVehBtn: "+ Ongeraho Imiterere",
        newLogTitle: "Inyandiko Nshya",
        lblLogTitle: "Umutwe w'Inyandiko",
        lblLogBody: "Iraporo y'Imiterere",
        btnCancelVeh: "Hagarika",
        btnPostVeh: "Bika Inyandiko",
        initLogTitle: "Isuzuma rya Mbere",
        initLogTag: "Byakozwe na Sisitemu",
        initLogDesc: "Mekanizime zose zimeze neza. GPS irakora, umuyoboro umeze neza, kandi batiri iri kuri 98%.",
        namedStations: "Sitasiyo Zigaragara",
        addStationBtn: "+ Ongeraho Sitasiyo",
        drawerHint: "Kanda kuri > kugira ngo ufungure cyangwa ufunge akadirishya.",
        modalTitle: "Shakisha & Hitamo Sitasiyo",
        modalDesc: "Kwandika mu ntoki ntibyakunda. Hitamo muri lisiti yo gushakisha uduce twa sitasiyo.",
        modalLbl: "Shakisha muri Rejisitiri",
        modalCancel: "Hagarika",
        modalPlot: "Shakisha & Shyira ku Karita",
        settTitle: "Igenamiterere",
        settHead: "Igenamiterere Rusange",
        settDesc: "Genzura imiterere y'akadirishya n'ibindi biranga sisitemu.",
        settLangHead: "Ihitamo ry'Ururimi",
        settLangDesc: "Hitamo ururimi wifuza gukoresha igihe icyo ari cyo cyose.",
        loginError: "Kwinjira byanze. Suzuma puwaki na kodi.",
        scheduleEmpty: "Nta nzende ziri mu gahunda.",
        qrValid: "Tike YEMEJWE",
        qrInvalid: "Tike Ntabwo YEMEJWE",
        signupSuccess: "Konti yashyizweho! Ubu ushobora kwinjira."
      },
      fr: {
        entryTitle: "Accès Chauffeur",
        entrySubtitle: "Connectez-vous ou inscrivez-vous pour accéder au tableau de bord",
        plateLabel: "Plaque d'immatriculation",
        codeLabel: "Code d'accès",
        accessBtn: "Accéder au Tableau de Bord",
        tabLogin: "Connexion",
        tabSignup: "Inscription",
        regCompanyLabel: "Compagnie de Bus",
        regCompanyPlaceholder: "-- Choisir Compagnie --",
        regFnameLabel: "Prénom",
        regLnameLabel: "Nom de Famille",
        regPhoneLabel: "Numéro de Téléphone",
        regLicenseLabel: "Numéro de Permis",
        regPinLabel: "Choisir un PIN",
        signupBtn: "Créer un Compte",
        switchToSignup: "Pas de compte ? Inscrivez-vous",
        switchToLogin: "Déjà un compte ? Connectez-vous",
        signupError: "Inscription échouée. Vérifiez vos informations.",
        emptyField: "Veuillez remplir tous les champs requis.",
        pinLengthError: "Le PIN doit faire 4-8 chiffres.",
        sideBrand: "Tableau de Bord",
        navHome: "Accueil",
        navVehicle: "État du Véhicule",
        navTravel: "État du Trajet",
        navSettings: "Paramètres",
        themeBtn: "Thème",
        homeTitle: "Tableau de Bord Principal",
        qrTitle: "Scanner de Code QR",
        camOffline: "FLUX CAMÉRA HORS LIGNE",
        btnScan: "Démarrer le Scanner",
        qrOr: "Ou Téléverser un Fichier",
        chooseImg: "Choisir une Image QR",
        qrEngineText: "Moteur QR actuellement inactif. Prêt pour l'intégration.",
        vehTitle: "Journaux d'État du Véhicule",
        addVehBtn: "+ Ajouter un État de Véhicule",
        newLogTitle: "Nouveau Journal d'État",
        lblLogTitle: "Titre du Journal",
        lblLogBody: "Rapport d'État",
        btnCancelVeh: "Annuler",
        btnPostVeh: "Publier le Journal",
        initLogTitle: "Diagnostic Initial Effectué",
        initLogTag: "Généré par le Système",
        initLogDesc: "Tous les systèmes clés sont étalonnés. Signal GPS actif, latence réseau normale, et batterie stable à 98%.",
        namedStations: "Stations Répertoriées",
        addStationBtn: "+ Ajouter une Station",
        drawerHint: "Cliquez sur le bouton > pour basculer ce panneau.",
        modalTitle: "Rechercher & Sélectionner une Station",
        modalDesc: "La saisie directe est verrouillée. Utilisez les paramètres ci-dessous pour interroger le registre.",
        modalLbl: "Interroger le Registre",
        modalCancel: "Annuler",
        modalPlot: "Rechercher & Placer",
        settTitle: "Paramètres",
        settHead: "Configurations Générales",
        settDesc: "Gérer l'affichage et les fonctionnalités de diagnostic.",
        settLangHead: "Préférences Linguistiques",
        settLangDesc: "Choisissez la langue de votre système à tout moment.",
        loginError: "Échec de connexion. Vérifiez plaque et code.",
        scheduleEmpty: "Aucun trajet programmé.",
        qrValid: "Billet VALIDE",
        qrInvalid: "Billet INVALIDE",
        signupSuccess: "Compte créé ! Vous pouvez maintenant vous connecter."
      },
      sw: {
        entryTitle: "Uingiaji wa Dereva",
        entrySubtitle: "Ingia au jisajili ili kufikia dashibodi ya dereva",
        plateLabel: "Nambari ya Bamba",
        codeLabel: "Kodi ya Kuingia",
        accessBtn: "Ingia Kwenye Dashibodi",
        tabLogin: "Ingia",
        tabSignup: "Jisajili",
        regCompanyLabel: "Kampuni ya Basa",
        regCompanyPlaceholder: "-- Chagua Kampuni --",
        regFnameLabel: "Jina la Kwanza",
        regLnameLabel: "Jina la Pili",
        regPhoneLabel: "Nambari ya Simu",
        regLicenseLabel: "Nambari ya Leseni",
        regPinLabel: "Chagua PIN",
        signupBtn: "Unda Akaunti",
        switchToSignup: "Huna akaunti? Jisajili",
        switchToLogin: "Una akaunti? Ingia",
        signupError: "Usajili umeshindwa. Angalia maelezo yako.",
        emptyField: "Tafadhali jaza sehemu zote zinazohitajika.",
        pinLengthError: "PIN lazima iwe na tarakimu 4-8.",
        sideBrand: "Dashibodi",
        navHome: "Mwanzo",
        navVehicle: "Hali ya Chombo",
        navTravel: "Hali ya Safari",
        navSettings: "Mipangilio",
        themeBtn: "Mada",
        homeTitle: "Dashibodi Kuu",
        qrTitle: "Kikusanya Code cha QR",
        camOffline: "NIDHAMU YA KAMERA IPO NJE YA MTANDAO",
        btnScan: "Anza Kukusanya",
        qrOr: "Au Pakia Faili",
        chooseImg: "Chagua Picha ya QR",
        qrEngineText: "Injinia ya QR haifanyi kazi kwa sasa. Tayari kwa kuunganishwa.",
        vehTitle: "Kumbukumbu za Hali ya Chombo",
        addVehBtn: "+ Ongeza Hali ya Chombo",
        newLogTitle: "Kumbukumbu Mpya",
        lblLogTitle: "Kichwa cha Kumbukumbu",
        lblLogBody: "Ripoti ya Hali",
        btnCancelVeh: "Ghairi",
        btnPostVeh: "Chapisha Kumbukumbu",
        initLogTitle: "Uchunguzi wa Kwanza",
        initLogTag: "Imetengenezwa na Mfumo",
        initLogDesc: "Mifumo yote imekamilika. GPS inafanya kazi, mtandao upo sawa, na betri ipo imara kwa 98%.",
        namedStations: "Kituo Kilichosajiliwa",
        addStationBtn: "+ Ongeza Kituo",
        drawerHint: "Bonyeza kitufe cha > ili kufungua au kufunga droo hii.",
        modalTitle: "Tafuta & Chagua Kituo",
        modalDesc: "Kuandika moja kwa moja kumeruhusiwa. Tumia vigezo hapa chini kutafuta usajili wa data.",
        modalLbl: "Tafuta Usajili wa Vituo",
        modalCancel: "Ghairi",
        modalPlot: "Tafuta & Weka Kwenye Ramani",
        settTitle: "Mipangilio",
        settHead: "Mipangilio Mikuu ya Programu",
        settDesc: "Simamia muonekano na sifa za uchunguzi.",
        settLangHead: "Chaguo la Lugha",
        settLangDesc: "Chagua lugha unayopendelea wakati wowote wa matumizi.",
        loginError: "Kuingia kumeshindwa. Angalia nambari na kodi.",
        scheduleEmpty: "Hakuna safari zilizopangwa.",
        qrValid: "Tiketi HALALI",
        qrInvalid: "Tiketi SI HALALI",
        signupSuccess: "Akaunti imeundwa! Sasa unaweza kuingia."
      }
    };

    let currentLang = 'en';
    let altLangToggle = 'fr'; // Toggles between French and Kiswahili on third entry button
    let driverSchedule = [];  // from API
    let apiLocations = [];     // from API for station selector
    let gpsInterval = null;    // GPS ping interval

    function switchLang(langCode) {
      currentLang = langCode;
      const dict = translations[langCode];

      // Update Text Elements across entire app
      document.getElementById('lang-entry-title').textContent = dict.entryTitle;
      document.getElementById('lang-entry-subtitle').textContent = dict.entrySubtitle;
      document.getElementById('lang-label-plate').textContent = dict.plateLabel;
      document.getElementById('lang-label-code').textContent = dict.codeLabel;
      document.getElementById('lang-btn-access').textContent = dict.accessBtn;

      // Signup form elements
      document.getElementById('entry-tab-login').textContent = dict.tabLogin;
      document.getElementById('entry-tab-signup').textContent = dict.tabSignup;
      document.getElementById('lang-label-company').textContent = dict.regCompanyLabel;
      document.getElementById('lang-label-fname').textContent = dict.regFnameLabel;
      document.getElementById('lang-label-lname').textContent = dict.regLnameLabel;
      document.getElementById('lang-label-phone').textContent = dict.regPhoneLabel;
      document.getElementById('lang-label-license').textContent = dict.regLicenseLabel;
      document.getElementById('lang-label-pin').textContent = dict.regPinLabel;
      document.getElementById('lang-btn-signup').textContent = dict.signupBtn;
      document.getElementById('entry-switch-to-signup').textContent = dict.switchToSignup;
      document.getElementById('entry-switch-to-login').textContent = dict.switchToLogin;

      // Update company dropdown placeholder if no selection
      const companySelect = document.getElementById('entryCompany');
      if (companySelect && companySelect.options[0]) {
        companySelect.options[0].textContent = dict.regCompanyPlaceholder;
      }

      document.getElementById('lang-side-brand').textContent = dict.sideBrand;
      document.getElementById('lang-nav-home').textContent = dict.navHome;
      document.getElementById('lang-nav-vehicle').textContent = dict.navVehicle;
      document.getElementById('lang-nav-travel').textContent = dict.navTravel;
      document.getElementById('lang-nav-settings').textContent = dict.navSettings;
      document.getElementById('lang-theme-btn').textContent = dict.themeBtn;

      document.getElementById('lang-home-title').textContent = dict.homeTitle;
      document.getElementById('lang-qr-title').textContent = dict.qrTitle;
      document.getElementById('lang-cam-offline').textContent = dict.camOffline;
      document.getElementById('lang-btn-scan').textContent = dict.btnScan;
      document.getElementById('lang-qr-or').textContent = dict.qrOr;
      document.getElementById('lang-choose-img').textContent = dict.chooseImg;
      document.getElementById('lang-qr-engine-text').textContent = dict.qrEngineText;

      document.getElementById('lang-veh-title').textContent = dict.vehTitle;
      document.getElementById('lang-add-veh-btn').textContent = dict.addVehBtn;
      document.getElementById('lang-new-log-title').textContent = dict.newLogTitle;
      document.getElementById('lang-lbl-log-title').textContent = dict.lblLogTitle;
      document.getElementById('lang-lbl-log-body').textContent = dict.lblLogBody;
      document.getElementById('lang-btn-cancel-veh').textContent = dict.btnCancelVeh;
      document.getElementById('lang-btn-post-veh').textContent = dict.btnPostVeh;
      document.getElementById('lang-init-log-title').textContent = dict.initLogTitle;
      document.getElementById('lang-init-log-tag').textContent = dict.initLogTag;
      document.getElementById('lang-init-log-desc').textContent = dict.initLogDesc;

      document.getElementById('lang-named-stations').textContent = dict.namedStations;
      document.getElementById('lang-add-station-btn').textContent = dict.addStationBtn;
      document.getElementById('lang-drawer-hint').textContent = dict.drawerHint;
      document.getElementById('lang-modal-title').textContent = dict.modalTitle;
      document.getElementById('lang-modal-desc').textContent = dict.modalDesc;
      document.getElementById('lang-modal-lbl').textContent = dict.modalLbl;
      document.getElementById('lang-modal-cancel').textContent = dict.modalCancel;
      document.getElementById('lang-modal-plot').textContent = dict.modalPlot;

      document.getElementById('lang-sett-title').textContent = dict.settTitle;
      document.getElementById('lang-sett-head').textContent = dict.settHead;
      document.getElementById('lang-sett-desc').textContent = dict.settDesc;
      document.getElementById('lang-sett-lang-head').textContent = dict.settLangHead;
      document.getElementById('lang-sett-lang-desc').textContent = dict.settLangDesc;

      // Update button visual feedback for entry modal
      document.getElementById('lang-btn-en').classList.remove('btn-accent');
      document.getElementById('lang-btn-rw').classList.remove('btn-accent');
      document.getElementById('lang-btn-alt').classList.remove('btn-accent');

      if(langCode === 'en') document.getElementById('lang-btn-en').classList.add('btn-accent');
      else if(langCode === 'rw') document.getElementById('lang-btn-rw').classList.add('btn-accent');
      else document.getElementById('lang-btn-alt').classList.add('btn-accent');

      // Update button active state in Settings Language Card
      ['en', 'rw', 'fr', 'sw'].forEach(code => {
        const btn = document.getElementById(`sett-lang-${code}`);
        if (code === langCode) {
          btn.classList.add('border-accent', 'bg-white/10');
          btn.classList.remove('border-custom');
        } else {
          btn.classList.remove('border-accent', 'bg-white/10');
          btn.classList.add('border-custom');
        }
      });
    }

    function toggleLangGroup() {
      if (altLangToggle === 'fr') {
        switchLang('fr');
        document.getElementById('lang-btn-alt').textContent = "FR (Français)";
        altLangToggle = 'sw';
      } else {
        switchLang('sw');
        document.getElementById('lang-btn-alt').textContent = "SW (Kiswahili)";
        altLangToggle = 'fr';
      }
    }

    // --- Entry Form Handling (API Login) ---
    // --- Entry Tab Switching (Login / Signup) ---
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

    // --- Load Companies for Signup Dropdown ---
    async function loadCompanies() {
      try {
        const companies = await apiFetch('/api/companies/list');
        const select = document.getElementById('entryCompany');
        // Keep the placeholder option
        select.innerHTML = '';
        const dict = translations[currentLang];
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = dict.regCompanyPlaceholder;
        select.appendChild(placeholder);
        companies.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          select.appendChild(opt);
        });
      } catch (e) {
        console.error('Failed to load companies:', e);
      }
    }

    // --- Driver Signup Handler ---
    async function handleDriverSignup(event) {
      event.preventDefault();
      const dict = translations[currentLang];

      const companyId = document.getElementById('entryCompany').value;
      const firstName = document.getElementById('entryFname').value.trim();
      const lastName = document.getElementById('entryLname').value.trim();
      const phone = document.getElementById('entryPhone').value.trim();
      const licenseNumber = document.getElementById('entryLicense').value.trim();
      const pin = document.getElementById('entryPin').value.trim();

      if (!companyId || !firstName || !lastName || !phone || !licenseNumber || !pin) {
        alert(dict.emptyField);
        return;
      }

      if (pin.length < 4 || pin.length > 8) {
        alert(dict.pinLengthError);
        return;
      }

      try {
        await apiFetch('/api/auth/register/driver', {
          method: 'POST',
          body: JSON.stringify({
            company_id: parseInt(companyId),
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            license_number: licenseNumber,
            pin: pin
          })
        });

        alert(dict.signupSuccess);
        // Switch to login tab
        switchEntryTab('login');
        // Pre-fill phone so driver can easily login with their plate
        document.getElementById('entryPin').value = '';
      } catch (err) {
        alert(dict.signupError + ' (' + err.message + ')');
      }
    }

    // --- Driver Login Handler ---
    async function handleDriverLogin(event) {
      event.preventDefault();
      const plate = document.getElementById('entryPlate').value.trim();
      const code = document.getElementById('entryCode').value.trim();
      const dict = translations[currentLang];

      if (!plate || !code) {
        alert('Please fill out both the plate number and entry code.');
        return;
      }

      try {
        const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ role: 'driver', plate_number: plate, entry_code: code })
        });

        sessionStorage.setItem('kglc_token', data.token);
        sessionStorage.setItem('kglc_driver_id', data.driver.driver_id);
        sessionStorage.setItem('kglc_bus_id', data.bus ? data.bus.bus_id : '');
        sessionStorage.setItem('kglc_company_id', data.driver.company_id);

        // Update sidebar brand with company/driver info
        document.getElementById('lang-side-brand').textContent = data.driver.full_name;

        document.getElementById('entry-modal').style.display = 'none';

        // Load driver data
        loadDriverSchedule();
        loadApiLocations();
        startGpsPing();
        loadVehicleLogs();
      } catch (err) {
        alert(dict.loginError + ' (' + err.message + ')');
      }
    }

    // --- Load Driver Schedule from API ---
    async function loadDriverSchedule() {
      const driverId = getAuthDriverId();
      if (!driverId) return;
      try {
        driverSchedule = await apiFetch(`/api/drivers/${driverId}/schedule`);
        renderScheduleOnHome();
      } catch (e) {
        console.error('Failed to load schedule:', e);
      }
    }

    function renderScheduleOnHome() {
      const dict = translations[currentLang];
      const homeTab = document.getElementById('tab-home');
      // Find or create schedule display area within the home tab
      let scheduleDiv = document.getElementById('driver-schedule-display');
      if (!scheduleDiv) {
        scheduleDiv = document.createElement('div');
        scheduleDiv.id = 'driver-schedule-display';
        scheduleDiv.className = 'mt-4 space-y-3';
        // Insert after the home title
        const title = document.getElementById('lang-home-title');
        title.parentNode.insertBefore(scheduleDiv, title.nextSibling);
      }

      if (driverSchedule.length === 0) {
        scheduleDiv.innerHTML = `<p class="text-muted text-sm">${dict.scheduleEmpty}</p>`;
        return;
      }

      scheduleDiv.innerHTML = driverSchedule.map(trip => `
        <div class="card p-4 rounded-xl border border-custom">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-accent">${trip.origin} → ${trip.destination}</h3>
            <span class="text-xs badge" style="background:${trip.status === 'scheduled' ? '#3b82f6' : (trip.status === 'in_transit' ? '#10b981' : '#64748b')}; color:#fff;">${trip.status}</span>
          </div>
          <div class="text-sm text-muted mt-2">
            ${trip.departure_date} @ ${trip.departure_time} → ${trip.arrival_time}<br>
            ${trip.plate_number} (${trip.model}) · ${trip.company_name}<br>
            ${trip.base_price_rwf} RWF · ${trip.distance_km} km · ~${trip.estimated_hours}h
          </div>
        </div>
      `).join('');
    }

    // --- Load Locations for Station Selector from API ---
    async function loadApiLocations() {
      try {
        apiLocations = await apiFetch('/api/locations');
        populateStationSelector();
      } catch (e) {
        console.error('Failed to load locations:', e);
      }
    }

    function populateStationSelector() {
      const selector = document.getElementById('stationSelector');
      selector.innerHTML = '<option value="">-- Select Station --</option>';
      apiLocations.filter(l => l.is_active).forEach(loc => {
        const opt = document.createElement('option');
        opt.value = `${loc.name}|[${loc.latitude},${loc.longitude}]`;
        opt.textContent = loc.name;
        selector.appendChild(opt);
      });
    }

    // --- QR Ticket Validation (API) ---
    async function validateQrTicket(bookingId) {
      const driverId = getAuthDriverId();
      const dict = translations[currentLang];
      if (!driverId) {
        alert('Not logged in.');
        return;
      }
      try {
        const result = await apiFetch('/api/tickets/validate', {
          method: 'POST',
          body: JSON.stringify({ booking_id: parseInt(bookingId), driver_id: parseInt(driverId) })
        });

        if (result.valid) {
          alert(`✅ ${dict.qrValid}\n` +
            `Booking: #${result.booking_id}\n` +
            `Passenger: ${result.passenger_name || 'N/A'}\n` +
            `Seat: #${result.seat_number}\n` +
            `Route: ${result.origin} → ${result.destination}\n` +
            `Status: ${result.booking_status}`);
        } else {
          alert(`❌ ${dict.qrInvalid}\nReason: ${result.reason || 'Unknown'}`);
        }
      } catch (err) {
        alert(`${dict.qrInvalid} (${err.message})`);
      }
    }

    // --- GPS Ping to API ---
    function startGpsPing() {
      if (gpsInterval) clearInterval(gpsInterval);
      gpsInterval = setInterval(sendGpsPing, 30000); // every 30 seconds
      sendGpsPing(); // initial ping
    }

    async function sendGpsPing() {
      const busId = getAuthBusId();
      const driverId = getAuthDriverId();
      if (!busId || !driverId) return;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await apiFetch('/api/vehicles/location', {
                method: 'POST',
                body: JSON.stringify({
                  bus_id: parseInt(busId),
                  driver_id: parseInt(driverId),
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  speed: pos.coords.speed || 0,
                  heading: 0
                })
              });
            } catch (e) {
              console.warn('GPS ping failed:', e);
            }
          },
          (err) => console.warn('GPS unavailable for ping:', err),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }

    // --- Vehicle Logs (API-backed) ---
    let vehicleLogs = [];

    async function loadVehicleLogs() {
      const driverId = getAuthDriverId();
      if (!driverId) return;
      try {
        // Company dashboard includes vehicle_logs — for driver we POST new logs
        // Load existing logs from the feed display
        const feed = document.getElementById('vehicleFeed');
        // Keep initial diagnostic log, then add any from API if available
      } catch (e) {
        console.warn('Could not load vehicle logs:', e);
      }
    }

    // --- Intro Fade Logic ---
    window.addEventListener('DOMContentLoaded', () => {
      // Initialize entry tab indicator position
      const indicator = document.getElementById('entry-tab-indicator');
      if (indicator) indicator.style.transform = 'translateX(0)';

      // Load companies for signup dropdown
      loadCompanies();

      setTimeout(() => {
        const introStage = document.getElementById('intro-stage');
        if(introStage) {
            introStage.style.transition = 'opacity 0.6s ease';
            introStage.style.opacity = '0';
            
            setTimeout(() => {
                introStage.style.display = 'none';
            }, 600);
        }
      }, 4500);
    });

    let map;
    let activeMarkers = [];

    // --- Dynamic Theme Switching (Sequential Cycle) ---
    const themes = ['theme-black-red', 'theme-white-blue', 'theme-green-gold'];
    let currentThemeIndex = 0;

    function cycleTheme() {
      currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      const targetTheme = themes[currentThemeIndex];
      document.body.className = targetTheme + ' font-sans h-screen flex overflow-hidden';
    }

    // --- Tab Switcher Logic ---
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.className = "nav-btn w-full text-left px-4 py-3 rounded-lg font-medium flex items-center space-x-3 transition-all text-muted hover:bg-opacity-10 hover:bg-white";
      });

      document.getElementById(`tab-${tabId}`).classList.remove('hidden');
      document.getElementById(`btn-${tabId}`).className = "nav-btn w-full text-left px-4 py-3 rounded-lg font-medium flex items-center space-x-3 transition-all btn-accent";

      if (tabId === 'travel') {
        setTimeout(() => {
          initMap();
        }, 50);
      }
    }

    // --- Leaflet Map Initialization ---
    function initMap() {
      if (!map) {
        map = L.map('map').setView([-1.9403, 29.8739], 9); 

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Plot company route locations from API
        if (apiLocations.length > 0) {
          apiLocations.filter(l => l.is_active).forEach(loc => {
            addMarkerToMap(loc.latitude, loc.longitude, loc.name);
          });
        }
      } else {
        map.invalidateSize();
      }
    }

    // --- Helper to Plot Map Point ---
    function addMarkerToMap(lat, lng, name) {
      const marker = L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>${name}</b><br>Live station active.`)
        .openPopup();
      activeMarkers.push({ name, marker });
    }

    // --- Focus Station View on Map ---
    function focusOnStation(lat, lng, name) {
      if (map) {
        map.setView([lat, lng], 13);
        const match = activeMarkers.find(m => m.name === name);
        if (match) match.marker.openPopup();
      }
    }

    // --- Travel Drawer Panel Toggle ---
    let drawerOpen = false;
    function toggleDrawer() {
      const drawer = document.getElementById('mapDrawer');
      const arrow = document.getElementById('drawerArrow');
      drawerOpen = !drawerOpen;

      if (drawerOpen) {
        drawer.classList.remove('-translate-x-full');
        arrow.textContent = '◀';
      } else {
        drawer.classList.add('-translate-x-full');
        arrow.textContent = '>';
      }
    }

    // --- Station Querying Modal System ---
    function openStationModal() {
      document.getElementById('stationModal').classList.remove('hidden');
    }

    function closeStationModal() {
      document.getElementById('stationModal').classList.add('hidden');
      document.getElementById('stationSelector').selectedIndex = 0;
    }

    function addSelectedStation() {
      const selector = document.getElementById('stationSelector');
      if (!selector.value) {
        alert("Please select a station query from the registry.");
        return;
      }

      const [name, rawCoords] = selector.value.split('|');
      const coords = JSON.parse(rawCoords);
      const [lat, lng] = coords;

      const existing = activeMarkers.find(m => m.name === name);
      if (existing) {
        alert("Station already plotted on live transit map.");
        closeStationModal();
        focusOnStation(lat, lng, name);
        return;
      }

      const list = document.getElementById('stationsList');
      const item = document.createElement('div');
      item.className = "p-3 bg-white/5 rounded-lg border border-custom text-xs cursor-pointer hover:bg-white/10 transition-all";
      item.onclick = function() { focusOnStation(lat, lng, name); };
      item.innerHTML = `
        <div class="font-bold text-accent">${name}</div>
        <div class="text-[10px] text-muted mt-1">Coords: ${lat}, ${lng}</div>
      `;
      list.appendChild(item);

      addMarkerToMap(lat, lng, name);
      focusOnStation(lat, lng, name);
      closeStationModal();
    }

    // --- Vehicle Status Blog logic (API-backed) ---
    function toggleVehicleForm() {
      const form = document.getElementById('vehicleForm');
      form.classList.toggle('hidden');
    }

    async function saveVehicleStatus() {
      const titleInput = document.getElementById('logTitle');
      const bodyInput = document.getElementById('logBody');
      const feed = document.getElementById('vehicleFeed');
      const busId = getAuthBusId();
      const driverId = getAuthDriverId();

      if (!titleInput.value.trim() || !bodyInput.value.trim()) {
        alert("Please write something in both fields!");
        return;
      }

      // Post log to API
      if (busId && driverId) {
        try {
          await apiFetch('/api/vehicles/log', {
            method: 'POST',
            body: JSON.stringify({
              bus_id: parseInt(busId),
              driver_id: parseInt(driverId),
              log_type: 'status',
              title: titleInput.value.trim(),
              description: bodyInput.value.trim(),
              severity: 'info'
            })
          });
        } catch (e) {
          console.warn('Failed to post vehicle log:', e);
        }
      }

      // Also add to visual feed locally
      const newCard = document.createElement('div');
      newCard.className = "card p-5 rounded-xl shadow-sm transition-all duration-300 transform scale-95 opacity-0";
      const today = new Date().toLocaleString();

      newCard.innerHTML = `
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-bold">${titleInput.value}</h3>
          <span class="text-xs text-muted">${today}</span>
        </div>
        <p class="text-sm whitespace-pre-line">${bodyInput.value}</p>
      `;

      feed.insertBefore(newCard, feed.firstChild);

      setTimeout(() => {
        newCard.classList.remove('scale-95', 'opacity-0');
      }, 50);

      titleInput.value = '';
      bodyInput.value = '';
      toggleVehicleForm();
    }