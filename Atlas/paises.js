(async function () {
  const map = L.map("map", { zoomControl: true }).setView([20, 0], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; CARTO"
  }).addTo(map);

  let namesVisible = false;
  let geojsonLayer = null;
  const labelsLayer = L.layerGroup().addTo(map);
  const countryDataMap = new Map();

  // 1. Carga de datos
  try {
    const [geoRes, restRes] = await Promise.all([
      fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"),
      fetch("https://restcountries.com/v3.1/all?fields=name,region,cca3,flags,population,area,languages,currencies")
    ]);
    const geoData = await geoRes.json();
    const restData = await restRes.json();

    restData.forEach(c => {
      const info = {
        name: c.name.common,
        region: c.region,
        flag: c.flags.png,
        pop: c.population.toLocaleString('es-ES'),
        area: c.area ? c.area.toLocaleString('es-ES') + " km²" : "N/A",
        langs: c.languages ? Object.values(c.languages).join(", ") : "N/A"
      };
      countryDataMap.set(c.name.common, info);
      countryDataMap.set(c.cca3, info);
    });

    // Función para dibujar
    function updateMap(filter = "all") {
      if (geojsonLayer) map.removeLayer(geojsonLayer);
      labelsLayer.clearLayers();

      geojsonLayer = L.geoJSON(geoData, {
        style: (feature) => {
          const info = countryDataMap.get(feature.properties.name) || countryDataMap.get(feature.id);
          const match = filter === "all" || (info && info.region === filter);
          return {
            fillColor: match ? "#1f6feb" : "#cccccc",
            fillOpacity: match ? 0.6 : 0.05,
            color: "white", weight: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const info = countryDataMap.get(feature.properties.name) || countryDataMap.get(feature.id);
          const match = filter === "all" || (info && info.region === filter);
          if (match && info) {
            layer.bindPopup(`<div style="text-align:center"><img src="${info.flag}" width="40"><br><b>${info.name}</b><br>Pob: ${info.pop}</div>`);
            if (namesVisible) {
              L.marker(layer.getBounds().getCenter(), {
                icon: L.divIcon({ className: 'country-label', html: info.name, iconSize: [100, 20] }),
                interactive: false
              }).addTo(labelsLayer);
            }
          }
        }
      }).addTo(map);
    }

    // Eventos Controles
    document.getElementById("continentSelect").onchange = (e) => {
      updateMap(e.target.value);
      const views = { "Europe": [[50, 15], 4], "Africa": [[0, 20], 3], "Americas": [[10, -80], 3], "Asia": [[30, 80], 3], "Oceania": [[-25, 135], 4], "all": [[20, 0], 2] };
      if (views[e.target.value]) map.flyTo(views[e.target.value][0], views[e.target.value][1]);
    };

    document.getElementById("toggleNamesBtn").onclick = (e) => {
      namesVisible = !namesVisible;
      e.target.textContent = namesVisible ? "Ocultar nombres" : "Mostrar nombres";
      updateMap(document.getElementById("continentSelect").value);
    };

    document.getElementById("resetBtn").onclick = () => {
      document.getElementById("continentSelect").value = "all";
      updateMap("all");
      map.flyTo([20, 0], 2);
    };

    // Lógica del Menú Colapsable
    document.getElementById("toggleMenu").onclick = function() {
      const container = document.getElementById("controlsContainer");
      container.classList.toggle("collapsed");
      this.textContent = container.classList.contains("collapsed") ? "❯ Mostrar" : "▼ Menú";
    };

    updateMap(); // Inicializar

  } catch (err) {
    console.error("Error crítico:", err);
  }
})();