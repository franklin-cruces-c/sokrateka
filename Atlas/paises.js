(async function () {
  const map = L.map("map", { zoomControl: true, preferCanvas: true }).setView([54, 15], 4);

  // SOLUCIÓN: Usamos "Positron No Labels" de CartoDB para evitar textos duplicados y verde.
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
  }).addTo(map);

  const EUROPE_BOUNDS = [[33, -25], [72, 45]];
  map.fitBounds(EUROPE_BOUNDS);

  let namesVisible = false;
  let capitalsVisible = false;
  const countryLabelsLayer = L.layerGroup();
  const capitalsLayer = L.layerGroup();

  // Lista de países pequeños que forzaremos en el mapa
  const microstates = [
    { id: "VAT", name: "Vatican City", display: "Vaticano", latlng: [41.9029, 12.4534] },
    { id: "SMR", name: "San Marino", display: "San Marino", latlng: [43.9424, 12.4578] },
    { id: "LIE", name: "Liechtenstein", display: "Liechtenstein", latlng: [47.1410, 9.5209] },
    { id: "AND", name: "Andorra", display: "Andorra", latlng: [42.5063, 1.5218] },
    { id: "MCO", name: "Monaco", display: "Mónaco", latlng: [43.7384, 7.4246] }
  ];

  // Carga de datos
  const [geoData, restData] = await Promise.all([
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json()),
    fetch("https://restcountries.com/v3.1/all?fields=name,flags,population,capital,area,latlng").then(r => r.json())
  ]);

  const countryMap = new Map();
  restData.forEach(c => countryMap.set(c.name.common, c));

  function getPopupContent(name) {
    const info = countryMap.get(name) || { name: { common: name }, population: 0, flags: { png: "" } };
    return `<div class="popup-country">
              <div class="title"><img src="${info.flags.png}"> ${info.name.common}</div>
              <b>Población:</b> ${info.population.toLocaleString()}<br>
              <b>Área:</b> ${info.area ? info.area.toLocaleString() : '?'} km²
            </div>`;
  }

  // Dibujar países normales
  const geojsonLayer = L.geoJSON(geoData, {
    style: { color: "#333", weight: 1, fillColor: "#6baed6", fillOpacity: 0.3 },
    onEachFeature: (feature, layer) => {
      layer.on({
        mouseover: () => layer.setStyle({ fillOpacity: 0.6, fillColor: "#ffd54f" }),
        mouseout: () => geojsonLayer.resetStyle(layer),
        click: (e) => layer.bindPopup(getPopupContent(feature.properties.name)).openPopup(e.latlng)
      });
    }
  }).addTo(map);

  // Dibujar Microestados (San Marino, etc)
  microstates.forEach(ms => {
    const dot = L.circleMarker(ms.latlng, { radius: 6, fillColor: "#e67e22", color: "#fff", weight: 1, fillOpacity: 0.9 }).addTo(map);
    dot.on('click', (e) => dot.bindPopup(getPopupContent(ms.name)).openPopup());
    
    // Etiqueta para país pequeño
    countryLabelsLayer.addLayer(L.marker(ms.latlng, {
        icon: L.divIcon({ className: "country-label", html: ms.display })
    }));
  });

  // Botones
  document.getElementById("resetBtn").onclick = () => map.fitBounds(EUROPE_BOUNDS);
  
  document.getElementById("toggleNamesBtn").onclick = (e) => {
    namesVisible = !namesVisible;
    if (namesVisible) {
        geojsonLayer.eachLayer(l => {
            countryLabelsLayer.addLayer(L.marker(l.getBounds().getCenter(), {
                icon: L.divIcon({ className: "country-label", html: l.feature.properties.name })
            }));
        });
        countryLabelsLayer.addTo(map);
        e.target.textContent = "Ocultar nombres";
    } else {
        map.removeLayer(countryLabelsLayer);
        countryLabelsLayer.clearLayers();
        e.target.textContent = "Mostrar nombres";
    }
  };
})();