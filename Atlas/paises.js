(async function () {
  // 1. Limpiamos cualquier rastro previo del mapa si existiera
  const mapContainer = L.DomUtil.get('map');
  if (mapContainer && mapContainer._leaflet_id) {
    mapContainer._leaflet_id = null;
  }

  const map = L.map("map", {
    zoomControl: true,
    preferCanvas: true,
    minZoom: 3,
    maxZoom: 10
  }).setView([54, 15], 4);

  // 2. CAPA DE FONDO: Usamos "Positron No Labels" para que el fondo sea mudo.
  // Esto evita que al hacer zoom aparezcan textos verdes o nombres en otros idiomas.
  const baseLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  const EUROPE_BOUNDS = [[33, -25], [72, 45]];
  map.fitBounds(EUROPE_BOUNDS);

  // 3. ESTILOS
  const styles = {
    default: { color: "#334155", weight: 1, fillColor: "#94a3b8", fillOpacity: 0.4 },
    hover: { color: "#000", weight: 2, fillColor: "#3b82f6", fillOpacity: 0.6 },
    selected: { color: "#1e40af", weight: 3, fillColor: "#2563eb", fillOpacity: 0.7 }
  };

  // 4. MICROESTADOS (Coordenadas exactas para que no desaparezcan)
  const microstates = [
    { name: "Vatican City", latlng: [41.9029, 12.4534], displayName: "Vaticano" },
    { name: "San Marino", latlng: [43.9424, 12.4578], displayName: "San Marino" },
    { name: "Liechtenstein", latlng: [47.1410, 9.5209], displayName: "Liechtenstein" },
    { name: "Andorra", latlng: [42.5063, 1.5218], displayName: "Andorra" },
    { name: "Monaco", latlng: [43.7384, 7.4246], displayName: "Mónaco" },
    { name: "Malta", latlng: [35.8989, 14.5146], displayName: "Malta" }
  ];

  // 5. CARGA DE DATOS
  try {
    const [geoData, restData] = await Promise.all([
      fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json()),
      fetch("https://restcountries.com/v3.1/all?fields=name,flags,population,languages,currencies,capital,area").then(r => r.json())
    ]);

    const countryInfoMap = new Map();
    restData.forEach(c => countryInfoMap.set(c.name.common, c));

    // 6. DIBUJAR PAÍSES
    const geojsonLayer = L.geoJSON(geoData, {
      style: styles.default,
      onEachFeature: (feature, layer) => {
        layer.on({
          mouseover: () => { layer.setStyle(styles.hover); layer.bringToFront(); },
          mouseout: () => { if (layer !== selectedLayer) geojsonLayer.resetStyle(layer); },
          click: (e) => {
            if (selectedLayer) geojsonLayer.resetStyle(selectedLayer);
            selectedLayer = layer;
            layer.setStyle(styles.selected);
            const info = countryInfoMap.get(feature.properties.name);
            if(info) layer.bindPopup(`<b>${info.name.common}</b><br>Cap: ${info.capital}`).openPopup();
          }
        });
      }
    }).addTo(map);

    let selectedLayer = null;

    // 7. DIBUJAR MICROESTADOS (Como puntos fijos)
    microstates.forEach(state => {
      const dot = L.circleMarker(state.latlng, {
        radius: 5,
        fillColor: "#ef4444",
        color: "#fff",
        weight: 1,
        fillOpacity: 1
      }).addTo(map);

      dot.bindTooltip(state.displayName, { permanent: false, direction: 'top' });
    });

  } catch (error) {
    console.error("Error cargando el mapa:", error);
  }

  // BOTÓN RESET
  document.getElementById("resetBtn").onclick = () => map.fitBounds(EUROPE_BOUNDS);
})();