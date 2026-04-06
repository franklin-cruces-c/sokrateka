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

  let selectedLayer = null;
  let namesVisible = false;
  let capitalsVisible = false;

  const countryLabelsLayer = L.layerGroup();
  const capitalsLayer = L.layerGroup();

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

      "Kosovo": "Kosovo"
    };

    return aliases[name] || name;
  }

  function displayCountryName(name) {
    const displayAliases = {
      "North Macedonia": "Macedonia del Norte",
      "Czechia": "Chequia",
      "Vatican City": "Ciudad del Vaticano",
      "Bosnia and Herzegovina": "Bosnia y Herzegovina"
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
      Ukrainian: "ucraniano"
    };

    const langs = Object.values(languagesObj).map(lang => langMap[lang] || lang.toLowerCase());
    return langs.join(", ");
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

    const list = Object.values(currenciesObj).map(c => {
      const rawName = (c.name || "").toLowerCase();
      const translated = currencyNameMap[rawName] || c.name || "Moneda";
      return c.symbol ? `${translated} (${c.symbol})` : translated;
    });

    return list.join(", ");
  }

  function buildCountryPopup(info) {
    const displayName = displayCountryName(info.commonName || info.name || "Sin nombre");
    const flag = info.flag || "";
    const population = formatNumber(info.population);
    const languages = translateLanguages(info.languages);
    const currency = translateCurrencies(info.currencies);
    const area = formatArea(info.area);

    return `
      <div class="popup-country">
        <div class="title">
          ${flag ? `<img src="${flag}" alt="Bandera de ${displayName}">` : ""}
          <span>${displayName}</span>
        </div>
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
    kosovoGeoJson,
    vaticanGeoJson
  ] = await Promise.all([
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json()),
    fetch("https://restcountries.com/v3.1/all?fields=name,flags,population,languages,currencies,capital,area,latlng,cca3").then(r => r.json()),
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world_country_and_usa_states_latitude_and_longitude_values.csv").then(r => r.text()),
    fetch("https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/geojson/kosovo.geojson").then(r => r.json()).catch(() => null),
    fetch("https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/communes/75056.geojson").then(r => r.json()).catch(() => null)
  ]);

  const europeCountryNames = new Set([
    "Albania","Andorra","Austria","Belarus","Belgium","Bosnia and Herzegovina","Bulgaria",
    "Croatia","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary",
    "Iceland","Ireland","Italy","Kosovo","Latvia","Liechtenstein","Lithuania","Luxembourg",
    "Malta","Moldova","Monaco","Montenegro","Netherlands","North Macedonia","Norway","Poland",
    "Portugal","Romania","Russia","San Marino","Serbia","Slovakia","Slovenia","Spain","Sweden",
    "Switzerland","Turkey","Ukraine","United Kingdom","Vatican City","Cyprus"
  ]);

  const countryInfoMap = new Map();

  for (const c of restCountriesData) {
    const commonName = c.name?.common || "";
    const officialName = c.name?.official || "";
    const normalizedCommon = normalizeCountryName(commonName);
    const normalizedOfficial = normalizeCountryName(officialName);

    const info = {
      name: officialName,
      commonName: commonName,
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

    const map = new Map();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      if (!row || row.length <= Math.max(countryIndex, capitalIndex, latIndex, lngIndex)) continue;

      const country = row[countryIndex]?.replace(/^"|"$/g, "").trim();
      const capital = row[capitalIndex]?.replace(/^"|"$/g, "").trim();
      const lat = parseFloat(row[latIndex]);
      const lng = parseFloat(row[lngIndex]);

      if (!country || !capital || Number.isNaN(lat) || Number.isNaN(lng)) continue;

      const normalized = normalizeCountryName(country);
      map.set(normalized, { capital, lat, lng });
    }

    return map;
  }

  const capitalsMap = csvToCapitalsMap(capitalsData);

  capitalsMap.set("Serbia", { capital: "Belgrado", lat: 44.7866, lng: 20.4489 });
  capitalsMap.set("Kosovo", { capital: "Pristina", lat: 42.6629, lng: 21.1655 });
  capitalsMap.set("Vatican City", { capital: "Ciudad del Vaticano", lat: 41.9029, lng: 12.4534 });
  capitalsMap.set("North Macedonia", { capital: "Skopie", lat: 41.9981, lng: 21.4254 });

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
    const name = featureCountryName(feature);
    return europeCountryNames.has(name);
  }

  function createCountryLabel(layer, name) {
    const center = layer.getBounds().getCenter();
    return L.marker(center, {
      interactive: false,
      icon: L.divIcon({
        className: "country-label",
        html: displayCountryName(name),
        iconSize: null
      })
    });
  }

  function resetSelection() {
    if (selectedLayer) {
      geojsonLayer.resetStyle(selectedLayer);
      selectedLayer = null;
    }
    map.closePopup();
  }

  function onEachCountry(feature, layer) {
    const countryName = featureCountryName(feature);

    layer.on({
      mouseover: function () {
        if (selectedLayer !== layer) {
          layer.setStyle(hoverStyle);
        }
        layer.bringToFront();
      },
      mouseout: function () {
        if (selectedLayer !== layer) {
          geojsonLayer.resetStyle(layer);
        }
      },
      click: function (e) {
        if (selectedLayer && selectedLayer !== layer) {
          geojsonLayer.resetStyle(selectedLayer);
        }

        selectedLayer = layer;
        layer.setStyle(selectedStyle);

        const info = countryInfoMap.get(countryName) || {
          commonName: countryName,
          population: null,
          languages: null,
          currencies: null,
          area: null,
          flag: ""
        };

        layer.bindPopup(buildCountryPopup(info), {
          maxWidth: 300
        }).openPopup(e.latlng);
      }
    });

    if (namesVisible) {
      countryLabelsLayer.addLayer(createCountryLabel(layer, countryName));
    }
  }

  const filteredFeatures = countriesGeoJson.features.filter(isEuropeanFeature);
  const finalFeatures = filteredFeatures.filter(f => featureCountryName(f) !== "Kosovo");

  const geojsonData = {
    type: "FeatureCollection",
    features: finalFeatures
  };

  let geojsonLayer = L.geoJSON(geojsonData, {
    style: defaultStyle,
    onEachFeature: onEachCountry
  }).addTo(map);

  if (kosovoGeoJson) {
    L.geoJSON(kosovoGeoJson, {
      style: defaultStyle,
      onEachFeature: function (feature, layer) {
        feature.properties = feature.properties || {};
        feature.properties.name = "Kosovo";
        onEachCountry(feature, layer);
      }
    }).addTo(map);
  }

  const vaticanInfo = countryInfoMap.get("Vatican City");
  if (vaticanInfo?.latlng) {
    const vaticanMarker = L.circleMarker(vaticanInfo.latlng, {
      radius: 7,
      color: "#333",
      weight: 1,
      fillColor: "#6baed6",
      fillOpacity: 0.9
    }).addTo(map);

    vaticanMarker.on("mouseover", function () {
      vaticanMarker.setStyle({
        color: "#000",
        weight: 2,
        fillColor: "#ffd54f",
        fillOpacity: 1
      });
    });

    vaticanMarker.on("mouseout", function () {
      vaticanMarker.setStyle({
        color: "#333",
        weight: 1,
        fillColor: "#6baed6",
        fillOpacity: 0.9
      });
    });

    vaticanMarker.on("click", function (e) {
      const info = countryInfoMap.get("Vatican City");
      vaticanMarker.bindPopup(buildCountryPopup(info), {
        maxWidth: 300
      }).openPopup(e.latlng);
    });

    if (namesVisible) {
      countryLabelsLayer.addLayer(
        L.marker(vaticanInfo.latlng, {
          interactive: false,
          icon: L.divIcon({
            className: "country-label",
            html: "Ciudad del Vaticano",
            iconSize: null
          })
        })
      );
    }
  }

  function rebuildCountryLabels() {
    countryLabelsLayer.clearLayers();

    geojsonLayer.eachLayer(layer => {
      const feature = layer.feature;
      const countryName = featureCountryName(feature);
      countryLabelsLayer.addLayer(createCountryLabel(layer, countryName));
    });

    if (vaticanInfo?.latlng) {
      countryLabelsLayer.addLayer(
        L.marker(vaticanInfo.latlng, {
          interactive: false,
          icon: L.divIcon({
            className: "country-label",
            html: "Ciudad del Vaticano",
            iconSize: null
          })
        })
      );
    }
  }

  function buildCapitalsLayer() {
    capitalsLayer.clearLayers();

    for (const [countryName, info] of countryInfoMap.entries()) {
      if (!europeCountryNames.has(countryName)) continue;

      let capitalData = capitalsMap.get(countryName);

      if (!capitalData) {
        if (info.capital && Array.isArray(info.latlng) && info.latlng.length === 2) {
          capitalData = {
            capital: info.capital,
            lat: info.latlng[0],
            lng: info.latlng[1]
          };
        } else {
          continue;
        }
      }

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
    resetSelection();
    map.fitBounds(EUROPE_BOUNDS);
  });

  document.getElementById("toggleNamesBtn").addEventListener("click", (e) => {
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

  document.getElementById("toggleCapitalsBtn").addEventListener("click", (e) => {
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
