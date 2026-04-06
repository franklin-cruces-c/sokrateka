(async function () {
  // 1. Inicialización
  const map = L.map("map", { zoomControl: true }).setView([20, 0], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; CARTO"
  }).addTo(map);

  let namesVisible = false;
  let geojsonLayer = null;
  const labelsLayer = L.layerGroup();

  // 2. Cargar Datos simultáneamente
  const [geoData, restData] = await Promise.all([
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json()),
    fetch("https://restcountries.com/v3.1/all?fields=name,region,cca3").then(r => r.json())
  ]);

  // 3. Crear Mapa de Referencia (Unir GeoJSON con Región)
  // Usamos el nombre del país como clave para asegurar la compatibilidad
  const countryDataMap = new Map();
  restData.forEach(c => {
    countryDataMap.set(c.name.common, c.region);
    // También guardamos por código CCA3 por si el GeoJSON usa IDs
    countryDataMap.set(c.cca3, c.region);
  });

  // 4. Función Maestra de Dibujo y Filtro
  function updateMap(filterRegion = "all") {
    // Limpiar capas previas si existen
    if (geojsonLayer) map.removeLayer(geojsonLayer);
    labelsLayer.clearLayers();

    geojsonLayer = L.geoJSON(geoData, {
      style: (feature) => {
        // Intentamos obtener la región por nombre o por ID
        const region = countryDataMap.get(feature.properties.name) || countryDataMap.get(feature.id);
        const isMatch = filterRegion === "all" || region === filterRegion;

        return {
          color: "#333",
          weight: 0.8,
          fillColor: isMatch ? "#1f6feb" : "#d1d5db", // Azul si coincide, gris si no
          fillOpacity: isMatch ? 0.5 : 0.05,          // Casi transparente si no coincide
          pane: isMatch ? 'markerPane' : 'tilePane'   // Truco visual: los resaltados van al frente
        };
      },
      onEachFeature: (feature, layer) => {
        const region = countryDataMap.get(feature.properties.name) || countryDataMap.get(feature.id);
        const isMatch = filterRegion === "all" || region === filterRegion;

        // Solo activar interacción y etiquetas si el país coincide con el filtro
        if (isMatch) {
          layer.bindPopup(`<b>${feature.properties.name}</b>`);
          
          if (namesVisible) {
            const label = L.marker(layer.getBounds().getCenter(), {
              icon: L.divIcon({ 
                className: 'country-label', 
                html: feature.properties.name,
                iconSize: [100, 20] 
              }),
              interactive: false
            });
            labelsLayer.addLayer(label);
          }
        } else {
          // Desactivar clics en países que no son del continente seleccionado
          layer.unbindPopup();
          layer.off('click');
        }
      }
    }).addTo(map);

    if (namesVisible) labelsLayer.addTo(map);
  }

  // 5. Controladores de Eventos
  document.getElementById("continentSelect").addEventListener("change", (e) => {
    const selected = e.target.value;
    updateMap(selected);

    // Zoom suave a la región seleccionada
    const bounds = {
      "Europe": [[35, -10], [70, 40]],
      "Africa": [[-35, -20], [35, 50]],
      "Americas": [[-55, -170], [75, -30]],
      "Asia": [[-10, 40], [60, 150]],
      "Oceania": [[-50, 110], [0, 180]],
      "all": [[-60, -170], [85, 190]]
    };
    
    if (bounds[selected]) {
        map.flyToBounds(bounds[selected], { padding: [20, 20] });
    }
  });

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

  // Carga inicial
  updateMap();

})();