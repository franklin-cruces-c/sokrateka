(async function () {
  // Inicializar mapa en una vista global
  const map = L.map("map", { zoomControl: true }).setView([20, 0], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; CARTO"
  }).addTo(map);

  let namesVisible = false;
  let geojsonLayer;
  const labelsLayer = L.layerGroup();

  // 1. Cargar Datos
  const [geoData, restData] = await Promise.all([
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json()),
    fetch("https://restcountries.com/v3.1/all?fields=name,flags,region,cca3").then(r => r.json())
  ]);

  // Crear un mapa de información por código de país (CCA3) para filtrar rápido
  const countryInfo = new Map();
  restData.forEach(c => countryInfo.set(c.cca3, c));

  // 2. Función para dibujar/filtrar
  function drawMap(continent = "all") {
    if (geojsonLayer) map.removeLayer(geojsonLayer);
    labelsLayer.clearLayers();

    geojsonLayer = L.geoJSON(geoData, {
      style: (feature) => {
        const info = countryInfo.get(feature.id);
        const isMatch = continent === "all" || (info && info.region === continent);
        return {
          color: "#333",
          weight: 0.5,
          fillColor: isMatch ? "#3498db" : "#d1d5db",
          fillOpacity: isMatch ? 0.6 : 0.1
        };
      },
      onEachFeature: (feature, layer) => {
        const info = countryInfo.get(feature.id);
        const isMatch = continent === "all" || (info && info.region === continent);

        if (isMatch && info) {
          layer.bindPopup(`<div class="popup-country"><img src="${info.flags.png}"><br><b>${info.name.common}</b></div>`);
          
          if (namesVisible) {
            const label = L.marker(layer.getBounds().getCenter(), {
              icon: L.divIcon({ className: 'country-label', html: info.name.common, iconSize: [100, 20] })
            });
            labelsLayer.addLayer(label);
          }
        }
      }
    }).addTo(map);

    if (namesVisible) labelsLayer.addTo(map);
  }

  // 3. Eventos de los controles
  document.getElementById("continentSelect").onchange = (e) => {
    const val = e.target.value;
    drawMap(val);
    
    // Zoom automático según el continente
    const views = {
      "Europe": [[54, 15], 4],
      "Africa": [[0, 20], 3],
      "Americas": [[10, -80], 3],
      "Asia": [[30, 100], 3],
      "Oceania": [[-25, 135], 4],
      "all": [[20, 0], 2]
    };
    map.flyTo(views[val][0], views[val][1]);
  };

  document.getElementById("toggleNamesBtn").onclick = (e) => {
    namesVisible = !namesVisible;
    e.target.textContent = namesVisible ? "Ocultar nombres" : "Mostrar nombres";
    drawMap(document.getElementById("continentSelect").value);
  };

  document.getElementById("resetBtn").onclick = () => {
    document.getElementById("continentSelect").value = "all";
    drawMap("all");
    map.flyTo([20, 0], 2);
  };

  // Dibujo inicial
  drawMap();
})();