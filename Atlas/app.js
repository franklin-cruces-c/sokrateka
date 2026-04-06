(() => {
  const EUROPE_BOUNDS = [[33, -25], [72, 45]];
  const GEOJSON_URL = 'https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/GeoJSON/europe.geojson';
  const RESTCOUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,flags,population,languages,currencies,capital,capitalInfo,area,cca2,cca3';

  const EUROPEAN_COUNTRIES = new Set([
    'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
    'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Finland',
    'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
    'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta',
    'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia', 'Norway',
    'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia',
    'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine',
    'United Kingdom', 'Vatican City'
  ]);

  const LANGUAGE_ES = {
    Albanian: 'albanés', Armenian: 'armenio', Azerbaijani: 'azerí', Belarusian: 'bielorruso',
    Bosnian: 'bosnio', Bulgarian: 'búlgaro', Catalan: 'catalán', Croatian: 'croata',
    Czech: 'checo', Danish: 'danés', Dutch: 'neerlandés', English: 'inglés',
    Estonian: 'estonio', Finnish: 'finés', French: 'francés', Georgian: 'georgiano',
    German: 'alemán', Greek: 'griego', Hungarian: 'húngaro', Icelandic: 'islandés',
    Irish: 'irlandés', Italian: 'italiano', Kazakh: 'kazajo', Latvian: 'letón',
    Lithuanian: 'lituano', Luxembourgish: 'luxemburgués', Maltese: 'maltés', Moldovan: 'moldavo',
    Montenegrin: 'montenegrino', Norwegian: 'noruego', Polish: 'polaco', Portuguese: 'portugués',
    Romanian: 'rumano', Russian: 'ruso', Serbian: 'serbio', Slovak: 'eslovaco',
    Slovene: 'esloveno', Spanish: 'español', Swedish: 'sueco', Turkish: 'turco',
    Ukrainian: 'ucraniano', Latin: 'latín'
  };

  const CURRENCY_ES = {
    euro: 'euro',
    'serbian dinar': 'dinar serbio',
    'bosnia and herzegovina convertible mark': 'marco convertible de Bosnia y Herzegovina',
    'north macedonian denar': 'dinar macedonio',
    'czech koruna': 'corona checa',
    'hungarian forint': 'forinto húngaro',
    'polish złoty': 'esloti polaco',
    'romanian leu': 'leu rumano',
    'bulgarian lev': 'lev búlgaro',
    'swiss franc': 'franco suizo',
    'pound sterling': 'libra esterlina',
    'icelandic króna': 'corona islandesa',
    'norwegian krone': 'corona noruega',
    'swedish krona': 'corona sueca',
    'danish krone': 'corona danesa',
    'ukrainian hryvnia': 'grivna ucraniana',
    'moldovan leu': 'leu moldavo',
    'belarusian ruble': 'rublo bielorruso',
    'russian ruble': 'rublo ruso',
    'turkish lira': 'lira turca',
    'albanian lek': 'lek albanés'
  };

  const DISPLAY_NAME_ES = {
    'North Macedonia': 'Macedonia del Norte',
    'Czechia': 'Chequia',
    'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
    'Vatican City': 'Ciudad del Vaticano',
    'United Kingdom': 'Reino Unido'
  };

  const map = L.map('map', {
    zoomControl: true,
    preferCanvas: true,
    worldCopyJump: false,
    attributionControl: true
  });

  const countryRenderer = L.canvas({ padding: 0.25 });

  map.createPane('countriesPane');
  map.createPane('capitalsPane');
  map.createPane('labelsPane');
  map.getPane('countriesPane').style.zIndex = 410;
  map.getPane('capitalsPane').style.zIndex = 620;
  map.getPane('labelsPane').style.zIndex = 630;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  map.fitBounds(EUROPE_BOUNDS, { padding: [6, 6] });

  const errorBox = document.getElementById('errorBox');
  const countryLabelsLayer = L.layerGroup([], { pane: 'labelsPane' });
  const capitalsLayer = L.layerGroup([], { pane: 'capitalsPane' });

  let geojsonLayer = null;
  let selectedLayer = null;
  let namesVisible = false;
  let capitalsVisible = false;
  let vaticanMarker = null;
  const countryInfoMap = new Map();
  const capitalMarkers = new Map();

  const defaultStyle = {
    pane: 'countriesPane',
    renderer: countryRenderer,
    color: '#2d2d2d',
    weight: 1.05,
    opacity: 1,
    lineJoin: 'round',
    lineCap: 'round',
    fillColor: '#dfe9f6',
    fillOpacity: 0.58,
    bubblingMouseEvents: false,
    smoothFactor: 0.4
  };

  const hoverStyle = {
    color: '#111',
    weight: 1.8,
    fillColor: '#ffe28a',
    fillOpacity: 0.82
  };

  const selectedStyle = {
    color: '#111',
    weight: 2,
    fillColor: '#ffbc4c',
    fillOpacity: 0.88
  };

  function showError(message) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  }

  function hideError() {
    errorBox.style.display = 'none';
  }

  function normalizeCountryName(name = '') {
    const trimmed = String(name).trim();
    const aliases = {
      'Republic of Serbia': 'Serbia',
      'Serbia': 'Serbia',
      'Macedonia': 'North Macedonia',
      'North Macedonia': 'North Macedonia',
      'Czech Republic': 'Czechia',
      'Czechia': 'Czechia',
      'Vatican': 'Vatican City',
      'Holy See': 'Vatican City',
      'Vatican City': 'Vatican City',
      'Republic of Kosovo': 'Kosovo',
      'Kosovo': 'Kosovo',
      'Bosnia and Herz.': 'Bosnia and Herzegovina',
      'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
      'UK': 'United Kingdom',
      'United Kingdom': 'United Kingdom',
      'Russian Federation': 'Russia',
      'Russia': 'Russia'
    };
    return aliases[trimmed] || trimmed;
  }

  function displayCountryName(name) {
    const normalized = normalizeCountryName(name);
    return DISPLAY_NAME_ES[normalized] || normalized;
  }

  function formatNumber(value) {
    return value == null ? 'No disponible' : new Intl.NumberFormat('es-ES').format(value);
  }

  function formatArea(value) {
    return value == null ? 'No disponible' : `${new Intl.NumberFormat('es-ES').format(value)} km²`;
  }

  function translateLanguages(languagesObj) {
    if (!languagesObj || typeof languagesObj !== 'object') return 'No disponible';
    return Object.values(languagesObj)
      .map(name => LANGUAGE_ES[name] || name.toLowerCase())
      .join(', ');
  }

  function translateCurrencies(currenciesObj) {
    if (!currenciesObj || typeof currenciesObj !== 'object') return 'No disponible';
    return Object.values(currenciesObj)
      .map(currency => {
        const raw = String(currency?.name || '').toLowerCase();
        const translated = CURRENCY_ES[raw] || currency?.name || 'Moneda';
        return currency?.symbol ? `${translated} (${currency.symbol})` : translated;
      })
      .join(', ');
  }

  function getFeatureCountryName(feature) {
    const properties = feature?.properties || {};
    return normalizeCountryName(
      properties.NAME || properties.name || properties.ADMIN || properties.admin || properties.sovereignt || ''
    );
  }

  function buildCountryPopup(info) {
    const title = displayCountryName(info.commonName || info.name || 'Sin nombre');
    const capital = info.capital || 'No disponible';
    return `
      <div class="popup-country">
        <div class="popup-title">
          ${info.flag ? `<img src="${info.flag}" alt="Bandera de ${title}">` : ''}
          <span>${title}</span>
        </div>
        <div class="popup-grid">
          <b>Capital:</b><span>${capital}</span>
          <b>Población:</b><span>${formatNumber(info.population)}</span>
          <b>Idiomas:</b><span>${translateLanguages(info.languages)}</span>
          <b>Moneda:</b><span>${translateCurrencies(info.currencies)}</span>
          <b>Área:</b><span>${formatArea(info.area)}</span>
        </div>
      </div>
    `;
  }

  function countryInfoFallback(name) {
    return {
      commonName: normalizeCountryName(name),
      name: normalizeCountryName(name),
      flag: '',
      population: null,
      languages: null,
      currencies: null,
      capital: null,
      capitalLatLng: null,
      area: null,
      cca2: null,
      cca3: null
    };
  }

  function createCountryLabel(latlng, text) {
    return L.marker(latlng, {
      pane: 'labelsPane',
      interactive: false,
      icon: L.divIcon({
        className: 'country-label',
        html: text,
        iconSize: null
      })
    });
  }

  function createCapitalLabel(latlng, text) {
    return L.marker(latlng, {
      pane: 'labelsPane',
      interactive: false,
      icon: L.divIcon({
        className: 'capital-label',
        html: text,
        iconSize: null
      })
    });
  }

  function resetSelection() {
    if (selectedLayer && geojsonLayer && selectedLayer.feature) {
      geojsonLayer.resetStyle(selectedLayer);
    }
    if (selectedLayer === vaticanMarker && vaticanMarker) {
      vaticanMarker.setStyle(vaticanMarker.defaultStyle);
    }
    selectedLayer = null;
    map.closePopup();
  }

  function setSelected(layer) {
    if (selectedLayer === layer) return;

    if (selectedLayer) {
      if (selectedLayer.feature && geojsonLayer) {
        geojsonLayer.resetStyle(selectedLayer);
      } else if (selectedLayer === vaticanMarker && vaticanMarker) {
        vaticanMarker.setStyle(vaticanMarker.defaultStyle);
      }
    }

    selectedLayer = layer;

    if (layer.feature) {
      layer.setStyle(selectedStyle);
      if (typeof layer.bringToFront === 'function') layer.bringToFront();
    } else if (layer === vaticanMarker) {
      vaticanMarker.setStyle(vaticanMarker.selectedStyle);
    }
  }

  function buildCountryInfoMap(restCountries) {
    for (const country of restCountries) {
      const common = normalizeCountryName(country?.name?.common || '');
      const official = normalizeCountryName(country?.name?.official || '');
      const entry = {
        commonName: common,
        name: official || common,
        flag: country?.flags?.png || country?.flags?.svg || '',
        population: country?.population ?? null,
        languages: country?.languages ?? null,
        currencies: country?.currencies ?? null,
        capital: Array.isArray(country?.capital) ? country.capital[0] : null,
        capitalLatLng: Array.isArray(country?.capitalInfo?.latlng) ? country.capitalInfo.latlng : null,
        area: country?.area ?? null,
        cca2: country?.cca2 ?? null,
        cca3: country?.cca3 ?? null
      };

      if (common) countryInfoMap.set(common, entry);
      if (official) countryInfoMap.set(official, entry);
    }

    if (!countryInfoMap.has('Kosovo')) {
      countryInfoMap.set('Kosovo', {
        commonName: 'Kosovo',
        name: 'Republic of Kosovo',
        flag: 'https://flagcdn.com/w320/xk.png',
        population: 1761985,
        languages: { sqi: 'Albanian', srp: 'Serbian' },
        currencies: { EUR: { name: 'Euro', symbol: '€' } },
        capital: 'Pristina',
        capitalLatLng: [42.6667, 21.1667],
        area: 10908,
        cca2: 'XK',
        cca3: 'XKX'
      });
    }

    if (!countryInfoMap.has('Vatican City')) {
      countryInfoMap.set('Vatican City', {
        commonName: 'Vatican City',
        name: 'Vatican City State',
        flag: 'https://flagcdn.com/w320/va.png',
        population: 764,
        languages: { ita: 'Italian', lat: 'Latin' },
        currencies: { EUR: { name: 'Euro', symbol: '€' } },
        capital: 'Ciudad del Vaticano',
        capitalLatLng: [41.9029, 12.4534],
        area: 0.49,
        cca2: 'VA',
        cca3: 'VAT'
      });
    }
  }

  function makeVaticanMarker() {
    const info = countryInfoMap.get('Vatican City');
    if (!info?.capitalLatLng) return;

    vaticanMarker = L.circleMarker(info.capitalLatLng, {
      pane: 'countriesPane',
      radius: 6,
      color: '#2d2d2d',
      weight: 1.1,
      fillColor: '#dfe9f6',
      fillOpacity: 0.98
    }).addTo(map);

    vaticanMarker.defaultStyle = {
      radius: 6,
      color: '#2d2d2d',
      weight: 1.1,
      fillColor: '#dfe9f6',
      fillOpacity: 0.98
    };

    vaticanMarker.hoverStyle = {
      radius: 6,
      color: '#111',
      weight: 1.8,
      fillColor: '#ffe28a',
      fillOpacity: 1
    };

    vaticanMarker.selectedStyle = {
      radius: 6,
      color: '#111',
      weight: 2,
      fillColor: '#ffbc4c',
      fillOpacity: 1
    };

    vaticanMarker.on('mouseover', () => {
      if (selectedLayer !== vaticanMarker) {
        vaticanMarker.setStyle(vaticanMarker.hoverStyle);
      }
    });

    vaticanMarker.on('mouseout', () => {
      if (selectedLayer !== vaticanMarker) {
        vaticanMarker.setStyle(vaticanMarker.defaultStyle);
      }
    });

    vaticanMarker.on('click', (e) => {
      setSelected(vaticanMarker);
      vaticanMarker.bindPopup(buildCountryPopup(info), { maxWidth: 320 }).openPopup(e.latlng);
    });
  }

  function rebuildCountryLabels() {
    countryLabelsLayer.clearLayers();
    if (!namesVisible || !geojsonLayer) return;

    geojsonLayer.eachLayer(layer => {
      const countryName = getFeatureCountryName(layer.feature);
      const center = layer.getBounds().getCenter();
      countryLabelsLayer.addLayer(createCountryLabel(center, displayCountryName(countryName)));
    });

    const vaticanInfo = countryInfoMap.get('Vatican City');
    if (vaticanInfo?.capitalLatLng) {
      countryLabelsLayer.addLayer(createCountryLabel(vaticanInfo.capitalLatLng, 'Ciudad del Vaticano'));
    }
  }

  function rebuildCapitalsLayer() {
    capitalsLayer.clearLayers();
    capitalMarkers.clear();

    for (const countryName of EUROPEAN_COUNTRIES) {
      if (countryName === 'Vatican City') continue;
      const info = countryInfoMap.get(countryName);
      const coords = info?.capitalLatLng;
      if (!info || !Array.isArray(coords) || coords.length !== 2) continue;

      const latlng = [coords[0], coords[1]];
      const marker = L.marker(latlng, {
        pane: 'capitalsPane',
        keyboard: false,
        icon: L.divIcon({
          className: '',
          html: '<div class="capital-dot"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        })
      });

      marker.on('click', (e) => {
        marker.bindPopup(buildCountryPopup(info), { maxWidth: 320 }).openPopup(e.latlng);
      });

      capitalsLayer.addLayer(marker);
      capitalsLayer.addLayer(createCapitalLabel(latlng, info.capital || displayCountryName(countryName)));
      capitalMarkers.set(countryName, marker);
    }

    const vaticanInfo = countryInfoMap.get('Vatican City');
    if (vaticanInfo?.capitalLatLng) {
      const latlng = [vaticanInfo.capitalLatLng[0], vaticanInfo.capitalLatLng[1]];
      const marker = L.marker(latlng, {
        pane: 'capitalsPane',
        keyboard: false,
        icon: L.divIcon({
          className: '',
          html: '<div class="capital-dot"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        })
      });
      marker.on('click', (e) => {
        marker.bindPopup(buildCountryPopup(vaticanInfo), { maxWidth: 320 }).openPopup(e.latlng);
      });
      capitalsLayer.addLayer(marker);
      capitalsLayer.addLayer(createCapitalLabel(latlng, vaticanInfo.capital));
    }
  }

  function onEachCountry(feature, layer) {
    const countryName = getFeatureCountryName(feature);
    const info = countryInfoMap.get(countryName) || countryInfoFallback(countryName);

    layer.on('mouseover', () => {
      if (selectedLayer !== layer) {
        layer.setStyle(hoverStyle);
      }
      layer.bringToFront();
    });

    layer.on('mouseout', () => {
      if (selectedLayer !== layer) {
        geojsonLayer.resetStyle(layer);
      }
    });

    layer.on('click', (e) => {
      setSelected(layer);
      layer.bindPopup(buildCountryPopup(info), { maxWidth: 320 }).openPopup(e.latlng);
    });
  }

  function styleFeature() {
    return { ...defaultStyle };
  }

  function buildCountriesLayer(geojson) {
    const features = geojson.features
      .filter(feature => EUROPEAN_COUNTRIES.has(getFeatureCountryName(feature)))
      .filter(feature => getFeatureCountryName(feature) !== 'Vatican City');

    geojsonLayer = L.geoJSON({
      type: 'FeatureCollection',
      features
    }, {
      style: styleFeature,
      renderer: countryRenderer,
      onEachFeature: onEachCountry,
      pane: 'countriesPane'
    }).addTo(map);
  }

  function wireButtons() {
    const resetBtn = document.getElementById('resetBtn');
    const toggleNamesBtn = document.getElementById('toggleNamesBtn');
    const toggleCapitalsBtn = document.getElementById('toggleCapitalsBtn');

    resetBtn.addEventListener('click', () => {
      resetSelection();
      map.fitBounds(EUROPE_BOUNDS, { padding: [6, 6] });
    });

    toggleNamesBtn.addEventListener('click', () => {
      namesVisible = !namesVisible;
      if (namesVisible) {
        rebuildCountryLabels();
        countryLabelsLayer.addTo(map);
        toggleNamesBtn.textContent = 'Ocultar nombres de países';
      } else {
        map.removeLayer(countryLabelsLayer);
        toggleNamesBtn.textContent = 'Mostrar nombres de países';
      }
    });

    toggleCapitalsBtn.addEventListener('click', () => {
      capitalsVisible = !capitalsVisible;
      if (capitalsVisible) {
        capitalsLayer.addTo(map);
        toggleCapitalsBtn.textContent = 'Ocultar capitales';
      } else {
        map.removeLayer(capitalsLayer);
        toggleCapitalsBtn.textContent = 'Mostrar capitales';
      }
    });
  }

  async function loadData() {
    hideError();

    const [geoResp, countriesResp] = await Promise.all([
      fetch(GEOJSON_URL),
      fetch(RESTCOUNTRIES_URL)
    ]);

    if (!geoResp.ok) throw new Error('No se pudo cargar el GeoJSON de Europa.');
    if (!countriesResp.ok) throw new Error('No se pudo cargar la información de países.');

    const [geojson, countries] = await Promise.all([
      geoResp.json(),
      countriesResp.json()
    ]);

    buildCountryInfoMap(countries);
    buildCountriesLayer(geojson);
    makeVaticanMarker();
    rebuildCapitalsLayer();
    wireButtons();
  }

  loadData().catch(err => {
    console.error(err);
    showError('Error cargando el mapa. Revisa la conexión o las URLs de datos.');
  });
})();
