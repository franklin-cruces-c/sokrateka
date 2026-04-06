(async function () {
    // 1. CONFIGURACIÓN DEL MENÚ COLAPSABLE
    const menuBtn = document.getElementById("toggleMenu");
    const container = document.getElementById("controlsContainer");

    if (menuBtn && container) {
        menuBtn.addEventListener("click", function() {
            container.classList.toggle("collapsed");
            menuBtn.textContent = container.classList.contains("collapsed") ? "❯ Mostrar" : "▼ Cerrar";
        });
    }

    // 2. INICIALIZACIÓN DEL MAPA
    const map = L.map("map", { 
        zoomControl: true,
        attributionControl: false 
    }).setView([20, 0], 2);

    // Capa base sin etiquetas para no duplicar nombres
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO"
    }).addTo(map);

    let namesVisible = false;
    let geojsonLayer = null;
    const labelsLayer = L.layerGroup().addTo(map);
    const countryDataMap = new Map();

    // 3. CARGA DE DATOS (GeoJSON + API RestCountries)
    try {
        const [geoRes, restRes] = await Promise.all([
            fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"),
            fetch("https://restcountries.com/v3.1/all?fields=name,region,cca3,flags,population,area")
        ]);

        const geoData = await geoRes.json();
        const restData = await restRes.json();

        // Procesar datos de la API para acceso rápido
        restData.forEach(c => {
            const info = {
                name: c.name.common,
                region: c.region,
                flag: c.flags.png,
                pop: c.population.toLocaleString('es-ES'),
                area: c.area ? c.area.toLocaleString('es-ES') + " km²" : "N/A"
            };
            countryDataMap.set(c.name.common, info);
            countryDataMap.set(c.cca3, info);
        });

        // 4. FUNCIÓN PARA DIBUJAR Y FILTRAR
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
                        color: "white",
                        weight: 1
                    };
                },
                onEachFeature: (feature, layer) => {
                    const info = countryDataMap.get(feature.properties.name) || countryDataMap.get(feature.id);
                    const match = filter === "all" || (info && info.region === filter);

                    if (match && info) {
                        // Popup con info recuperada
                        const content = `
                            <div class="popup-card">
                                <img src="${info.flag}">
                                <br><b>${info.name}</b><br>
                                <small>Pob: ${info.pop}<br>Área: ${info.area}</small>
                            </div>`;
                        layer.bindPopup(content);

                        // Si los nombres están activos, crear etiqueta
                        if (namesVisible) {
                            const center = layer.getBounds().getCenter();
                            L.marker(center, {
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

        // 5. CONTROLADORES DE EVENTOS (Botones internos)
        document.getElementById("continentSelect").onchange = (e) => {
            const val = e.target.value;
            updateMap(val);
            
            // Zoom automático por continente
            const views = {
                "Europe": [[50, 15], 4],
                "Africa": [[0, 20], 3],
                "Americas": [[10, -80], 3],
                "Asia": [[30, 80], 3],
                "Oceania": [[-25, 135], 4],
                "all": [[20, 0], 2]
            };
            if (views[val]) map.flyTo(views[val][0], views[val][1]);
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

        // Dibujo inicial
        updateMap();

    } catch (err) {
        console.error("Error al inicializar el mapa:", err);
    }
})();