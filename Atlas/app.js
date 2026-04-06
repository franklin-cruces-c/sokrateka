(async function () {
  const map = L.map('map', { preferCanvas: true }).setView([54, 15], 4);
  const EUROPE_BOUNDS = [[33, -25], [72, 45]];
  const errorBox = document.getElementById('errorBox');

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  map.fitBounds(EUROPE_BOUNDS);

  let selectedLayer = null;
  let namesVisible = false;
  let capitalsVisible = false;
  let geojsonLayer = null;
  let kosovoLayer = null;
  let vaticanMarker = null;

  const countryLabelsLayer = L.layerGroup();
  const capitalsLayer = L.layerGroup();
  const countryInfoMap = new Map();

  const defaultStyle = {
    color: '#333',
    weight: 1,
    fillColor: '#dfe9f6',
    fillOpacity: 0.55
  };

  const hoverStyle = {
    color: '#111',
    weight: 2,
    fillColor: '#ffe28a',
    fillOpacity: 0.78
  };

  const selectedStyle = {
    color: '#111',
    weight: 2,
    fillColor: '#ffbc4c',
    fillOpacity: 0.86
  };

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  function normalizeCountryName(name) {
    if (!name) return '';
    const aliases = {
      'Republic of Serbia': 'Serbia',
      'Serbia': 'Serbia',
      'Macedonia': 'North Macedonia',
      'North Macedonia': 'North Macedonia',
      'Czech Republic': 'Czechia',
      'Czechia': 'Czechia',
      'Russian Federation': 'Russia',
      'Russia': 'Russia',
      'Vatican': 'Vatican City',
      'Holy See': 'Vatican City',
      'Vatican City': 'Vatican City',
      'Kosovo': 'Kosovo',
      'Republic of Kosovo': 'Kosovo',
      'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
      'Bosnia and Herz.': 'Bosnia and Herzegovina',
      'United Kingdom': 'United Kingdom',
      'UK': 'United Kingdom'
    };
    return aliases[String(name).trim()] || String(name).trim();
  }

  function displayCountryName(name) {
    const n = normalizeCountryName(name);
    const aliases = {
      'North Macedonia': 'Macedonia del Norte',
      'Czechia': 'Chequia',
      'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
      'Vatican City': 'Ciudad del Vaticano',
      'United Kingdom': 'Reino Unido'
    };
    return aliases[n] || n;
  }

  function translateLanguages(languagesObj) {
    if (!languagesObj) return 'No disponible';
    const langMap = {
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
    return Object.values(languagesObj).map(v => langMap[v] || v.toLowerCase()).join(', ');
  }

  function translateCurrencies(currenciesObj) {
    if (!currenciesObj) return 'No disponible';
    const mapCur = {
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
    return Object.values(currenciesObj).map(c => {
      const raw = (c.name || '').toLowerCase();
      const translated = mapCur[raw] || c.name || 'Moneda';
      return c.symbol ? `${translated} (${c.symbol})` : translated;
    }).join(', ');
  }

  function formatNumber(num) {
    return num == null ? 'No disponible' : new Intl.NumberFormat('es-ES').format(num);
  }

  function formatArea(area) {
    return area == null ? 'No disponible' : `${new Intl.NumberFormat('es-ES').format(area)} km²`;
  }

  function buildCountryPopup(info) {
    const displayName = displayCountryName(info.commonName || info.name || 'Sin nombre');
    return `
      <div class="popup-country">
        <div class="popup-title">
          ${info.flag ? `<img src="${info.flag}" alt="Bandera de ${displayName}">` : ''}
          <span>${displayName}</span>
        </div>
        <div class="popup-grid">
          <b>Capital:</b><span>${info.capital || 'No disponible'}</span>
          <b>Población:</b><span>${formatNumber(info.population)}</span>
          <b>Idiomas:</b><span>${translateLanguages(info.languages)}</span>
          <b>Moneda:</b><span>${translateCurrencies(info.currencies)}</span>
          <b>Área:</b><span>${formatArea(info.area)}</span>
        </div>
      </div>`;
  }

  const [countriesGeoJson, restCountriesData, kosovoGeoJson] = await Promise.all([
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json').then(r => r.json()),
    fetch('https://restcountries.com/v3.1/all?fields=name,flags,population,languages,currencies,capital,capitalInfo,area,cca3').then(r => r.json()),
    fetch('https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/geojson/kosovo.geojson').then(r => r.json()).catch(() => null)
  ]).catch(() => {
    showError('No se pudieron cargar los datos del mapa.');
    throw new Error('Carga fallida');
  });

  const europeCountryNames = new Set([
    'Albania','Andorra','Austria','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria',
    'Croatia','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary',
    'Iceland','Ireland','Italy','Kosovo','Latvia','Liechtenstein','Lithuania','Luxembourg',
    'Malta','Moldova','Monaco','Montenegro','Netherlands','North Macedonia','Norway','Poland',
    'Portugal','Romania','Russia','San Marino','Serbia','Slovakia','Slovenia','Spain','Sweden',
    'Switzerland','Turkey','Ukraine','United Kingdom','Vatican City','Cyprus'
  ]);

  for (const c of restCountriesData) {
    const common = normalizeCountryName(c.name?.common || '');
    const official = normalizeCountryName(c.name?.official || '');
    const info = {
      name: official,
      commonName: common,
      flag: c.flags?.png || c.flags?.svg || '',
      population: c.population ?? null,
      languages: c.languages ?? null,
      currencies: c.currencies ?? null,
      capital: Array.isArray(c.capital) ? c.capital[0] : null,
      capitalInfo: c.capitalInfo?.latlng || null,
      area: c.area ?? null,
      cca3: c.cca3 ?? null
    };
    if (common) countryInfoMap.set(common, info);
    if (official) countryInfoMap.set(official, info);
  }

  if (!countryInfoMap.has('Kosovo')) {
    countryInfoMap.set('Kosovo', {
      name: 'Republic of Kosovo', commonName: 'Kosovo', flag: 'https://flagcdn.com/w320/xk.png',
      population: 1761985, languages: { sqi: 'Albanian', srp: 'Serbian' },
      currencies: { EUR: { name: 'Euro', symbol: '€' } }, capital: 'Pristina',
      capitalInfo: [42.6629, 21.1655], area: 10908, cca3: 'XKX'
    });
  }

  if (!countryInfoMap.has('Vatican City')) {
    countryInfoMap.set('Vatican City', {
      name: 'Vatican City State', commonName: 'Vatican City', flag: 'https://flagcdn.com/w320/va.png',
      population: 764, languages: { ita: 'Italian', lat: 'Latin' },
      currencies: { EUR: { name: 'Euro', symbol: '€' } }, capital: 'Ciudad del Vaticano',
      capitalInfo: [41.9029, 12.4534], area: 0.49, cca3: 'VAT'
    });
  }

  function featureCountryName(feature) {
    return normalizeCountryName(feature?.properties?.name || feature?.properties?.NAME || feature?.properties?.admin || feature?.properties?.ADMIN || '');
  }

  function createCountryLabel(layer, name) {
    const center = layer.getBounds().getCenter();
    return L.marker(center, {
      interactive: false,
      icon: L.divIcon({ className: 'country-label', html: displayCountryName(name), iconSize: null })
    });
  }

  function resetSelection() {
    if (selectedLayer && selectedLayer.__type === 'country' && geojsonLayer) geojsonLayer.resetStyle(selectedLayer);
    if (selectedLayer && selectedLayer.__type === 'kosovo' && kosovoLayer) kosovoLayer.resetStyle(selectedLayer);
    if (selectedLayer && selectedLayer.__type === 'vatican' && vaticanMarker) {
      vaticanMarker.setStyle({ radius: 7, color: '#333', weight: 1, fillColor: '#dfe9f6', fillOpacity: 0.95 });
    }
    selectedLayer = null;
    map.closePopup();
  }

  function setSelected(layer, kind) {
    resetSelection();
    selectedLayer = layer;
    selectedLayer.__type = kind;
    if (kind === 'vatican') {
      layer.setStyle({ radius: 7, color: '#111', weight: 2, fillColor: '#ffbc4c', fillOpacity: 1 });
    } else {
      layer.setStyle(selectedStyle);
    }
  }

  function attachCountryEvents(layer, countryName, kind) {
    layer.on({
      mouseover() {
        if (selectedLayer !== layer) layer.setStyle(hoverStyle);
        if (layer.bringToFront) layer.bringToFront();
      },
      mouseout() {
        if (selectedLayer !== layer) {
          if (kind === 'country' && geojsonLayer) geojsonLayer.resetStyle(layer);
          else if (kind === 'kosovo' && kosovoLayer) kosovoLayer.resetStyle(layer);
        }
      },
      click(e) {
        setSelected(layer, kind);
        const info = countryInfoMap.get(countryName) || { commonName: countryName, name: countryName };
        layer.bindPopup(buildCountryPopup(info), { maxWidth: 320 }).openPopup(e.latlng);
      }
    });
  }

  const features = countriesGeoJson.features.filter(f => europeCountryNames.has(featureCountryName(f)) && featureCountryName(f) !== 'Kosovo' && featureCountryName(f) !== 'Vatican City');

  geojsonLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
    style: defaultStyle,
    onEachFeature(feature, layer) {
      const name = featureCountryName(feature);
      attachCountryEvents(layer, name, 'country');
    }
  }).addTo(map);

  if (kosovoGeoJson) {
    kosovoLayer = L.geoJSON(kosovoGeoJson, {
      style: defaultStyle,
      onEachFeature(feature, layer) {
        feature.properties = feature.properties || {};
        feature.properties.name = 'Kosovo';
        attachCountryEvents(layer, 'Kosovo', 'kosovo');
      }
    }).addTo(map);
  }

  const vaticanInfo = countryInfoMap.get('Vatican City');
  if (vaticanInfo?.capitalInfo) {
    vaticanMarker = L.circleMarker(vaticanInfo.capitalInfo, {
      radius: 7, color: '#333', weight: 1, fillColor: '#dfe9f6', fillOpacity: 0.95
    }).addTo(map);
    vaticanMarker.on('mouseover', () => { if (selectedLayer !== vaticanMarker) vaticanMarker.setStyle({ color:'#111', weight:2, fillColor:'#ffe28a', fillOpacity:1 }); });
    vaticanMarker.on('mouseout', () => { if (selectedLayer !== vaticanMarker) vaticanMarker.setStyle({ color:'#333', weight:1, fillColor:'#dfe9f6', fillOpacity:.95 }); });
    vaticanMarker.on('click', (e) => {
      setSelected(vaticanMarker, 'vatican');
      vaticanMarker.bindPopup(buildCountryPopup(vaticanInfo), { maxWidth: 320 }).openPopup(e.latlng);
    });
  }

  function rebuildCountryLabels() {
    countryLabelsLayer.clearLayers();
    geojsonLayer.eachLayer(layer => {
      countryLabelsLayer.addLayer(createCountryLabel(layer, featureCountryName(layer.feature)));
    });
    if (kosovoLayer) {
      kosovoLayer.eachLayer(layer => countryLabelsLayer.addLayer(createCountryLabel(layer, 'Kosovo')));
    }
    if (vaticanInfo?.capitalInfo) {
      countryLabelsLayer.addLayer(L.marker(vaticanInfo.capitalInfo, {
        interactive:false,
        icon: L.divIcon({ className:'country-label', html:'Ciudad del Vaticano', iconSize:null })
      }));
    }
  }

  function buildCapitalsLayer() {
    capitalsLayer.clearLayers();
    for (const [countryName, info] of countryInfoMap.entries()) {
      if (!europeCountryNames.has(countryName)) continue;
      if (!info.capitalInfo || !Array.isArray(info.capitalInfo) || info.capitalInfo.length !== 2) continue;
      const capitalName = info.capital || 'Capital';
      const [lat, lng] = info.capitalInfo;
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({ className:'', html:'<div class="capital-dot"></div>', iconSize:[10,10], iconAnchor:[5,5] })
      });
      marker.on('click', e => {
        marker.bindPopup(buildCountryPopup(info), { maxWidth: 320 }).openPopup(e.latlng);
      });
      capitalsLayer.addLayer(marker);
      capitalsLayer.addLayer(L.marker([lat, lng], {
        interactive:false,
        icon:L.divIcon({ className:'capital-label', html:capitalName, iconSize:null })
      }));
    }
  }

  buildCapitalsLayer();

  document.getElementById('resetBtn').addEventListener('click', () => {
    resetSelection();
    map.fitBounds(EUROPE_BOUNDS);
  });

  document.getElementById('toggleNamesBtn').addEventListener('click', (e) => {
    namesVisible = !namesVisible;
    if (namesVisible) {
      rebuildCountryLabels();
      countryLabelsLayer.addTo(map);
      e.target.textContent = 'Ocultar nombres de países';
    } else {
      map.removeLayer(countryLabelsLayer);
      e.target.textContent = 'Mostrar nombres de países';
    }
  });

  document.getElementById('toggleCapitalsBtn').addEventListener('click', (e) => {
    capitalsVisible = !capitalsVisible;
    if (capitalsVisible) {
      capitalsLayer.addTo(map);
      e.target.textContent = 'Ocultar capitales';
    } else {
      map.removeLayer(capitalsLayer);
      e.target.textContent = 'Mostrar capitales';
    }
  });
})();
