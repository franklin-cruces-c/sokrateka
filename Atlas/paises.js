(async function () {
  const map = L.map("map", { zoomControl: true }).setView([20, 0], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; CARTO"
  }).addTo(map);

  let namesVisible = false;
  let geojsonLayer = null;
  const labelsLayer = L.layerGroup().addTo(map);

  let geoData, restCountries;

  // 1. Carga de datos con manejo de errores
  try {
    const responses = await Promise.all([
      fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"),
      fetch("https://restcountries.com/v3.1/all?fields=name,region,cca3,flags,population,area,languages,currencies")
    ]);
    geoData = await responses[0].json();
    restCountries = await responses[1].json();
  } catch (err) {
    console.error("Error al cargar datos:", err);
    return;
  }

  // 2. Mapa de datos extendido
  const countryInfoMap = new Map();
  restCountries.forEach(c => {
    const data = {
      name: c.name.common,
      region: c.region,
      flag: c.flags.png,
      pop: c.population.toLocaleString('es-ES'),
      area: c.area ? c.area.toLocaleString('es-ES') + " km²" : "N/A",
      langs: c.languages ? Object.values(c.languages).join(", ") : "N/A",
      curr: c.currencies ? Object.values(c.currencies).map(curr => curr.name).join(", ") : "N/A"
    };
    countryInfoMap.set(c.name.common, data);
    countryInfoMap.set(c.cca3, data);
  });

  // 3. Función para construir el Popup con estilo
  function buildPopup(info) {
    return `
      <div class="popup-country" style="text-align: center; min-width: 180px;">
        <img src="${info.flag}" style="width: 50px; border: 1px solid #ccc; margin-bottom: 8px;">
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${info.name}</div>
        <div style="text-align: left; font-size: 12px;">
          <b>Población:</b> ${info.pop}<br>
          <b>Área:</b> ${info.area}<br>
          <b>Idiomas:</b> ${info.langs}<br>
          <b>Moneda:</b> ${info.curr}
        </div>
      </div>`;
  }

  // 4. Función de actualización del mapa
  function updateMap(filter = "all") {
    if (geojsonLayer) map.removeLayer(geojsonLayer);
    labelsLayer.clearLayers();

    geojsonLayer = L.geoJSON(geoData, {
      style: (feature) => {
        const info = countryInfoMap.get(feature.properties.name) || countryInfoMap.get(feature.id);
        const match = filter === "all" || (info && info.region === filter);

        return {
          fillColor: match ? "#1f6feb" : "#cccccc",
          fillOpacity: match ? 0.6 : 0.05,
          color: "white",
          weight: 1
        };
      },
      onEachFeature: (feature, layer) => {
        const info = countryInfoMap.get(feature.properties.name) || countryInfoMap.get(feature.id);
        const match = filter === "all" || (info && info.region === filter);

        if (match && info) {
          layer.bindPopup(buildPopup(info));
          
          if (namesVisible) {
            L.marker(layer.getBounds().getCenter(), {
              icon: L.divIcon({ 
                className: 'country-label', 
                html: info.name,
                iconSize: [100, 20] 
              }),
              interactive: false
            }).addTo(labelsLayer);
          }
        } else {
          layer.unbindPopup();
        }
      }
    }).addTo(map);
  }

  // 5. Eventos
  const selector = document.getElementById("continentSelect");
  
  selector.onchange = function(e) {
    const val = e.target.value;
    updateMap(val);

    const points = {
      "Europe": [[50, 15], 4],
      "Africa": [[0, 20], 3],
      "Americas": [[10, -80], 3],
      "Asia": [[30, 80], 3],
      "Oceania": [[-25, 135], 4],
      "all": [[20, 0], 2]
    };
    if(points[val]) map.flyTo(points[val][0], points[val][1]);
  };

  document.getElementById("toggleNamesBtn").onclick = (e) => {
    namesVisible = !namesVisible;
    e.target.textContent = namesVisible ? "Ocultar nombres" : "Mostrar nombres";
    updateMap(selector.value);
  };

  document.getElementById("resetBtn").onclick = () => {
    selector.value = "all";
    updateMap("all");
    map.flyTo([20, 0], 2);
  };

  updateMap();
})();