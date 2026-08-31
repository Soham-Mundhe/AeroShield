/* ============================================================
   AeroShield — script.js
   Physics-Informed Pollution Early Warning System
   All interactive functionality — NO external libraries
   ============================================================ */

'use strict';

// ============================================================
// DEMO DATA STORE — All values are prototype/simulation data
// ============================================================

const SCENARIOS = {
  severe: {
    label: 'Severe Episode',
    aqi: 287,
    aqi24h: 420,
    episodeRisk: 87,
    pti: 86,
    pm25: 192,
    pm10: 310,
    pbl: 520,
    wind: 1.3,
    windDir: 'NW',
    temp: 18,
    humidity: 78,
    pressure: 1011,
    stability: 'Strong',
    inversion: 'Detected',
    aqiStatus: 'Poor',
    forecastStatus: 'Very High',
    riskStatus: 'High',
    ptiStatus: 'High Trapping',
    warningLevel: 'SEVERE',
    warningMsg: 'Atmospheric conditions are becoming favorable for pollution accumulation. Low PBL height and weak winds are reducing ventilation near the surface.',
    narrative: 'The risk is high mainly because the boundary layer is becoming shallower and wind speed is low. These conditions reduce atmospheric ventilation and can allow PM2.5 to accumulate rapidly.',
    shap: [
      { feature: 'Low PBL Height', pct: 43 },
      { feature: 'Weak Wind Speed', pct: 28 },
      { feature: 'Rising PM2.5 Trend', pct: 18 },
      { feature: 'Strong Inversion', pct: 11 }
    ],
    accent: '#ef4444'
  },
  normal: {
    label: 'Normal Day',
    aqi: 120,
    aqi24h: 130,
    episodeRisk: 12,
    pti: 28,
    pm25: 68,
    pm10: 110,
    pbl: 1400,
    wind: 5.2,
    windDir: 'SW',
    temp: 24,
    humidity: 52,
    pressure: 1015,
    stability: 'Neutral',
    inversion: 'None',
    aqiStatus: 'Moderate',
    forecastStatus: 'Moderate',
    riskStatus: 'Low',
    ptiStatus: 'Low Trapping',
    warningLevel: 'LOW',
    warningMsg: 'Atmospheric conditions are favorable for pollution dispersion. Adequate PBL height and moderate winds are maintaining ventilation near the surface.',
    narrative: 'Current conditions suggest good atmospheric ventilation. The boundary layer is at a healthy height and wind speeds are sufficient to disperse pollutants.',
    shap: [
      { feature: 'Low PBL Height', pct: 15 },
      { feature: 'Weak Wind Speed', pct: 10 },
      { feature: 'PM2.5 Trend', pct: 48 },
      { feature: 'Inversion Strength', pct: 27 }
    ],
    accent: '#22c55e'
  },
  building: {
    label: 'Pollution Building',
    aqi: 220,
    aqi24h: 310,
    episodeRisk: 63,
    pti: 63,
    pm25: 142,
    pm10: 215,
    pbl: 820,
    wind: 2.1,
    windDir: 'NW',
    temp: 20,
    humidity: 68,
    pressure: 1012,
    stability: 'Moderate',
    inversion: 'Developing',
    aqiStatus: 'Poor',
    forecastStatus: 'High',
    riskStatus: 'Moderate',
    ptiStatus: 'Moderate Trapping',
    warningLevel: 'MODERATE',
    warningMsg: 'Conditions are beginning to become unfavorable. PBL height is decreasing and wind speeds are weakening, which may allow pollution to accumulate.',
    narrative: 'A moderately unfavorable atmospheric setup is developing. Monitor closely — if PBL continues to drop and winds remain weak, a severe episode may follow.',
    shap: [
      { feature: 'Low PBL Height', pct: 35 },
      { feature: 'Weak Wind Speed', pct: 25 },
      { feature: 'Rising PM2.5 Trend', pct: 27 },
      { feature: 'Inversion Strength', pct: 13 }
    ],
    accent: '#fb923c'
  },
  recovery: {
    label: 'Recovery',
    aqi: 240,
    aqi24h: 160,
    episodeRisk: 22,
    pti: 42,
    pm25: 158,
    pm10: 240,
    pbl: 980,
    wind: 3.4,
    windDir: 'W',
    temp: 22,
    humidity: 60,
    pressure: 1013,
    stability: 'Light',
    inversion: 'Weakening',
    aqiStatus: 'Poor',
    forecastStatus: 'Moderate',
    riskStatus: 'Falling',
    ptiStatus: 'Decreasing',
    warningLevel: 'RECOVERING',
    warningMsg: 'Conditions are improving. Wind speeds are increasing and boundary layer height is rising, which should help disperse accumulated pollution.',
    narrative: 'The atmosphere is recovering. Increasing winds and a rising boundary layer are beginning to dilute accumulated pollutants. Levels should improve over the next 12–18 hours.',
    shap: [
      { feature: 'Low PBL Height', pct: 22 },
      { feature: 'Weak Wind Speed', pct: 18 },
      { feature: 'Residual PM2.5', pct: 42 },
      { feature: 'Inversion Weakening', pct: 18 }
    ],
    accent: '#22d3c0'
  }
};

// Forecast data generator (returns {times, historical, forecast} arrays)
function generateForecastData(scenarioKey, hours) {
  const scen = SCENARIOS[scenarioKey];
  const now = new Date();
  const data = { times: [], obs: [], forecast: [], threshold: 200 };

  const baseAqi = scen.aqi;
  const peakAqi = scen.aqi24h;
  const pastHours = Math.min(12, hours);
  const futureHours = hours - pastHours;

  // Past data (observed)
  for (let i = pastHours; i >= 1; i--) {
    const t = new Date(now.getTime() - i * 3600000);
    data.times.push(t);
    const jitter = (Math.random() - 0.5) * 20;
    let val;
    if (scenarioKey === 'severe') {
      val = baseAqi - (i * 8) + jitter;
    } else if (scenarioKey === 'building') {
      val = baseAqi - (i * 5) + jitter;
    } else if (scenarioKey === 'recovery') {
      val = baseAqi + (i * 6) + jitter;
    } else {
      val = baseAqi + jitter * 0.5;
    }
    data.obs.push(Math.max(50, Math.round(val)));
    data.forecast.push(null);
  }

  // Current
  data.times.push(new Date(now));
  data.obs.push(baseAqi);
  data.forecast.push(baseAqi);

  // Future data (forecast)
  for (let i = 1; i <= futureHours; i++) {
    const t = new Date(now.getTime() + i * 3600000);
    data.times.push(t);
    const jitter = (Math.random() - 0.5) * 15;
    let val;
    if (scenarioKey === 'severe') {
      const progress = i / futureHours;
      val = baseAqi + (peakAqi - baseAqi) * Math.sin(progress * Math.PI * 0.8) + jitter;
    } else if (scenarioKey === 'building') {
      val = baseAqi + (i * 4) + jitter;
    } else if (scenarioKey === 'recovery') {
      val = baseAqi - (i * 5) + jitter;
    } else {
      val = baseAqi + (Math.random() - 0.5) * 15;
    }
    data.obs.push(null);
    data.forecast.push(Math.max(40, Math.round(val)));
  }

  // Convert AQI approx to PM2.5
  data.pm25 = data.obs.map(v => v ? Math.round(v * 0.67) : null)
    .concat(data.forecast.slice(data.obs.filter(Boolean).length).map(v => v ? Math.round(v * 0.67) : null));

  return data;
}

// Delhi NCR map stations with geographic coordinates
const MAP_STATIONS = [
  { id: 'delhi',       name: 'Delhi (ITO Central)',      lat: 28.6289, lng: 77.2405, baseAqi: 287, aqi24h: 420, pti: 86, risk: 87 },
  { id: 'noida',       name: 'Noida (Sector 62)',        lat: 28.6258, lng: 77.3685, baseAqi: 265, aqi24h: 390, pti: 80, risk: 79 },
  { id: 'gurugram',    name: 'Gurugram (Vikas Sadan)',   lat: 28.4595, lng: 77.0266, baseAqi: 198, aqi24h: 310, pti: 68, risk: 65 },
  { id: 'ghaziabad',   name: 'Ghaziabad (Vasundhara)',   lat: 28.6692, lng: 77.4538, baseAqi: 312, aqi24h: 450, pti: 91, risk: 92 },
  { id: 'faridabad',   name: 'Faridabad (Sector 16A)',   lat: 28.4089, lng: 77.3178, baseAqi: 176, aqi24h: 265, pti: 59, risk: 55 },
  { id: 'anandvihar',  name: 'Anand Vihar (East Delhi)', lat: 28.6469, lng: 77.3160, baseAqi: 328, aqi24h: 465, pti: 94, risk: 95 },
  { id: 'punjabibagh', name: 'Punjabi Bagh (West Delhi)',lat: 28.6740, lng: 77.1310, baseAqi: 275, aqi24h: 410, pti: 85, risk: 84 },
  { id: 'rohini',      name: 'Rohini (North Delhi)',     lat: 28.7325, lng: 77.1190, baseAqi: 295, aqi24h: 425, pti: 89, risk: 88 },
  { id: 'dwarka',      name: 'Dwarka (South-West Delhi)',lat: 28.5921, lng: 77.0460, baseAqi: 215, aqi24h: 330, pti: 72, risk: 70 },
  { id: 'okhla',       name: 'Okhla (South Delhi)',      lat: 28.5300, lng: 77.2710, baseAqi: 260, aqi24h: 385, pti: 78, risk: 76 }
];

// Leaflet map instance holders
let leafletMap = null;
let tileLayer = null;
let heatLayer = null;
let markersLayerGroup = null;
let showHeatmap = true;
let showStations = true;

// ============================================================
// STATE
// ============================================================

let currentScenario = 'severe';
let currentChartHours = 24;
let selectedStation = MAP_STATIONS[0];
let canvasData = null;
let isLightTheme = false;
let flowAnimated = false;

// ============================================================
// NAVIGATION
// ============================================================

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.section;
      navigateTo(target);
      // Close mobile sidebar
      document.querySelector('.sidebar').classList.remove('mobile-open');
      document.querySelector('.mobile-nav-overlay').classList.remove('open');
    });
  });

  // Hamburger
  document.getElementById('hamburgerBtn').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('mobile-open');
    document.querySelector('.mobile-nav-overlay').classList.toggle('open');
  });

  // Overlay close
  document.querySelector('.mobile-nav-overlay').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('mobile-open');
    document.querySelector('.mobile-nav-overlay').classList.remove('open');
  });
}

function navigateTo(sectionId) {
  // Hide all sections
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  // Show target
  const target = document.getElementById('section-' + sectionId);
  if (target) target.classList.add('active');

  // Update nav active state
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionId);
  });

  // Update top bar title
  const titles = {
    overview: 'Overview',
    forecast: 'Forecast & Chart',
    episode: 'Episode Risk',
    atmospheric: 'Atmospheric Conditions',
    explainability: 'Explainability',
    about: 'About AeroShield'
  };
  document.getElementById('pageTitle').textContent = titles[sectionId] || 'AeroShield';

  // Section-specific inits
  if (sectionId === 'overview') {
    setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 60);
  }
  if (sectionId === 'forecast') {
    setTimeout(() => drawForecastChart(), 50);
  }
  if (sectionId === 'episode') {
    setTimeout(() => drawEpisodeHistoryChart(), 50);
  }
  if (sectionId === 'about') {
    setTimeout(() => animateProcessFlow(), 200);
  }
  if (sectionId === 'atmospheric') {
    setTimeout(() => drawPBLViz(), 50);
  }

  // Scroll to top
  document.querySelector('.main-content').scrollTo(0, 0);
}

// ============================================================
// THEME TOGGLE
// ============================================================

function initTheme() {
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    isLightTheme = !isLightTheme;
    document.body.classList.toggle('light-theme', isLightTheme);
    const btn = document.getElementById('themeToggleBtn');
    btn.innerHTML = isLightTheme
      ? '<span>🌙</span> Dark Mode'
      : '<span>☀️</span> Light Mode';
    // Redraw charts & map with new theme
    setTimeout(() => {
      drawForecastChart();
      drawEpisodeHistoryChart();
      updateDelhiMap();
    }, 100);
  });
}

// ============================================================
// SCENARIO SIMULATOR
// ============================================================

function initSimulator() {
  document.querySelectorAll('.simulator-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const scen = btn.dataset.scenario;
      applyScenario(scen);
      document.querySelectorAll('.simulator-btn').forEach(b => b.classList.remove('sim-active'));
      btn.classList.add('sim-active');
    });
  });
}

function applyScenario(scenKey) {
  currentScenario = scenKey;
  const s = SCENARIOS[scenKey];

  // Animate numbers
  animateCounter('kpiAqi', s.aqi);
  animateCounter('kpiAqi24h', s.aqi24h);
  animateCounter('kpiRisk', s.episodeRisk);
  animateCounter('kpiPti', s.pti);
  animateCounter('kpiPm25', s.pm25);

  // Status labels
  setEl('kpiAqiStatus', s.aqiStatus);
  setEl('kpiForecastStatus', s.forecastStatus);
  setEl('kpiRiskStatus', s.riskStatus);
  setEl('kpiPtiStatus', s.ptiStatus);

  // Status class helpers
  updateStatusClass('kpiAqiStatus', s.aqiStatus);
  updateStatusClass('kpiForecastStatus', s.forecastStatus);
  updateStatusClass('kpiRiskStatus', s.riskStatus);
  updateStatusClass('kpiPtiStatus', s.ptiStatus);

  // Warning card
  setEl('warningExplanation', s.warningMsg);
  updateWarningCard(s);

  // PTI gauge
  drawPTIGauge(s.pti);
  animateCounter('ptiNumber', s.pti);
  setEl('ptiStatusLabel', s.ptiStatus);

  // Atmo cards
  setEl('atmoValPbl', s.pbl);
  setEl('atmoValWind', s.wind);
  setEl('atmoValWindDir', s.windDir);
  setEl('atmoValTemp', s.temp);
  setEl('atmoValHumidity', s.humidity);
  setEl('atmoValPressure', s.pressure);
  setEl('atmoValStability', s.stability);
  setEl('atmoValInversion', s.inversion);

  // Episode risk
  animateCounter('probNumber', s.episodeRisk);
  drawProbabilityRing(s.episodeRisk);

  // SHAP bars
  updateShapBars(s.shap);
  setEl('explainNarrative', s.narrative);

  // Early warning
  updateEarlyWarning(s);

  // AQI Gauge
  drawAqiGauge(s.aqi);

  // Chart
  setTimeout(() => drawForecastChart(), 50);

  // PTI factors
  updatePTIFactors(s);

  // Update Leaflet map & heatmap
  updateDelhiMap();
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateStatusClass(id, status) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'kpi-status';
  const map = {
    'Good': 'status-good', 'Moderate': 'status-moderate', 'Poor': 'status-poor',
    'High': 'status-high', 'Very High': 'status-severe',
    'High Trapping': 'status-trapping', 'Moderate Trapping': 'status-poor',
    'Low Trapping': 'status-good', 'Decreasing': 'status-falling',
    'Low': 'status-good', 'Falling': 'status-falling'
  };
  el.classList.add(map[status] || 'status-moderate');
}

function updateWarningCard(s) {
  const card = document.getElementById('warningCard');
  const title = document.getElementById('warningTitle');
  const msgs = {
    severe:   { t: '⚠ SEVERE POLLUTION EPISODE LIKELY', cls: 'status-severe' },
    building: { t: '⚠ POLLUTION EPISODE BUILDING', cls: 'status-poor' },
    normal:   { t: '✓ CONDITIONS FAVORABLE FOR DISPERSION', cls: 'status-good' },
    recovery: { t: '↑ CONDITIONS RECOVERING', cls: 'status-falling' }
  };
  const m = msgs[currentScenario] || msgs.severe;
  if (title) title.textContent = m.t;

  // Update warning stats
  const episodePct = document.getElementById('wStatPct');
  if (episodePct) animateCounter('wStatPct', s.episodeRisk);
}

function updateEarlyWarning(s) {
  const levels = {
    severe:   { badge: '🔴 HIGH RISK', color: 'var(--red-400)' },
    building: { badge: '🟠 MODERATE RISK', color: 'var(--orange-400)' },
    normal:   { badge: '🟢 LOW RISK', color: 'var(--green-400)' },
    recovery: { badge: '🔵 RECOVERING', color: 'var(--teal-400)' }
  };
  const l = levels[currentScenario];
  const ewBadge = document.getElementById('ewBadge');
  if (ewBadge) ewBadge.innerHTML = `<span>${l.badge}</span>`;
  const ewRisk = document.getElementById('ewRiskPct');
  if (ewRisk) animateCounter('ewRiskPct', s.episodeRisk);
}

// ============================================================
// NUMBER COUNTER ANIMATION
// ============================================================

function animateCounter(id, target, duration = 800) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================================
// AQI GAUGE (SVG arc)
// ============================================================

function drawAqiGauge(aqi) {
  const svg = document.getElementById('aqiGaugeSvg');
  if (!svg) return;

  const cx = 100, cy = 96, r = 68;
  const startAngle = Math.PI;
  const maxAqi = 500;
  const progress = Math.min(Math.max(aqi / maxAqi, 0), 1);
  const arcAngle = startAngle + progress * Math.PI;

  function polarToXY(angle, radius = r) {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  const segments = [
    { max: 100,  color: '#22c55e' },
    { max: 200,  color: '#facc15' },
    { max: 300,  color: '#fb923c' },
    { max: 400,  color: '#ef4444' },
    { max: 500,  color: '#dc2626' }
  ];

  // Background arc
  const bgStart = polarToXY(Math.PI);
  const bgEnd   = polarToXY(2 * Math.PI);
  let paths = `<path d="M${bgStart.x},${bgStart.y} A${r},${r} 0 0,1 ${bgEnd.x},${bgEnd.y}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10" stroke-linecap="round"/>`;

  // Determine arc color
  let arcColor = '#ef4444';
  for (const seg of segments) {
    if (aqi <= seg.max) { arcColor = seg.color; break; }
  }

  // Progress arc (semicircle arc is <= 180deg, so large-arc-flag is always 0)
  if (progress > 0) {
    const progStart = polarToXY(Math.PI);
    const progEnd   = polarToXY(arcAngle);
    paths += `<path d="M${progStart.x},${progStart.y} A${r},${r} 0 0,1 ${progEnd.x},${progEnd.y}" fill="none" stroke="${arcColor}" stroke-width="10" stroke-linecap="round" style="filter:drop-shadow(0 0 6px ${arcColor})"/>`;
  }

  // Value text in center
  paths += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="${arcColor}" font-size="28" font-weight="900" font-family="JetBrains Mono,monospace">${aqi}</text>`;
  paths += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="rgba(148,163,184,0.8)" font-size="10" font-family="Inter,sans-serif" font-weight="700" letter-spacing="1">AQI</text>`;

  // Scale labels at base
  paths += `<text x="${cx - r + 2}" y="${cy + 14}" text-anchor="middle" fill="rgba(74,90,122,0.8)" font-size="9" font-family="JetBrains Mono,monospace">0</text>`;
  paths += `<text x="${cx + r - 2}" y="${cy + 14}" text-anchor="middle" fill="rgba(74,90,122,0.8)" font-size="9" font-family="JetBrains Mono,monospace">500</text>`;

  svg.innerHTML = paths;
}

// ============================================================
// PTI GAUGE (semi-circular)
// ============================================================

function drawPTIGauge(pti) {
  const svg = document.getElementById('ptiGaugeSvg');
  if (!svg) return;

  const cx = 120, cy = 118, r = 80;
  const progress = Math.min(Math.max(pti / 100, 0), 1);
  const arcAngle = Math.PI + progress * Math.PI;

  function polarToXY(angle, radius = r) {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  const gradColors = ['#22c55e','#facc15','#fb923c','#ef4444','#dc2626'];
  const stepSize = Math.PI / 5;

  let paths = '';

  // Background segments
  for (let i = 0; i < 5; i++) {
    const a1 = Math.PI + i * stepSize;
    const a2 = Math.PI + (i + 1) * stepSize;
    const p1 = polarToXY(a1);
    const p2 = polarToXY(a2);
    paths += `<path d="M${p1.x},${p1.y} A${r},${r} 0 0,1 ${p2.x},${p2.y}" fill="none" stroke="${gradColors[i]}25" stroke-width="14" stroke-linecap="butt"/>`;
  }

  // Progress arc (semicircle arc is <= 180deg, so large-arc-flag is always 0)
  const pStart = polarToXY(Math.PI);
  const pEnd   = polarToXY(arcAngle);

  // Color based on PTI
  const ptiColor = pti >= 70 ? '#ef4444' : pti >= 40 ? '#fb923c' : '#22c55e';
  if (progress > 0) {
    paths += `<path d="M${pStart.x},${pStart.y} A${r},${r} 0 0,1 ${pEnd.x},${pEnd.y}" fill="none" stroke="${ptiColor}" stroke-width="14" stroke-linecap="round" style="filter:drop-shadow(0 0 8px ${ptiColor})"/>`;
  }

  // Needle (tip stays safely within bounds)
  const needleAngle = Math.PI + progress * Math.PI;
  const nTip = polarToXY(needleAngle, r - 6);
  paths += `<line x1="${cx}" y1="${cy}" x2="${nTip.x}" y2="${nTip.y}" stroke="${ptiColor}" stroke-width="2.5" stroke-linecap="round"/>`;
  paths += `<circle cx="${cx}" cy="${cy}" r="5.5" fill="${ptiColor}" style="filter:drop-shadow(0 0 4px ${ptiColor})"/>`;

  // Scale labels 0 and 100
  paths += `<text x="${cx - r - 2}" y="${cy + 14}" text-anchor="middle" fill="rgba(74,90,122,0.8)" font-size="9" font-family="JetBrains Mono,monospace">0</text>`;
  paths += `<text x="${cx + r + 2}" y="${cy + 14}" text-anchor="middle" fill="rgba(74,90,122,0.8)" font-size="9" font-family="JetBrains Mono,monospace">100</text>`;

  svg.innerHTML = paths;
}

// ============================================================
// PTI FACTOR BARS
// ============================================================

function updatePTIFactors(s) {
  const factors = [
    { id: 'factorPbl',  val: `${s.pbl} m`,  pct: s.pbl < 600 ? 88 : s.pbl < 1000 ? 55 : 25, influence: s.pbl < 600 ? 'high' : 'mod' },
    { id: 'factorWind', val: `${s.wind} m/s`, pct: s.wind < 2 ? 92 : s.wind < 4 ? 58 : 28, influence: s.wind < 2 ? 'high' : 'mod' },
    { id: 'factorInv',  val: s.inversion,   pct: s.inversion === 'Detected' ? 85 : s.inversion === 'Developing' ? 55 : 20, influence: s.inversion === 'Detected' ? 'high' : 'mod' },
    { id: 'factorHum',  val: `${s.humidity}%`, pct: s.humidity > 70 ? 72 : s.humidity > 55 ? 48 : 30, influence: s.humidity > 70 ? 'mod' : 'low' },
    { id: 'factorTrend',val: s.aqi > 200 ? 'Rising' : 'Stable', pct: s.aqi > 250 ? 80 : s.aqi > 180 ? 55 : 25, influence: s.aqi > 200 ? 'high' : 'low' }
  ];

  factors.forEach(f => {
    const valEl = document.getElementById(f.id + 'Val');
    const barEl = document.getElementById(f.id + 'Bar');
    const infEl = document.getElementById(f.id + 'Inf');
    if (valEl) valEl.textContent = f.val;
    if (barEl) { setTimeout(() => { barEl.style.width = f.pct + '%'; }, 100); }
    if (infEl) {
      infEl.textContent = f.influence === 'high' ? 'High influence' : f.influence === 'mod' ? 'Moderate influence' : 'Low influence';
      infEl.className = 'influence-tag influence-' + f.influence;
    }
  });
}

// ============================================================
// SHAP BARS
// ============================================================

function updateShapBars(shapData) {
  shapData.forEach((item, i) => {
    const barEl = document.getElementById(`shapBar${i}`);
    const pctEl = document.getElementById(`shapPct${i}`);
    const featEl = document.getElementById(`shapFeat${i}`);
    if (barEl) setTimeout(() => { barEl.style.width = item.pct + '%'; }, 150);
    if (pctEl) pctEl.textContent = item.pct + '%';
    if (featEl) featEl.textContent = item.feature;
  });
}

// ============================================================
// PROBABILITY RING
// ============================================================

function drawProbabilityRing(pct) {
  const svg = document.getElementById('probSvg');
  if (!svg) return;

  const r = 76, cx = 90, cy = 90;
  const circumference = 2 * Math.PI * r;
  const fill = (pct / 100) * circumference;
  const gap  = circumference - fill;

  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#fb923c' : '#22c55e';

  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="12"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="12"
      stroke-dasharray="${fill} ${gap}" stroke-linecap="round"
      style="filter:drop-shadow(0 0 10px ${color});transition:stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)"/>
  `;
}

// ============================================================
// FORECAST CHART (Canvas)
// ============================================================

function drawForecastChart() {
  const canvas = document.getElementById('forecastCanvas');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width || 800;
  const H = 300;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const data = generateForecastData(currentScenario, currentChartHours);
  canvasData = data;

  const PAD = { top: 24, right: 32, bottom: 48, left: 52 };
  const W2 = W - PAD.left - PAD.right;
  const H2 = H - PAD.top  - PAD.bottom;

  const allVals = [...data.obs, ...data.forecast].filter(Boolean);
  const minV = Math.max(0, Math.min(...allVals) - 30);
  const maxV = Math.max(...allVals) + 50;

  const bg = isLightTheme ? '#ffffff' : '#111d35';
  const gridColor = isLightTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
  const textColor = isLightTheme ? '#475569' : '#4a5a7a';

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = PAD.top + (H2 / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + W2, y);
    ctx.stroke();

    const val = Math.round(maxV - ((maxV - minV) / gridLines) * i);
    ctx.fillStyle = textColor;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val, PAD.left - 8, y + 4);
  }

  // Warning threshold line
  const threshY = PAD.top + H2 - ((200 - minV) / (maxV - minV)) * H2;
  if (200 > minV && 200 < maxV) {
    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = 'rgba(249,115,22,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD.left, threshY);
    ctx.lineTo(PAD.left + W2, threshY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(249,115,22,0.8)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AQI 200 — Warning', PAD.left + 4, threshY - 4);
  }

  function getX(i) { return PAD.left + (i / (data.times.length - 1)) * W2; }
  function getY(v) { return PAD.top + H2 - ((v - minV) / (maxV - minV)) * H2; }

  // Shaded forecast zone
  const splitIdx = data.obs.filter(Boolean).length;

  // Historical area fill
  const obsPoints = data.obs.map((v, i) => v !== null ? { x: getX(i), y: getY(v) } : null).filter(Boolean);
  if (obsPoints.length > 1) {
    ctx.beginPath();
    ctx.moveTo(obsPoints[0].x, getY(minV));
    obsPoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(obsPoints[obsPoints.length - 1].x, getY(minV));
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + H2);
    grad.addColorStop(0, 'rgba(77,184,255,0.18)');
    grad.addColorStop(1, 'rgba(77,184,255,0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Forecast area fill
  const fPoints = data.forecast.map((v, i) => v !== null ? { x: getX(i), y: getY(v) } : null).filter(Boolean);
  if (fPoints.length > 1) {
    ctx.beginPath();
    ctx.moveTo(fPoints[0].x, getY(minV));
    fPoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(fPoints[fPoints.length - 1].x, getY(minV));
    ctx.closePath();
    const grad2 = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + H2);
    grad2.addColorStop(0, 'rgba(34,211,192,0.15)');
    grad2.addColorStop(1, 'rgba(34,211,192,0)');
    ctx.fillStyle = grad2;
    ctx.fill();
  }

  // Historical line (solid, blue)
  if (obsPoints.length > 1) {
    ctx.setLineDash([]);
    ctx.strokeStyle = '#4db8ff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    obsPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Dots
    ctx.fillStyle = '#4db8ff';
    obsPoints.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Forecast line (dashed, teal)
  if (fPoints.length > 1) {
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#22d3c0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    fPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);

    // Dots
    ctx.fillStyle = '#22d3c0';
    fPoints.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // "NOW" line
  if (splitIdx > 0 && splitIdx < data.times.length) {
    const nowX = getX(splitIdx - 1);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nowX, PAD.top);
    ctx.lineTo(nowX, PAD.top + H2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOW', nowX, PAD.top + H2 + 14);
  }

  // X-axis time labels
  ctx.fillStyle = textColor;
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'center';
  const labelStep = Math.max(1, Math.floor(data.times.length / 8));
  data.times.forEach((t, i) => {
    if (i % labelStep === 0) {
      const x = getX(i);
      const label = t.getHours().toString().padStart(2, '0') + ':00';
      ctx.fillText(label, x, H - 8);
    }
  });

  // Y-axis label
  ctx.save();
  ctx.translate(14, PAD.top + H2 / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = textColor;
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AQI', 0, 0);
  ctx.restore();
}

// Tooltip handling
function initChartTooltip() {
  const canvas = document.getElementById('forecastCanvas');
  const tooltip = document.getElementById('chartTooltip');
  if (!canvas || !tooltip) return;

  canvas.addEventListener('mousemove', (e) => {
    if (!canvasData) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const W  = rect.width;
    const PAD = { left: 52, right: 32 };
    const W2 = W - PAD.left - PAD.right;
    const n = canvasData.times.length;
    const idx = Math.round((mx - PAD.left) / W2 * (n - 1));
    if (idx < 0 || idx >= n) { tooltip.style.display = 'none'; return; }

    const t = canvasData.times[idx];
    const obs = canvasData.obs[idx];
    const fc  = canvasData.forecast[idx];
    const hour = t.getHours().toString().padStart(2,'0') + ':00';
    const dateStr = t.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    let html = `<div class="tooltip-time">${dateStr} ${hour}</div>`;
    if (obs !== null) {
      const pm25 = Math.round(obs * 0.67);
      html += `<div class="tooltip-row"><span class="tooltip-dot" style="background:#4db8ff"></span>Observed AQI: <strong>${obs}</strong> · PM2.5: ${pm25} µg/m³</div>`;
    }
    if (fc !== null) {
      const pm25 = Math.round(fc * 0.67);
      html += `<div class="tooltip-row"><span class="tooltip-dot" style="background:#22d3c0"></span>Forecast AQI: <strong>${fc}</strong> · PM2.5: ${pm25} µg/m³</div>`;
    }
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';

    const left = Math.min(mx + 12, W - 200);
    tooltip.style.left = left + 'px';
    tooltip.style.top = '20px';
  });

  canvas.addEventListener('mouseleave', () => {
    if (tooltip) tooltip.style.display = 'none';
  });
}

// Chart time range buttons
function initChartToggles() {
  document.querySelectorAll('.chart-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartHours = parseInt(btn.dataset.hours);
      drawForecastChart();
    });
  });
}

// ============================================================
// EPISODE HISTORY CHART
// ============================================================

function drawEpisodeHistoryChart() {
  const canvas = document.getElementById('episodeHistoryCanvas');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width || 600;
  const H = 160;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const bg = isLightTheme ? '#ffffff' : '#111d35';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const days = 14;
  const episodes = [
    { day: 2,  start: 6, end: 14, peak: 380, type: 'past' },
    { day: 5,  start: 8, end: 20, peak: 420, type: 'past' },
    { day: 9,  start: 4, end: 12, peak: 350, type: 'past' },
    { day: 13, start: 10, end: null, peak: 420, type: 'predicted' }
  ];

  const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
  const W2 = W - PAD.left - PAD.right;
  const H2 = H - PAD.top - PAD.bottom;

  const gridColor = isLightTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
  const textColor = isLightTheme ? '#475569' : '#4a5a7a';

  // Background timeline bar
  ctx.fillStyle = isLightTheme ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)';
  ctx.beginPath();
  ctx.roundRect(PAD.left, PAD.top + H2 * 0.35, W2, H2 * 0.3, 4);
  ctx.fill();

  // Day labels
  ctx.fillStyle = textColor;
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (let d = 0; d <= days; d += 2) {
    const x = PAD.left + (d / days) * W2;
    const label = `Day ${d}`;
    ctx.fillText(label, x, H - 8);
  }

  // Episode blocks
  episodes.forEach(ep => {
    const x1 = PAD.left + (ep.day / days) * W2;
    const peakH = (ep.peak / 500) * H2 * 0.7;
    const barW = ep.end ? ((ep.end - ep.start) / (days * 24)) * W2 * 5 : W2 * 0.06;

    const color = ep.type === 'predicted' ? '#22d3c0' : '#ef4444';
    const alpha = ep.type === 'predicted' ? '44' : '66';

    // Vertical bar
    ctx.fillStyle = color + alpha;
    ctx.beginPath();
    ctx.roundRect(x1 - barW / 2, PAD.top + H2 * 0.5 - peakH / 2, barW, peakH, 3);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x1 - barW / 2, PAD.top + H2 * 0.5 - peakH / 2, barW, peakH, 3);
    ctx.stroke();

    // Peak label
    ctx.fillStyle = color;
    ctx.font = `bold 9px Inter, sans-serif`;
    ctx.textAlign = 'center';
    const labelY = PAD.top + H2 * 0.5 - peakH / 2 - 4;
    ctx.fillText(`${ep.peak}`, x1, labelY);

    // Type label
    const typeLabel = ep.type === 'predicted' ? '▶ Predicted' : '● Detected';
    ctx.fillStyle = color;
    ctx.font = '8px Inter, sans-serif';
    ctx.fillText(typeLabel, x1, PAD.top + H2 * 0.5 + peakH / 2 + 12);
  });
}

// ============================================================
// PBL VISUALIZATION (SVG)
// ============================================================

function drawPBLViz() {
  const goodEl = document.getElementById('pblGoodSvg');
  const badEl  = document.getElementById('pblBadSvg');
  if (!goodEl || !badEl) return;

  function makePBL(svgEl, pblHigh, title) {
    const W = svgEl.parentElement.getBoundingClientRect().width || 300;
    const H = 240;
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.setAttribute('width', W);
    svgEl.setAttribute('height', H);

    const groundY = H - 40;
    const pblY = pblHigh ? groundY - 140 : groundY - 60;
    const skyColor = pblHigh ? '#1a2e5a' : '#2a1a1a';

    let html = '';

    // Sky gradient
    html += `<defs>
      <linearGradient id="sky${pblHigh?'H':'L'}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${pblHigh ? '#0a1a3a' : '#1a0a0a'}"/>
        <stop offset="100%" stop-color="${pblHigh ? '#102040' : '#200810'}"/>
      </linearGradient>
    </defs>`;
    html += `<rect width="${W}" height="${H}" fill="url(#sky${pblHigh?'H':'L'})"/>`;

    // Ground
    html += `<rect x="0" y="${groundY}" width="${W}" height="${H - groundY}" fill="#1a2a14" rx="0"/>`;
    html += `<rect x="0" y="${groundY}" width="${W}" height="3" fill="#2a4020" rx="0"/>`;

    // Road markings
    for (let i = 20; i < W - 20; i += 40) {
      html += `<rect x="${i}" y="${groundY + 12}" width="20" height="3" fill="rgba(255,255,255,0.1)" rx="1"/>`;
    }

    // Buildings
    const buildings = [[20, 70, 40, groundY], [70, 90, 35, groundY], [W - 60, 80, 45, groundY]];
    buildings.forEach(([x, h, w, gy]) => {
      html += `<rect x="${x}" y="${gy - h}" width="${w}" height="${h}" fill="rgba(20,40,80,0.8)" rx="2"/>`;
      // Windows
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const wx = x + 5 + c * 10, wy = gy - h + 8 + r * 20;
          const lit = Math.random() > 0.4;
          html += `<rect x="${wx}" y="${wy}" width="6" height="8" fill="${lit ? 'rgba(255,220,100,0.5)' : 'rgba(40,60,100,0.5)'}" rx="1"/>`;
        }
      }
    });

    // Vehicles (small rectangles)
    [[100, groundY - 14, '#334466'], [W * 0.5, groundY - 12, '#443322'], [W * 0.7, groundY - 13, '#334466']].forEach(([x, y, col]) => {
      html += `<rect x="${x}" y="${y}" width="28" height="12" fill="${col}" rx="3"/>`;
      html += `<rect x="${x + 4}" y="${y - 5}" width="16" height="8" fill="${col}" rx="2"/>`;
    });

    // PM2.5 particles (animated)
    const particleCount = pblHigh ? 12 : 22;
    const maxY = pblY;
    for (let p = 0; p < particleCount; p++) {
      const px = 10 + Math.random() * (W - 20);
      const py = maxY + Math.random() * (groundY - maxY - 10);
      const r  = 1.5 + Math.random() * 2;
      const op = 0.4 + Math.random() * 0.4;
      const dur = 3 + Math.random() * 4;
      const delay = Math.random() * 3;
      const color = pblHigh ? 'rgba(200,160,80,' : 'rgba(255,100,50,';
      html += `<circle cx="${px}" cy="${py}" r="${r}" fill="${color}${op})" opacity="0">
        <animate attributeName="opacity" values="0;${op};0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="${py};${py - 20};${py}" dur="${dur * 1.5}s" begin="${delay}s" repeatCount="indefinite"/>
      </circle>`;
    }

    // PBL line
    const pblLineColor = pblHigh ? '#22c55e' : '#ef4444';
    html += `<line x1="0" y1="${pblY}" x2="${W}" y2="${pblY}" stroke="${pblLineColor}" stroke-width="2" stroke-dasharray="8,4" opacity="0.8"/>`;

    // PBL label
    html += `<rect x="4" y="${pblY - 14}" width="${pblHigh ? 90 : 82}" height="16" rx="4" fill="${pblLineColor}22"/>`;
    html += `<text x="8" y="${pblY - 3}" font-size="9" font-family="Inter,sans-serif" font-weight="700" fill="${pblLineColor}">PBL ${pblHigh ? '≈1400 m' : '≈520 m'}</text>`;

    // Arrow showing mixing height
    if (pblHigh) {
      html += `<line x1="${W - 20}" y1="${groundY}" x2="${W - 20}" y2="${pblY + 10}" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="3,2"/>`;
      html += `<text x="${W - 24}" y="${(groundY + pblY) / 2}" font-size="9" fill="#22c55e" text-anchor="end" font-family="Inter,sans-serif">Mixes</text>`;
      html += `<text x="${W - 24}" y="${(groundY + pblY) / 2 + 10}" font-size="9" fill="#22c55e" text-anchor="end" font-family="Inter,sans-serif">upward</text>`;
    } else {
      html += `<line x1="${W - 20}" y1="${groundY}" x2="${W - 20}" y2="${pblY + 4}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2"/>`;
      html += `<text x="${W - 24}" y="${(groundY + pblY) / 2}" font-size="9" fill="#ef4444" text-anchor="end" font-family="Inter,sans-serif">Trapped</text>`;
      html += `<text x="${W - 24}" y="${(groundY + pblY) / 2 + 10}" font-size="9" fill="#ef4444" text-anchor="end" font-family="Inter,sans-serif">near ground</text>`;
    }

    svgEl.innerHTML = html;
  }

  makePBL(goodEl, true);
  makePBL(badEl, false);
}

// ============================================================
// DELHI NCR LEAFLET MAP & AQI HEATMAP
// ============================================================

function getAqiColor(aqi) {
  if (aqi <= 100) return '#22c55e'; // Good
  if (aqi <= 200) return '#facc15'; // Moderate
  if (aqi <= 300) return '#fb923c'; // Poor
  if (aqi <= 400) return '#ef4444'; // Very Poor
  return '#7f1d1d';                 // Severe
}

function initDelhiMap() {
  const mapEl = document.getElementById('delhiMap');
  if (!mapEl || typeof L === 'undefined') return;

  if (leafletMap) {
    leafletMap.invalidateSize();
    updateDelhiMap();
    return;
  }

  // Initialize Leaflet Map
  leafletMap = L.map('delhiMap', {
    center: [28.6139, 77.2090],
    zoom: 10,
    minZoom: 9,
    maxZoom: 14,
    zoomControl: true,
    scrollWheelZoom: false
  });

  // OpenStreetMap free tile provider (No API key, zero watermarks)
  const osmTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  tileLayer = L.tileLayer(osmTiles, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19
  }).addTo(leafletMap);

  markersLayerGroup = L.layerGroup().addTo(leafletMap);

  initMapLayerButtons();
  updateDelhiMap();
}

function initMapLayerButtons() {
  const toggleHeatmapBtn = document.getElementById('toggleHeatmapBtn');
  if (toggleHeatmapBtn) {
    toggleHeatmapBtn.addEventListener('click', () => {
      showHeatmap = !showHeatmap;
      toggleHeatmapBtn.classList.toggle('active', showHeatmap);
      if (heatLayer && leafletMap) {
        if (showHeatmap) {
          heatLayer.addTo(leafletMap);
        } else {
          leafletMap.removeLayer(heatLayer);
        }
      }
    });
  }

  const toggleStationsBtn = document.getElementById('toggleStationsBtn');
  if (toggleStationsBtn) {
    toggleStationsBtn.addEventListener('click', () => {
      showStations = !showStations;
      toggleStationsBtn.classList.toggle('active', showStations);
      if (markersLayerGroup && leafletMap) {
        if (showStations) {
          markersLayerGroup.addTo(leafletMap);
        } else {
          leafletMap.removeLayer(markersLayerGroup);
        }
      }
    });
  }
}

function generateHeatmapPoints(scenarioMultiplier) {
  const points = [];
  const minLat = 28.34, maxLat = 28.82, stepLat = 0.024;
  const minLng = 76.90, maxLng = 77.54, stepLng = 0.026;

  // Concentrated heat around each station
  MAP_STATIONS.forEach(st => {
    const curAqi = Math.round(st.baseAqi * scenarioMultiplier);
    const intensity = Math.min(1.0, Math.max(0.15, curAqi / 420));
    points.push([st.lat, st.lng, intensity]);

    const offsets = [
      [0.008, 0.008], [-0.008, -0.008], [0.008, -0.008], [-0.008, 0.008],
      [0.015, 0], [-0.015, 0], [0, 0.015], [0, -0.015]
    ];
    offsets.forEach(([dlat, dlng]) => {
      points.push([st.lat + dlat, st.lng + dlng, intensity * 0.85]);
    });
  });

  // Inverse Distance Weighting interpolation across NCR
  for (let lat = minLat; lat <= maxLat; lat += stepLat) {
    for (let lng = minLng; lng <= maxLng; lng += stepLng) {
      let weightSum = 0;
      let weightedAqi = 0;
      MAP_STATIONS.forEach(st => {
        const d = Math.hypot(lat - st.lat, lng - st.lng);
        const w = 1 / Math.pow(Math.max(d, 0.01), 2);
        weightSum += w;
        weightedAqi += (st.baseAqi * scenarioMultiplier) * w;
      });
      const aqi = weightedAqi / weightSum;
      const intensity = Math.min(1.0, Math.max(0.06, aqi / 450));
      points.push([lat, lng, intensity]);
    }
  }

  return points;
}

function updateDelhiMap() {
  if (!leafletMap) return;

  const multipliers = {
    severe: 1.0,
    building: 0.76,
    normal: 0.42,
    recovery: 0.65
  };
  const mult = multipliers[currentScenario] || 1.0;

  // 1. Update Heatmap Layer
  if (typeof L.heatLayer === 'function') {
    const heatPoints = generateHeatmapPoints(mult);
    if (heatLayer) {
      leafletMap.removeLayer(heatLayer);
    }
    heatLayer = L.heatLayer(heatPoints, {
      radius: 38,
      blur: 24,
      maxZoom: 13,
      max: 1.0,
      minOpacity: 0.35,
      gradient: {
        0.15: '#22c55e',
        0.35: '#facc15',
        0.55: '#fb923c',
        0.75: '#ef4444',
        1.00: '#7f1d1d'
      }
    });
    if (showHeatmap) {
      heatLayer.addTo(leafletMap);
    }
  }

  // 2. Update Station Markers
  if (markersLayerGroup) {
    markersLayerGroup.clearLayers();
    MAP_STATIONS.forEach(st => {
      const curAqi = Math.round(st.baseAqi * mult);
      const color = getAqiColor(curAqi);
      const isSelected = selectedStation && selectedStation.id === st.id;

      const iconHtml = `
        <div class="aqi-leaflet-marker ${isSelected ? 'selected' : ''}" style="--marker-color: ${color};">
          <div class="marker-pulse-ring" style="background: ${color};"></div>
          <div class="marker-badge" style="background: ${color};">${curAqi}</div>
          <div class="marker-label">${st.name.split('(')[0].trim()}</div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-aqi-div-icon',
        iconSize: [40, 54],
        iconAnchor: [20, 27]
      });

      const marker = L.marker([st.lat, st.lng], { icon: customIcon });

      marker.on('click', () => {
        selectStation(st.id);
      });

      marker.bindTooltip(`
        <div style="font-family:'Inter',sans-serif;padding:3px 6px;">
          <strong style="color:${color};font-size:12px;">${st.name}</strong><br/>
          <span style="font-size:11px;">Current AQI: <strong>${curAqi}</strong></span><br/>
          <span style="font-size:10px;color:#94a3b8;">Click station to view metrics</span>
        </div>
      `, { direction: 'top', offset: [0, -18], opacity: 0.95 });

      markersLayerGroup.addLayer(marker);
    });

    if (showStations && !leafletMap.hasLayer(markersLayerGroup)) {
      markersLayerGroup.addTo(leafletMap);
    }
  }

  // Update selected station in side info panel
  if (selectedStation) {
    const curStation = MAP_STATIONS.find(s => s.id === selectedStation.id) || MAP_STATIONS[0];
    updateStationPanel(curStation, mult);
  }
}

window.selectStation = function(id) {
  const station = MAP_STATIONS.find(s => s.id === id);
  if (!station) return;
  selectedStation = station;

  const multipliers = {
    severe: 1.0,
    building: 0.76,
    normal: 0.42,
    recovery: 0.65
  };
  const mult = multipliers[currentScenario] || 1.0;
  updateStationPanel(station, mult);

  if (leafletMap) {
    leafletMap.panTo([station.lat, station.lng], { animate: true, duration: 0.6 });
    updateDelhiMap();
  }
};

function updateStationPanel(station, mult = 1.0) {
  const curAqi = Math.round(station.baseAqi * mult);
  const curAqi24h = Math.round(station.aqi24h * mult);
  const curPti = Math.round(station.pti * (mult > 0.8 ? 1 : mult > 0.5 ? 0.75 : 0.45));
  const curRisk = Math.round(station.risk * (mult > 0.8 ? 1 : mult > 0.5 ? 0.7 : 0.22));

  setEl('infoPanelTitle', station.name);
  setEl('infoAqi', curAqi);
  setEl('infoAqi24h', curAqi24h);
  setEl('infoPti', curPti);
  setEl('infoRisk', curRisk + '%');

  const statusMap = [
    { max: 100, label: 'Good',          cls: 'status-good' },
    { max: 200, label: 'Moderate',      cls: 'status-moderate' },
    { max: 300, label: 'Poor',          cls: 'status-poor' },
    { max: 400, label: 'Very Poor',     cls: 'status-high' },
    { max: 500, label: 'Severe',        cls: 'status-severe' }
  ];
  const status = statusMap.find(s => curAqi <= s.max) || statusMap[statusMap.length - 1];

  const aqiStatusEl = document.getElementById('infoAqiStatus');
  if (aqiStatusEl) {
    aqiStatusEl.textContent = status.label;
    aqiStatusEl.className = 'kpi-status ' + status.cls;
  }
}

// ============================================================
// PROCESS FLOW ANIMATION
// ============================================================

function animateProcessFlow() {
  if (flowAnimated) return;
  const steps  = document.querySelectorAll('.flow-step');
  const arrows = document.querySelectorAll('.flow-arrow-connector');
  steps.forEach((step, i) => {
    setTimeout(() => step.classList.add('animated'), i * 150);
  });
  arrows.forEach((arrow, i) => {
    setTimeout(() => arrow.classList.add('animated'), i * 150 + 75);
  });
  flowAnimated = true;
}

// Reset flow animation when leaving About and returning
function resetFlowAnimation() {
  flowAnimated = false;
  document.querySelectorAll('.flow-step').forEach(s => s.classList.remove('animated'));
  document.querySelectorAll('.flow-arrow-connector').forEach(a => a.classList.remove('animated'));
}

// ============================================================
// MODAL — Why is the risk high?
// ============================================================

function initModal() {
  const overlay = document.getElementById('whyModal');
  const closeBtns = document.querySelectorAll('.modal-close, .modal-overlay');

  document.querySelectorAll('[data-open-modal="whyModal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function closeModal() {
  const overlay = document.getElementById('whyModal');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================================
// PREPARE BOX
// ============================================================

function initPrepareBox() {
  const btn = document.getElementById('prepareBtn');
  const box = document.getElementById('prepareBox');
  if (!btn || !box) return;
  btn.addEventListener('click', () => {
    box.classList.toggle('show');
    btn.textContent = box.classList.contains('show') ? 'Hide Tips' : 'Prepare';
  });
}

// ============================================================
// VIEW WHY LINK (scroll to explainability)
// ============================================================

function initViewWhy() {
  document.querySelectorAll('[data-scroll-to]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.dataset.scrollTo;
      navigateTo(target);
    });
  });
}

// ============================================================
// EARLY WARNING PANEL BUTTONS
// ============================================================

function initEarlyWarningBtns() {
  const viewForecastBtn = document.getElementById('ewViewForecast');
  if (viewForecastBtn) {
    viewForecastBtn.addEventListener('click', () => navigateTo('forecast'));
  }

  const ewWhyBtn = document.getElementById('ewWhyBtn');
  if (ewWhyBtn) {
    ewWhyBtn.addEventListener('click', () => {
      document.getElementById('whyModal').classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }
}

// ============================================================
// INTERSECTION OBSERVER — animate on scroll
// ============================================================

function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
}

// ============================================================
// LIVE CLOCK
// ============================================================

function startClock() {
  function update() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const el = document.getElementById('lastUpdated');
    if (el) el.textContent = `Updated ${timeStr}, ${dateStr}`;
  }
  update();
  setInterval(update, 60000);
}

// ============================================================
// RESIZE — redraw charts & map
// ============================================================

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    drawForecastChart();
    drawEpisodeHistoryChart();
    drawPBLViz();
    if (leafletMap) leafletMap.invalidateSize();
  }, 250);
});

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTheme();
  initSimulator();
  initChartTooltip();
  initChartToggles();
  initModal();
  initPrepareBox();
  initViewWhy();
  initEarlyWarningBtns();
  initScrollAnimations();
  startClock();

  // Apply initial scenario
  applyScenario('severe');

  // Init Leaflet map with AQI heatmap
  setTimeout(() => {
    initDelhiMap();
  }, 100);

  // Draw forecast chart (overview section is active)
  setTimeout(() => {
    drawForecastChart();
  }, 150);

  // PTI gauge initial draw
  drawPTIGauge(86);
  drawAqiGauge(287);
  drawProbabilityRing(87);

  // Activate first nav item
  navigateTo('overview');

  // Animate factor bars after short delay
  setTimeout(() => {
    updatePTIFactors(SCENARIOS.severe);
    updateShapBars(SCENARIOS.severe.shap);
  }, 400);
});
