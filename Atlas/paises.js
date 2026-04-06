(async function () {
  // --- CONFIGURACIÓN INICIAL DEL MAPA ---
  const map = L.map("map", {
    zoomControl: true,
    preferCanvas: true
  }).setView([54, 15], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const EUROPE_BOUNDS = [[33, -25], [72, 45]];
  map.fitBounds(EUROPE_BOUNDS);

  // --- VARIABLES DE ESTADO Y CAPAS ---
  let selectedLayer = null;
  let namesVisible = false;
  let capitalsVisible = false;

  const countryLabelsLayer = L.layerGroup();
  const capitalsLayer = L.layerGroup();

  const STYLES = {
    default: { color: "#333", weight: 1, fillColor: "#6baed6", fillOpacity: 0.35 },
    hover: { color: "#000", weight: 2, fillColor: "#ffd54f", fillOpacity: 0.65 },
    selected: { color: "#000", weight: 2, fillColor: "#ff9800", fillOpacity: 0.75 }
  };

  // --- MAPAS DE TRADUCCIÓN Y ALIAS ---
  const EUROPE_COUNTRY_NAMES = new Set([
    "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria",
    "Croatia", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
    "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg",
    "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland",
    "Portugal", "Romania", "Russia", "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden",
    "Switzerland", "Turkey", "Ukraine", "United Kingdom", "Vatican City", "Cyprus"
  ]);

  const langMap = {
    Albanian: "albanés", Armenian: "armenio", Azerbaijani: "azerí", Belarusian: "bielorruso",
    Bosnian: "bosnio", Bulgarian: "búlgaro", Catalan: "catalán", Croatian: "croata",
    Czech: "checo", Danish: "danés", Dutch: "neerlandés", English: "inglés",
    Estonian: "estonio", Finnish: "finés", French: "francés", Georgian: "georgiano",
    German: "alemán", Greek: "griego", Hungarian: "húngaro", Icelandic: "islandés",
    Irish: "irlandés", Italian: "italiano", Kazakh: "kazajo", Latvian: "letón",
    Lithuanian: "lituano", Luxembourgish: "luxemburgués", Maltese: "maltés", Moldovan: "moldavo",
    Montenegrin: "montenegrino", Norwegian: "noruego", Polish: "polaco", Portuguese: "portugués",
    Romanian: "rumano", Russian: "ruso", Serbian: "serbio", Slovak: "eslovaco",
    Slovene: "esloveno", Spanish: "español", Swedish: "sueco", Turkish: "turco", Ukrainian: "ucraniano"
  };

  // --- FUNCIONES DE UTILIDAD ---
  const formatNumber = (num) => (num == null) ? "No disponible" : new Intl.NumberFormat("es-ES").format(num);
  const formatArea = (area) => (area == null) ? "No disponible" : `${new Intl.NumberFormat("es-ES").format(area)} km²`;

  function normalizeCountryName(name) {
    const aliases = {
      "Republic of Serbia": "Serbia", "Macedonia": "North Macedonia", 
      "Czech Republic": "Czechia", "Russian Federation": "Russia",
      "Vatican": "Vatican City", "Holy See": "Vatican City"
    };
    return aliases[name] || name;
  }

  function displayCountryName(name) {
    const displayAliases = {
      "North Macedonia": "Macedonia del Norte", "Czechia": "Chequia",
      "Vatican City": "Ciudad del Vaticano", "Bosnia and Herzegovina": "Bosnia y Herzegovina"
    };
    return displayAliases[name] || name;
  }

  // --- CONSTRUCCIÓN DE POPUPS ---
  function translateLanguages(languagesObj) {
    if (!languagesObj) return "No disponible";
    return Object.values(languagesObj).map(lang => langMap[lang] || lang.toLowerCase()).join(", ");
  }

  function translateCurrencies(currenciesObj) {
    if (!currenciesObj) return "No disponible";
    return Object.values(currenciesObj).map(c => {
      const name = c.name || "Moneda";
      return c.symbol ? `${name} (${c.symbol})` : name;
    }).join(", ");
  }

  function buildCountryPopup(info) {
    const displayName = displayCountryName(info.commonName || info.name || "Sin nombre");
    return `
      <div class="popup-country">
        <div class="title">
          ${info.flag ? `<img src="${info.flag}" alt="Bandera">` : ""}
          <span>${displayName}</span>
        </div>
        <div><strong>Población:</strong> ${formatNumber(info.population)}</div>
        <div><strong>Idiomas:</strong> ${translateLanguages(info.languages)}</div>
        <div><strong>Moneda:</strong> ${translateCurrencies(info.currencies)}</div>
        <div><strong>Área:</strong> ${formatArea(info.area)}</div>
      </div>`;
  }

  // --- CARGA DE DATOS ---
  const [countriesGeoJson, restCountriesData, capitalsData, kosovoGeoJson] = await Promise.all([
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json()),
    fetch("https://restcountries.com/v3.1/all?fields=name,flags,population,languages,currencies,capital,area,latlng,cca3").then(r => r.json()),
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world_country_and_usa_states_latitude_and_longitude_values.csv").then(r => r.text()),
    fetch("https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/geojson/kosovo.geojson").then(r => r.json()).catch(() => null)
  ]);

  const countryInfoMap = new Map();
  restCountriesData.forEach(c => {
    const info = {
      name: c.name.official, commonName: c.name.common, flag: c.flags.png,
      population: c.population, languages: c.languages, currencies: c.currencies,
      capital: Array.isArray(c.capital) ? c.capital[0] : null, area: c.area, latlng: c.latlng
    };
    countryInfoMap.set(normalizeCountryName(c.name.common), info);
    countryInfoMap.set(normalizeCountryName(c.name.official), info);
  });

  // --- LÓGICA DE CAPAS GEOJSON ---
  function onEachCountry(feature, layer) {
    const countryName = normalizeCountryName(feature.properties.name || feature.properties.NAME || feature.properties.admin);
    
    layer.on({
      mouseover: (e) => { if (selectedLayer !== layer) layer.setStyle(STYLES.hover); layer.bringToFront(); },
      mouseout: () => { if (selectedLayer !== layer) geojsonLayer.resetStyle(layer); },
      click: (e) => {
        if (selectedLayer) geojsonLayer.resetStyle(selectedLayer);
        selectedLayer = layer;
        layer.setStyle(STYLES.selected);
        const info = countryInfoMap.get(countryName) || { commonName: countryName };
        layer.bindPopup(buildCountryPopup(info)).openPopup(e.latlng);
      }
    });
  }

  const geojsonLayer = L.geoJSON(countriesGeoJson, {
    filter: (f) => EUROPE_COUNTRY_NAMES.has(normalizeCountryName(f.properties.name || f.properties.admin)),
    style: STYLES.default,
    onEachFeature: onEachCountry
  }).addTo(map);

  // --- MANEJO DE EVENTOS UI ---
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (selectedLayer) geojsonLayer.resetStyle(selectedLayer);
    selectedLayer = null;
    map.fitBounds(EUROPE_BOUNDS);
    map.closePopup();
  });

  document.getElementById("toggleNamesBtn").addEventListener("click", (e) => {
    namesVisible = !namesVisible;
    if (namesVisible) {
      geojsonLayer.eachLayer(layer => {
        const name = normalizeCountryName(layer.feature.properties.name || layer.feature.properties.admin);
        L.marker(layer.getBounds().getCenter(), {
          icon: L.divIcon({ className: "country-label", html: displayCountryName(name), iconSize: null }),
          interactive: false
        }).addTo(countryLabelsLayer);
      });
      countryLabelsLayer.addTo(map);
      e.target.textContent = "Ocultar nombres";
    } else {
      countryLabelsLayer.clearLayers();
      map.removeLayer(countryLabelsLayer);
      e.target.textContent = "Mostrar nombres";
    }
  });

  // Nota: La lógica de capitales se puede simplificar siguiendo el mismo patrón de toggle.
})();