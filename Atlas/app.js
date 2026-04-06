(async function () {
  const map = L.map("map", {
    zoomControl: true,
    preferCanvas: true
  }).setView([54, 15], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const EUROPE_BOUNDS = [
    [33, -25],
    [72, 45]
  ];

  map.fitBounds(EUROPE_BOUNDS);

  let selectedCountry = null;
  let namesVisible = false;
  let capitalsVisible = false;

  const countryLabelsLayer = L.layerGroup();
  const capitalsLayer = L.layerGroup();
  const specialCountriesLayer = L.layerGroup().addTo(map);
  const allCountryObjects = [];
  const addedCountryNames = new Set();

  const defaultStyle = {
    color: "#333",
    weight: 1,
    fillColor: "#6baed6",
    fillOpacity: 0.35
  };

  const hoverStyle = {
    color: "#000",
    weight: 2,
    fillColor: "#ffd54f",
    fillOpacity: 0.65
  };

  const selectedStyle = {
    color: "#000",
    weight: 2,
    fillColor: "#ff9800",
    fillOpacity: 0.75
  };

  const smallCountryMarkerStyle = {
    radius: 7,
    color: "#333",
    weight: 1,
    fillColor: "#6baed6",
    fillOpacity: 0.9
  };

  const smallCountryHoverStyle = {
    radius: 8,
    color: "#000",
    weight: 2,
    fillColor: "#ffd54f",
    fillOpacity: 1
  };

  const smallCountrySelectedStyle = {
    radius: 8,
    color: "#000",
    weight: 2,
    fillColor: "#ff9800",
    fillOpacity: 1
  };

  const LABEL_POSITIONS = {
    "Italia": [42.9, 11.4],
    "Ciudad del Vaticano": [41.9096, 12.4615],
    "San Marino": [43.937, 12.448],
    "Liechtenstein": [47.166, 9.53],
    "Mónaco": [43.741, 7.431],
    "Malta": [35.93, 14.42],
    "Andorra": [42.55, 1.6],
    "Kosovo": [42.62, 20.75]
  };

  const SMALL_COUNTRY_NAMES = new Set([
    "Andorra",
    "Liechtenstein",
    "Malta",
    "Monaco",
    "San Marino",
    "Vatican City",
    "Kosovo"
  ]);

  function formatNumber(num) {
    if (num === null || num === undefined) return "No disponible";
    return new Intl.NumberFormat("es-ES").format(num);
  }

  function formatArea(area) {
    if (area === null || area === undefined) return "No disponible";
    return `${new Intl.NumberFormat("es-ES").format(area)} km²`;
  }

  function normalizeCountryName(name) {
    if (!name) return "";

    const aliases = {
      "Republic of Serbia": "Serbia",
      "Serbia": "Serbia",
      "Macedonia": "North Macedonia",
      "North Macedonia": "North Macedonia",
      "Czech Republic": "Czechia",
      "Czechia": "Czechia",
      "Russian Federation": "Russia",
      "Russia": "Russia",
      "Bosnia and Herzegovina": "Bosnia and Herzegovina",
      "Vatican": "Vatican City",
      "Holy See": "Vatican City",
      "Vatican City": "Vatican City",
      "Republic of Kosovo": "Kosovo",
      "Kosovo": "Kosovo",
      "Kosovo*": "Kosovo",
      "Republic of Malta": "Malta"
    };

    return aliases[name] || name;
  }

  function displayCountryName(name) {
    const displayAliases = {
      "North Macedonia": "Macedonia del Norte",
      "Czechia": "Chequia",
      "Vatican City": "Ciudad del Vaticano",
      "Bosnia and Herzegovina": "Bosnia y Herzegovina",
      "Monaco": "Mónaco"
    };

    return displayAliases[name] || name;
  }

  function translateLanguages(languagesObj) {
    if (!languagesObj) return "No disponible";

    const langMap = {
      Albanian: "albanés",
      Armenian: "armenio",
      Azerbaijani: "azerí",
      Belarusian: "bielorruso",
      Bosnian: "bosnio",
      Bulgarian: "búlgaro",
      Catalan: "catalán",
      Croatian: "croata",
      Czech: "checo",
      Danish: "danés",
      Dutch: "neerlandés",
      English: "inglés",
      Estonian: "estonio",
      Finnish: "finés",
      French: "francés",
      Georgian: "georgiano",
      German: "alemán",
      Greek: "griego",
      Hungarian: "húngaro",
      Icelandic: "islandés",
      Irish: "irlandés",
      Italian: "italiano",
      Kazakh: "kazajo",
      Latvian: "letón",
      Lithuanian: "lituano",
      Luxembourgish: "luxemburgués",
      Maltese: "maltés",
      Moldovan: "moldavo",
      Montenegrin: "montenegrino",
      Norwegian: "noruego",
      Polish: "polaco",
      Portuguese: "portugués",
      Romanian: "rumano",
      Russian: "ruso",
      Serbian: "serbio",
      Slovak: "eslovaco",
      Slovene: "esloveno",
      Spanish: "español",
      Swedish: "sueco",
      Turkish: "turco",
      Ukrainian: "ucraniano",
      Latin: "latín"
    };

    return Object.values(languagesObj)
      .map(lang => langMap[lang] || String(lang).toLowerCase())
      .join(", ");
  }

  function translateCurrencies(currenciesObj) {
    if (!currenciesObj) return "No disponible";

    const currencyNameMap = {
      euro: "euro",
      dinar: "dinar",
      "serbian dinar": "dinar serbio",
      "bosnia and herzegovina convertible mark": "marco convertible de Bosnia y Herzegovina",
      "north macedonian denar": "dinar macedonio",
      "czech koruna": "corona checa",
      "hungarian forint": "forinto húngaro",
      "polish złoty": "esloti polaco",
      "romanian leu": "leu rumano",
      "bulgarian lev": "lev búlgaro",
      "swiss franc": "franco suizo",
      "pound sterling": "libra esterlina",
      "icelandic króna": "corona islandesa",
      "norwegian krone": "corona noruega",
      "swedish krona": "corona sueca",
      "danish krone": "corona danesa",
      "ukrainian hryvnia": "grivna ucraniana",
      "moldovan leu": "leu moldavo",
      "belarusian ruble": "rublo bielorruso",
      "russian ruble": "rublo ruso",
      "turkish lira": "lira turca",
      "albanian lek": "lek albanés"
    };

    return Object.values(currenciesObj)
      .map(c => {
        const rawName = (c.name || "").toLowerCase();
        const translated = currencyNameMap[rawName] || c.name || "Moneda";
        return c.symbol ? `${translated} (${c.symbol})` : translated;
      })
      .join(", ");
  }

  function buildCountryPopup(info) {
    const displayName = displayCountryName(info.commonName || info.name || "Sin nombre");
    const flag = info.flag || "";
    const population = formatNumber(info.population);
    const capital = info.capital || "No disponible";
    const languages = translateLanguages(info.languages);
    const currency = translateCurrencies(info.currencies);
    const area = formatArea(info.area);

    return `
      <div class="popup-country">
        <div class="title">
          ${flag ? `<img src="${flag}" alt="Bandera de ${displayName}">` : ""}
          <span>${displayName}</span>
        </div>
        <div><strong>Capital:</strong> ${capital}</div>
        <div><strong>Población:</strong> ${population}</div>
        <div><strong>Idiomas:</strong> ${languages}</div>
        <div><strong>Moneda:</strong> ${currency}</div>
        <div><strong>Área:</strong> ${area}</div>
      </div>
    `;
  }

  function buildCapitalPopup(countryInfo, capitalName) {
    const displayName = displayCountryName(countryInfo.commonName || countryInfo.name || "Sin nombre");
    return `
      <div class="popup-country">
        <div class="title">
          ${countryInfo.flag ? `<img src="${countryInfo.flag}" alt="Bandera de ${displayName}">` : ""}
          <span>${displayName}</span>
        </div>
        <div><strong>Capital:</strong> ${capitalName || "No disponible"}</div>
        <div><strong>Población:</strong> ${formatNumber(countryInfo.population)}</div>
        <div><strong>Idiomas:</strong> ${translateLanguages(countryInfo.languages)}</div>
        <div><strong>Moneda:</strong> ${translateCurrencies(countryInfo.currencies)}</div>
        <div><strong>Área:</strong> ${formatArea(countryInfo.area)}</div>
      </div>
    `;
  }

  const [
    countriesGeoJson,
    restCountriesData,
    capitalsData,
    kosovoGeoJson
  ] = await Promise.all([
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json()),
    fetch("https://restcountries.com/v3.1/all?fields=name,flags,population,languages,currencies,capital,area,latlng,cca3").then(r => r.json()),
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world_country_and_usa_states_latitude_and_longitude_values.csv").then(r => r.text()),
    fetch("https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/geojson/kosovo.geojson").then(r => r.json()).catch(() => null)
  ]);

  const europeCountryNames = new Set([
    "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria",
    "Croatia", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
    "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg",
    "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland",
    "Portugal", "Romania", "Russia", "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden",
    "Switzerland", "Turkey", "Ukraine", "United Kingdom", "Vatican City", "Cyprus"
  ]);

  const countryInfoMap = new Map();

  for (const c of restCountriesData) {
    const commonName = c.name?.common || "";
    const officialName = c.name?.official || "";
    const normalizedCommon = normalizeCountryName(commonName);
    const normalizedOfficial = normalizeCountryName(officialName);

    const info = {
      name: officialName,
      commonName,
      flag: c.flags?.png || c.flags?.svg || "",
      population: c.population ?? null,
      languages: c.languages ?? null,
      currencies: c.currencies ?? null,
      capital: Array.isArray(c.capital) ? c.capital[0] : null,
      area: c.area ?? null,
      latlng: c.latlng ?? null,
      cca3: c.cca3 ?? null
    };

    if (normalizedCommon) countryInfoMap.set(normalizedCommon, info);
    if (normalizedOfficial) countryInfoMap.set(normalizedOfficial, info);
  }

  if (!countryInfoMap.has("Kosovo")) {
    countryInfoMap.set("Kosovo", {
      name: "Republic of Kosovo",
      commonName: "Kosovo",
      flag: "https://flagcdn.com/w320/xk.png",
      population: 1761985,
      languages: { sqi: "Albanian", srp: "Serbian" },
      currencies: { EUR: { name: "Euro", symbol: "€" } },
      capital: "Pristina",
      area: 10908,
      latlng: [42.6026, 20.903],
      cca3: "XKX"
    });
  }

  if (!countryInfoMap.has("Vatican City")) {
    countryInfoMap.set("Vatican City", {
      name: "Vatican City State",
      commonName: "Vatican City",
      flag: "https://flagcdn.com/w320/va.png",
      population: 764,
      languages: { ita: "Italian", lat: "Latin" },
      currencies: { EUR: { name: "Euro", symbol: "€" } },
      capital: "Vatican City",
      area: 0.49,
      latlng: [41.9029, 12.4534],
      cca3: "VAT"
    });
  }

  function csvToCapitalsMap(csvText) {
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",");

    const countryIndex = headers.findIndex(h => h.trim().toLowerCase() === "country");
    const capitalIndex = headers.findIndex(h => h.trim().toLowerCase() === "city");
    const latIndex = headers.findIndex(h => h.trim().toLowerCase() === "latitude");
    const lngIndex = headers.findIndex(h => h.trim().toLowerCase() === "longitude");

    const capitalMap = new Map();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      if (!row || row.length <= Math.max(countryIndex, capitalIndex, latIndex, lngIndex)) continue;

      const country = row[countryIndex]?.replace(/^"|"$/g, "").trim();
      const capital = row[capitalIndex]?.replace(/^"|"$/g, "").trim();
      const lat = parseFloat(row[latIndex]);
      const lng = parseFloat(row[lngIndex]);

      if (!country || !capital || Number.isNaN(lat) || Number.isNaN(lng)) continue;

      capitalMap.set(normalizeCountryName(country), { capital, lat, lng });
    }

    return capitalMap;
  }

  const capitalsMap = csvToCapitalsMap(capitalsData);
  capitalsMap.set("Serbia", { capital: "Belgrado", lat: 44.7866, lng: 20.4489 });
  capitalsMap.set("Kosovo", { capital: "Pristina", lat: 42.6629, lng: 21.1655 });
  capitalsMap.set("Vatican City", { capital: "Ciudad del Vaticano", lat: 41.9029, lng: 12.4534 });
  capitalsMap.set("North Macedonia", { capital: "Skopie", lat: 41.9981, lng: 21.4254 });
  capitalsMap.set("Malta", { capital: "La Valeta", lat: 35.8989, lng: 14.5146 });
  capitalsMap.set("San Marino", { capital: "San Marino", lat: 43.9424, lng: 12.4578 });
  capitalsMap.set("Liechtenstein", { capital: "Vaduz", lat: 47.1415, lng: 9.5215 });
  capitalsMap.set("Monaco", { capital: "Mónaco", lat: 43.7384, lng: 7.4246 });
  capitalsMap.set("Andorra", { capital: "Andorra la Vieja", lat: 42.5063, lng: 1.5218 });

  function featureCountryName(feature) {
    const raw =
      feature?.properties?.name ||
      feature?.properties?.NAME ||
      feature?.properties?.admin ||
      feature?.properties?.ADMIN ||
      "";
    return normalizeCountryName(raw);
  }

  function isEuropeanFeature(feature) {
    return europeCountryNames.has(featureCountryName(feature));
  }

  function getCountryPopupInfo(countryName) {
    return countryInfoMap.get(countryName) || {
      commonName: countryName,
      population: null,
      languages: null,
      currencies: null,
      area: null,
      flag: "",
      capital: capitalsMap.get(countryName)?.capital || null
    };
  }

  function getCountryLabelLatLng(name, layerOrMarker) {
    const displayName = displayCountryName(name);
    if (LABEL_POSITIONS[displayName]) return LABEL_POSITIONS[displayName];
    if (layerOrMarker?.getLatLng) {
      const p = layerOrMarker.getLatLng();
      return [p.lat, p.lng];
    }
    if (layerOrMarker?.getBounds) {
      const center = layerOrMarker.getBounds().getCenter();
      return [center.lat, center.lng];
    }
    const capital = capitalsMap.get(name);
    if (capital) return [capital.lat, capital.lng];
    const info = countryInfoMap.get(name);
    if (info?.latlng?.length === 2) return [info.latlng[0], info.latlng[1]];
    return null;
  }

  function createCountryLabel(name, layerOrMarker) {
    const coords = getCountryLabelLatLng(name, layerOrMarker);
    if (!coords) return null;
    return L.marker(coords, {
      interactive: false,
      icon: L.divIcon({
        className: "country-label",
        html: displayCountryName(name),
        iconSize: null
      })
    });
  }

  function resetSelectedCountry() {
    if (!selectedCountry) return;
    selectedCountry.reset();
    selectedCountry = null;
  }

  function selectCountry({ target, reset, activate, info, latlng }) {
    if (selectedCountry && selectedCountry.target !== target) {
      selectedCountry.reset();
    }
    selectedCountry = { target, reset };
    activate();
    target.bindPopup(buildCountryPopup(info), { maxWidth: 300 }).openPopup(latlng);
  }

  function registerCountryPolygon(feature, layer) {
    const countryName = featureCountryName(feature);
    const info = getCountryPopupInfo(countryName);

    addedCountryNames.add(countryName);
    allCountryObjects.push({ name: countryName, ref: layer, type: "polygon" });

    layer.on({
      mouseover: function () {
        if (selectedCountry?.target !== layer) {
          layer.setStyle(hoverStyle);
        }
        layer.bringToFront();
      },
      mouseout: function () {
        if (selectedCountry?.target !== layer) {
          layer.setStyle(defaultStyle);
        }
      },
      click: function (e) {
        selectCountry({
          target: layer,
          reset: () => layer.setStyle(defaultStyle),
          activate: () => layer.setStyle(selectedStyle),
          info,
          latlng: e.latlng
        });
      }
    });
  }

  function registerCountryMarker(countryName, lat, lng) {
    const info = getCountryPopupInfo(countryName);
    const marker = L.circleMarker([lat, lng], smallCountryMarkerStyle).addTo(specialCountriesLayer);

    addedCountryNames.add(countryName);
    allCountryObjects.push({ name: countryName, ref: marker, type: "marker" });

    marker.on("mouseover", () => {
      if (selectedCountry?.target !== marker) marker.setStyle(smallCountryHoverStyle);
    });
    marker.on("mouseout", () => {
      if (selectedCountry?.target !== marker) marker.setStyle(smallCountryMarkerStyle);
    });
    marker.on("click", e => {
      selectCountry({
        target: marker,
        reset: () => marker.setStyle(smallCountryMarkerStyle),
        activate: () => marker.setStyle(smallCountrySelectedStyle),
        info,
        latlng: e.latlng
      });
    });
  }

  const filteredFeatures = countriesGeoJson.features.filter(isEuropeanFeature);
  const finalFeatures = filteredFeatures.filter(f => featureCountryName(f) !== "Kosovo");

  const geojsonData = {
    type: "FeatureCollection",
    features: finalFeatures
  };

  const geojsonLayer = L.geoJSON(geojsonData, {
    style: defaultStyle,
    onEachFeature: registerCountryPolygon
  }).addTo(map);

  if (kosovoGeoJson) {
    const kosovoLayer = L.geoJSON(kosovoGeoJson, {
      style: defaultStyle,
      onEachFeature: function (feature, layer) {
        feature.properties = feature.properties || {};
        feature.properties.name = "Kosovo";
        registerCountryPolygon(feature, layer);
      }
    }).addTo(map);
    void kosovoLayer;
  }

  const missingCountries = [...europeCountryNames].filter(name => !addedCountryNames.has(name));

  for (const countryName of missingCountries) {
    const capital = capitalsMap.get(countryName);
    const info = countryInfoMap.get(countryName);
    const coords = capital || (info?.latlng?.length === 2 ? { lat: info.latlng[0], lng: info.latlng[1] } : null);
    if (!coords) continue;
    registerCountryMarker(countryName, coords.lat, coords.lng);
  }

  function rebuildCountryLabels() {
    countryLabelsLayer.clearLayers();

    for (const item of allCountryObjects) {
      const label = createCountryLabel(item.name, item.ref);
      if (label) countryLabelsLayer.addLayer(label);
    }
  }

  function buildCapitalsLayer() {
    capitalsLayer.clearLayers();

    const seenCountries = new Set();

    for (const [countryName, info] of countryInfoMap.entries()) {
      if (!europeCountryNames.has(countryName) || seenCountries.has(countryName)) continue;
      seenCountries.add(countryName);

      let capitalData = capitalsMap.get(countryName);

      if (!capitalData && info.capital && Array.isArray(info.latlng) && info.latlng.length === 2) {
        capitalData = {
          capital: info.capital,
          lat: info.latlng[0],
          lng: info.latlng[1]
        };
      }

      if (!capitalData) continue;

      const marker = L.marker([capitalData.lat, capitalData.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="capital-dot"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        })
      });

      marker.on("click", function (e) {
        marker.bindPopup(buildCapitalPopup(info, capitalData.capital), {
          maxWidth: 300
        }).openPopup(e.latlng);
      });

      capitalsLayer.addLayer(marker);
      capitalsLayer.addLayer(
        L.marker([capitalData.lat, capitalData.lng], {
          interactive: false,
          icon: L.divIcon({
            className: "capital-label",
            html: capitalData.capital,
            iconSize: null
          })
        })
      );
    }
  }

  buildCapitalsLayer();

  document.getElementById("resetBtn").addEventListener("click", () => {
    resetSelectedCountry();
    map.closePopup();
    map.fitBounds(EUROPE_BOUNDS);
  });

  document.getElementById("toggleNamesBtn").addEventListener("click", e => {
    namesVisible = !namesVisible;

    if (namesVisible) {
      rebuildCountryLabels();
      countryLabelsLayer.addTo(map);
      e.target.textContent = "Ocultar nombres de países";
    } else {
      map.removeLayer(countryLabelsLayer);
      e.target.textContent = "Mostrar nombres de países";
    }
  });

  document.getElementById("toggleCapitalsBtn").addEventListener("click", e => {
    capitalsVisible = !capitalsVisible;

    if (capitalsVisible) {
      capitalsLayer.addTo(map);
      e.target.textContent = "Ocultar capitales";
    } else {
      map.removeLayer(capitalsLayer);
      e.target.textContent = "Mostrar capitales";
    }
  });
})();
