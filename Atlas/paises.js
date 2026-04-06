(async function () {
  // 1. Configuración del mapa con un estilo "Limpio" (Sin etiquetas de fondo)
  const map = L.map("map", {
    zoomControl: true,
    preferCanvas: true
  }).setView([54, 15], 4);

  // Usamos CartoDB Positron (sin etiquetas) para evitar textos duplicados y el color verde
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  const EUROPE_BOUNDS = [[33, -25], [72, 45]];
  map.fitBounds(EUROPE_BOUNDS);

  // --- DATOS DE MICROESTADOS (Para que no falte ninguno) ---
  const microstates = [
    { name: "Vatican City", latlng: [41.9029, 12.4534], displayName: "Ciudad del Vaticano" },
    { name: "San Marino", latlng: [43.9424, 12.4578], displayName: "San Marino" },
    { name: "Liechtenstein", latlng: [47.1410, 9.5209], displayName: "Liechtenstein" },
    { name: "Andorra", latlng: [42.5063, 1.5218], displayName: "Andorra" },
    { name: "Monaco", latlng: [43.7384, 7.4246], displayName: "Mónaco" }
  ];

  // Estilos
  const defaultStyle = { color: "#4a90e2", weight: 1, fillColor: "#6baed6", fillOpacity: 0.4 };
  const hoverStyle = { color: "#000", weight: 2, fillColor: "#ffd54f", fillOpacity: 0.7 };

  // --- CARGA DE DATOS ---
  const [countriesGeoJson, restCountriesData] = await Promise.all([
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json()),
    fetch("https://restcountries.com/v3.1/all?fields=name,flags,population,languages,currencies,capital,area,latlng").then(r => r.json())
  ]);

  // Mapa de información de países
  const countryInfoMap = new Map();
  restCountriesData.forEach(c => {
    countryInfoMap.set(c.name.common, c);
    countryInfoMap.set(c.name.official, c);
  });

  // Función para crear Popups (Reutilizando tu lógica anterior)
  function getPopupContent(name) {
    const info = countryInfoMap.get(name);
    if (!info) return `<b>${name}</b><br>Datos no encontrados.`;
    
    return `
      <div class="popup-country">
        <div class="title">
          <img src="${info.flags.png}" alt="Bandera">
          <span>${info.name.common}</span>
        </div>
        <div><strong>Población:</strong> ${info.population.toLocaleString()}</div>
        <div><strong>Capital:</strong> ${info.capital ? info.capital[0] : 'N/A'}</div>
      </div>`;
  }

  // --- DIBUJAR PAÍSES GRANDES ---
  const geojsonLayer = L.geoJSON(countriesGeoJson, {
    style: defaultStyle,
    filter: (feature) => {
      // Filtramos para que solo salgan países europeos (puedes ampliar esta lista)
      const name = feature.properties.name;
      const europeList = ["Spain", "France", "Germany", "Italy", "Poland", "Ukraine", "Norway", "Sweden", "United Kingdom", "Ireland", "Portugal", "Greece", "Austria", "Switzerland", "Belgium", "Netherlands"]; 
      return europeList.includes(name);
    },
    onEachFeature: (feature, layer) => {
      layer.on({
        mouseover: () => layer.setStyle(hoverStyle),
        mouseout: () => geojsonLayer.resetStyle(layer),
        click: (e) => layer.bindPopup(getPopupContent(feature.properties.name)).openPopup()
      });
    }
  }).addTo(map);

  // --- DIBUJAR MICROESTADOS (Como círculos visibles) ---
  microstates.forEach(state => {
    const marker = L.circleMarker(state.latlng, {
      radius: 6,
      fillColor: "#ff9800",
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map);

    marker.on('click', (e) => {
      marker.bindPopup(getPopupContent(state.name)).openPopup();
    });

    // Añadir nombre permanente si quieres
    L.marker(state.latlng, {
      icon: L.divIcon({
        className: 'country-label',
        html: state.displayName,
        iconSize: [80, 20],
        iconAnchor: [40, -10]
      }),
      interactive: false
    }).addTo(map);
  });

})();