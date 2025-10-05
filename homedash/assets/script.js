/*
  CONFIG
*/
const CONFIG = {
  API_KEY: "......", // API_KEY: your OpenWeatherMap key
  CITY: ".........", //your city
  UNITS: "metric", // "metric" or "imperial"
  LOCALE: "fr",    // date display locale (e.g. 'fr')
  LANG: 'fr', // 'fr' or 'en' for UI texts
  PROMETHEUS_URL: 'https://prometheus/api/v1/query?query=linky_tic_standard_sinsts', // Prometheus URL for VA consumption
  CONSO_REFRESH: 1,  // Consumption refresh interval (s)
  WEATHER_REFRESH: 600 // weather refresh in minutes (s)
};

// load saved language preference early so initial messages use it
const _savedLang = localStorage.getItem('homedash_lang');
if (_savedLang) CONFIG.LANG = _savedLang;

// Localization strings
const TEXTS = {
  en: {
    MISSING_API: 'ERROR: missing API key - set CONFIG.API_KEY in the file',
    API_KEY_NOT_CONFIGURED: 'OpenWeatherMap API key not configured.',
    GEOCODE_ERROR: 'Geocoding error',
    CITY_NOT_FOUND: 'City not found',
    CURRENT_WEATHER_ERROR: 'Current weather API error: ',
    FORECAST_ERROR: 'Forecast API error: ',
    WEATHER_FETCH_ERROR: 'Unable to fetch weather: ',
    PAGE_TITLE: 'Weather Dashboard',
    FORECAST_TITLE: 'Forecast',
    UPDATED_LABEL: 'Updated:',
    CONSO_ELEC: 'Electric consumption',
    BLOCK: 'Block',
    FEELS: 'Feels like - ',
    HUMIDITY: 'Humidity - ',
    PROMETHEUS_ERROR: 'Prometheus request error'
  },
  fr: {
    MISSING_API: 'ERREUR: clé API manquante - Remplace CONFIG.API_KEY dans le fichier',
    API_KEY_NOT_CONFIGURED: 'API key OpenWeatherMap non configurée.',
    GEOCODE_ERROR: 'Erreur géocodage',
    CITY_NOT_FOUND: 'Ville introuvable',
    CURRENT_WEATHER_ERROR: 'Erreur API météo actuelle: ',
    FORECAST_ERROR: 'Erreur API prévisions: ',
    WEATHER_FETCH_ERROR: 'Impossible de récupérer la météo: ',
    PAGE_TITLE: 'Météo — Tableau',
    FORECAST_TITLE: 'Prévisions',
    UPDATED_LABEL: 'MAJ:',
    CONSO_ELEC: 'Conso élec',
    BLOCK: 'Bloc',
    FEELS: 'Ressenti - ',
    HUMIDITY: 'Humidité - ',
    PROMETHEUS_ERROR: 'Erreur requête Prometheus'
  }
};

function t(key) {
  const lang = CONFIG.LANG || (CONFIG.LOCALE && CONFIG.LOCALE.startsWith('fr') ? 'fr' : 'en');
  return (TEXTS[lang] && TEXTS[lang][key]) || (TEXTS['en'] && TEXTS['en'][key]) || key;
}

if (!CONFIG.API_KEY || CONFIG.API_KEY === "METTRE_TA_CLE_ICI") {
  document.getElementById('desc').textContent = t('MISSING_API');
  throw new Error(t('API_KEY_NOT_CONFIGURED'));
}

function formatDate(d){
  return d.toLocaleDateString(CONFIG.LOCALE, {weekday:'long', day:'numeric', month:'long'});
}

function formatDayShort(d){
  return d.toLocaleDateString(CONFIG.LOCALE, {weekday:'short'});
}

function updateClock(){
  const now = new Date();
  document.getElementById('time').textContent = now.toLocaleTimeString(CONFIG.LOCALE, {hour:'2-digit',minute:'2-digit'});
  document.getElementById('date').textContent = formatDate(now);
}

setInterval(updateClock, 1000);
updateClock();

async function fetchWeather(){
  try {
  // 1. Get lat/lon from the city name
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(CONFIG.CITY)}&limit=1&appid=${CONFIG.API_KEY}`;
    const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) throw new Error(t('GEOCODE_ERROR'));
    const geoData = await geoRes.json();
  if (!geoData.length) throw new Error(t('CITY_NOT_FOUND'));

    const lat = geoData[0].lat;
    const lon = geoData[0].lon;

  // 2. Get current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&lang=${CONFIG.LOCALE}&appid=${CONFIG.API_KEY}`;
  const currentRes = await fetch(currentUrl);
  if(!currentRes.ok) throw new Error(t('CURRENT_WEATHER_ERROR')+currentRes.status);
    const currentData = await currentRes.json();

  // 3. Get 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&lang=${CONFIG.LOCALE}&appid=${CONFIG.API_KEY}`;
  const forecastRes = await fetch(forecastUrl);
  if(!forecastRes.ok) throw new Error(t('FORECAST_ERROR')+forecastRes.status);
    const forecastData = await forecastRes.json();

    renderWeather(currentData, forecastData, geoData[0].name);
  } catch(err){
    console.error(err);
    document.getElementById('desc').textContent = t('WEATHER_FETCH_ERROR') + err.message;
  }
}

function renderWeather(currentData, forecastData, cityName){
  // current weather
  document.getElementById('temp').textContent = Math.round(currentData.main.temp) + "°";
  document.getElementById('desc').textContent = currentData.weather && currentData.weather[0] ? currentData.weather[0].description : "";
  document.getElementById('feels_temp').textContent = t('FEELS') + Math.round(currentData.main.feels_like)+ "°C";
  document.getElementById('feels_hum').textContent = t('HUMIDITY') + currentData.main.humidity + "%";
  document.getElementById('updated').textContent = new Date(currentData.dt*1000).toLocaleTimeString(CONFIG.LOCALE, {hour:'2-digit',minute:'2-digit'});

  const icon = currentData.weather && currentData.weather[0] ? currentData.weather[0].icon : null;
  if(icon){
    document.getElementById('icon').src = `https://openweathermap.org/img/wn/${icon}@4x.png`;
  }

  // Hourly forecasts for today only
  const hourlyEl = document.getElementById('hourly-forecast');
  hourlyEl.innerHTML = "";
  const today = new Date();
  const todayDateString = today.toDateString();
  // Filter forecasts for today only
  const todayForecasts = forecastData.list.filter(item => {
    const itemDate = new Date(item.dt * 1000);
    return itemDate.toDateString() === todayDateString && itemDate > today;
  }).slice(0, 8); // Max 8 slots for today
  
  todayForecasts.forEach(item => {
    const time = new Date(item.dt * 1000);
    const hour = time.toLocaleTimeString(CONFIG.LOCALE, {hour:'2-digit', minute:'2-digit'});
    const temp = Math.round(item.main.temp);
    const icon = item.weather[0].icon;
    const hourCard = document.createElement('div');
    hourCard.className = 'hourly-item';
    hourCard.innerHTML = `
      <div class="hour">${hour}</div>
      <img src="https://openweathermap.org/img/wn/${icon}.png" style="width:48px;height:48px;" alt="${item.weather[0].description}"/>
      <div class="hour-row">
        <div class="temp">${temp}°</div> / <div class="small">${Math.round(item.pop * 100)}%</div>
      </div>
      ${item.weather[0].description ? `<div class='hourly-desc'>${item.weather[0].description}</div>` : ''}
    `;
    hourlyEl.appendChild(hourCard);
  });
  
  // (Re)start auto-scroll after hourly items are rendered
  if (window._hourlyScrollInterval) {
    clearInterval(window._hourlyScrollInterval);
    window._hourlyScrollInterval = null;
  }
  setTimeout(autoScrollHourly, 200);

  // forecast: group by day and take the first entry of each day
  const forecastEl = document.getElementById('forecast');
  forecastEl.innerHTML = "";
  
  // Group forecasts by day
  const dailyForecasts = {};
  forecastData.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toDateString();
    if (!dailyForecasts[dayKey]) {
      dailyForecasts[dayKey] = {
        date: date,
        temps: [],
        weather: item.weather[0],
        dt: item.dt
      };
    }
    dailyForecasts[dayKey].temps.push({
      temp: item.main.temp,
      temp_max: item.main.temp_max,
      temp_min: item.main.temp_min
    });
  });

  // Create cards for the next 4 days
  const days = Object.values(dailyForecasts).slice(0, 3);
  days.forEach((day, i) => {
    if (i == 0) {
      return
    }
    const dayName = formatDayShort(day.date);
    const icon = day.weather ? day.weather.icon : "";
    
  // Calculate daily min/max
    const temps = day.temps;
    const tMax = Math.round(Math.max(...temps.map(t => t.temp_max)));
    const tMin = Math.round(Math.min(...temps.map(t => t.temp_min)));
    
  // Force icon to the day variant if it's night
    let iconDay = icon;
    if (iconDay && iconDay.endsWith('n')) {
      iconDay = iconDay.replace('n', 'd');
    }
    const card = document.createElement('div');
    card.className = 'fday';
    card.innerHTML = `
      <div class="day">${dayName}</div>
      <div >
        <img src="https://openweathermap.org/img/wn/${iconDay}@2x.png" alt="${day.weather ? day.weather.description : ''}"/>
        <div class="temps">${tMax}° / <span style="color:var(--muted)">${tMin}°</span></div>
      </div>
      <div class="small" title="${day.weather ? day.weather.description : ''}">${day.weather ? day.weather.description : ""}</div>
    `;
    forecastEl.appendChild(card);
  });
}

// auto refresh (weather)
// Apply localization to static UI strings and wire language selector
function applyLocalization() {
  // document title
  document.title = t('PAGE_TITLE');
  // forecast title
  const ft = document.querySelector('.forecast-title');
  if (ft) ft.textContent = t('FORECAST_TITLE');
  // updated label (keep the #updated span)
  const fh = document.querySelector('.forecast-header .updated');
  if (fh) fh.innerHTML = `${t('UPDATED_LABEL')} <span id="updated">--</span>`;
  // footer labels
  const labels = document.querySelectorAll('.conso-label');
  labels.forEach((el, i) => {
    if (i === 0) el.textContent = t('CONSO_ELEC');
    else el.textContent = `${t('BLOCK')} ${i+1}`;
  });
  // set lang selector if present
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = CONFIG.LANG || (CONFIG.LOCALE && CONFIG.LOCALE.startsWith('fr') ? 'fr' : 'en');
  // set html lang attribute
  document.documentElement.lang = CONFIG.LANG || 'fr';
}

// wire language selector
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('lang-select');
  if (sel) {
    sel.addEventListener('change', (e) => {
      CONFIG.LANG = e.target.value;
      localStorage.setItem('homedash_lang', CONFIG.LANG);
      applyLocalization();
      // refresh date/time formatting immediately
      updateClock();
    });
  }
  applyLocalization();
});
fetchWeather();
setInterval(fetchWeather, CONFIG.WEATHER_REFRESH * 1000);

// Auto horizontal scroll for hourly forecast
function autoScrollHourly() {
  const el = document.getElementById('hourly-forecast');
  if (!el) return;
  let scrollAmount = 0;
  let direction = 1;
  let maxScroll = el.scrollWidth - el.clientWidth;
  window._hourlyScrollInterval = setInterval(() => {
    if (maxScroll <= 0) return;
    scrollAmount += direction * 0.7; // px per tick (slower)
    if (scrollAmount >= maxScroll) {
      direction = -1;
      scrollAmount = maxScroll;
    } else if (scrollAmount <= 0) {
      direction = 1;
      scrollAmount = 0;
    }
    el.scrollTo({ left: scrollAmount, behavior: 'smooth' });
  }, 40); // ~25fps
  // Update maxScroll on resize
  window.addEventListener('resize', () => {
    maxScroll = el.scrollWidth - el.clientWidth;
  });
}

// Function to fetch VA consumption from Prometheus
async function fetchConsoVA() {
  try {
    const res = await fetch(CONFIG.PROMETHEUS_URL);
  if (!res.ok) throw new Error(t('PROMETHEUS_ERROR'));
    const data = await res.json();
  // Expected format: data.data.result[0].value[1]
    let kva = '--';
    if (data && data.data && data.data.result && data.data.result.length > 0) {
      const vaVal = parseFloat(data.data.result[0].value[1]);
      kva = (vaVal / 1000).toFixed(2) + ' kVA';
    }
    document.getElementById('conso-val').textContent = kva;
  } catch (err) {
    document.getElementById('conso-val').textContent = '-- kVA';
  }
}

// Refresh VA consumption according to config
fetchConsoVA();
setInterval(fetchConsoVA, CONFIG.CONSO_REFRESH * 1000);