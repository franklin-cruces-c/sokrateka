(async function () {
  const map = L.map("map", {
    zoomControl: true,
    preferCanvas: true
  }).setView([54, 15], 4);

  // FONDO GRIS LIMPIO: No tiene textos, no tiene verde.
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
  }).addTo(map);

  const EUROPE_BOUNDS = [[33, -25], [72, 45]];
  map.fitBounds(EUROPE_BOUNDS);

  // 1. LISTA DE PAÍSES PEQUEÑOS (Microestados)
  // Los añadimos manualmente porque el GeoJSON no los suele pintar
  const microstates = [
    { name: "Vatican City", latlng: [41.9029, 12.4534], display: "Vaticano" },
    { name: "San Marino", latlng: [43.9424, 12.4578], display: "San Marino" },
    { name: "Liechtenstein", latlng: [47.1410, 9.5209], display: "Liechtenstein" },
    { name: "Andorra", latlng: [42.5063, 1.5218], display: "Andorra" },
    { name: "Monaco", latlng: [43.7384, 7.4246], display: "Mónaco" },
    { name: "Malta", latlng: [35.8989, 14.5146], display: "Malta" }
  ];

  // Estilo de los países
  const defaultStyle = { color: "#333", weight: 1, fillColor: "#6baed6", fillOpacity: 0.35 };
  const hoverStyle = { color: "#000", weight: 2, fillColor: "#ffd54f", fillOpacity: 0.65 };

  // 2. CARGAR INFORMACIÓN DE LA API (Banderas, población, etc.)
  const restData = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,population,capital").then(r => r.json());
  const countryInfoMap = new Map();
  restData.forEach(c => countryInfoMap.set(c.name.common, c));

  function getPopup(name) {
    const info = countryInfoMap.get(name);
    if (!info) return `<b>${name}</b>`;
    return `
      <div style="text-align:center">
        <img src="${info.flags.png}" width="50" style="border:1px solid #ccc"><br>
        <b>${info.name.common}</b><br>
        Pop: ${info.population.toLocaleString()}
      </div>`;
  }

  // 3. CARGAR EL GEOJSON (Fronteras)
  const geoData = await fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json());

  const geojsonLayer = L.geoJSON(geoData, {
    style: defaultStyle,
    onEachFeature: (feature, layer) => {
      layer.on({
        mouseover: () => layer.setStyle(hoverStyle),
        mouseout: () => geojsonLayer.resetStyle(layer),
        click: (e) => layer.bindPopup(getPopup(feature.properties.name)).openPopup(e.latlng)
      });
    }
  }).addTo(map);

  // 4. DIBUJAR LOS PAÍSES PEQUEÑOS COMO PUNTOS
  microstates.forEach(ms => {
    const marker = L.circleMarker(ms.latlng, {
      radius: 6,
      fillColor: "#e67e22",
      color: "#fff",
      weight: 1,
      fillOpacity: 0.9
    }).addTo(map);

    marker.bindTooltip(ms.display, { permanent: false });
    marker.on("click", (e) => marker.bindPopup(getPopup(ms.name)).openPopup());
  });

  // Botón Reset
  document.getElementById("resetBtn").addEventListener("click", () => {
    map.fitBounds(EUROPE_BOUNDS);
  });
})();