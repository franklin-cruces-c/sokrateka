(async function () {
    // 1. MANEJO DEL MENÚ (Priorizado al inicio)
    const menuBtn = document.getElementById("toggleMenu");
    const container = document.getElementById("controlsContainer");

    if (menuBtn && container) {
        menuBtn.addEventListener("click", function() {
            container.classList.toggle("collapsed");
            if (container.classList.contains("collapsed")) {
                menuBtn.textContent = "❯ Mostrar";
            } else {
                menuBtn.textContent = "▼ Cerrar";
            }
        });
    }

    // 2. INICIALIZACIÓN DEL MAPA
    // Usamos el fondo de CARTO (Positron No Labels) para evitar duplicar nombres
    const map = L.map("map", { zoomControl: true }).setView([20, 0], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; CARTO"
    }).addTo(map);

    let namesVisible = false;
    let geojsonLayer = null;
    const labelsLayer = L.layerGroup().addTo(map);
    const countryDataMap = new Map();

    // 3. CARGA DE DATOS (GeoJSON + API RestCountries)
    try {
        const [geoRes, restRes] = await Promise.all([
            fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"),
            fetch("https://restcountries.com/v3.1/all?fields=name,region,cca3,flags,population,languages")
        ]);
        const geoData = await geoRes.json();
        const restData = await restRes.json();

        // Procesar datos de RestCountries
        restData.forEach(c => {
            const info = {
                name: c.name.common,
                region: c.region,
                flag: c.flags.png,
                pop: c.population.toLocaleString('es-ES'),
                // Idiomas oficiales
                langs: c.languages ? Object.values(c.languages).join(", ") : "N/A"
            };
            countryDataMap.set(c.name.common, info);
            countryDataMap.set(c.cca3, info);
        });

        // Función para construir popup unificado
        function buildPopup(info) {
            return `
                <div class="popup-card">
                    <img src="${info.flag}">
                    <b>${info.name}</b>
                    <span><b>Población:</b> ${info.pop}</span>
                    <span><b>Idiomas:</b> ${info.langs}</span>
                </div>`;
        }

        // --- CORRECCIÓN DE ETIQUETAS (Rusia, Noruega) ---
        // Coordenadas manuales y precisas para el texto
        const specialLabelCoords = {
            "Russia": [60, 95],     // Un punto central en Siberia
            "Norway": [62, 9]      // Centro geográfico más estable
            // Puedes añadir más aquí, ej: "United Kingdom": [54, -2]
        };

        // 4. FUNCIÓN PARA DIBUJAR Y FILTRAR (Con efecto hover)
        function updateMap(filter = "all") {
            if (geojsonLayer) map.removeLayer(geojsonLayer);
            labelsLayer.clearLayers();

            geojsonLayer = L.geoJSON(geoData, {
                style: (f) => {
                    const info = countryDataMap.get(f.properties.name) || countryDataMap.get(f.id);
                    const match = filter === "all" || (info && info.region === filter);
                    return {
                        fillColor: match ? "#1f6feb" : "#cccccc",
                        fillOpacity: match ? 0.6 : 0.05,
                        color: "white", weight: 1
                    };
                },
                onEachFeature: (f, layer) => {
                    const info = countryDataMap.get(f.properties.name) || countryDataMap.get(f.id);
                    const match = filter === "all" || (info && info.region === filter);

                    if (match && info) {
                        layer.bindPopup(buildPopup(info));

                        // Efecto hover (Cambio de color al pasar mouse)
                        layer.on('mouseover', function () {
                            this.setStyle({ fillColor: "#ffcc00", fillOpacity: 0.9 });
                        });
                        layer.on('mouseout', function () {
                            geojsonLayer.resetStyle(this);
                        });

                        // Lógica de etiquetas de texto
                        if (namesVisible) {
                            let labelPos;
                            const countryName = f.properties.name;

                            // Si el país tiene coordenadas manuales, úsalas
                            if (specialLabelCoords[countryName]) {
                                labelPos = specialLabelCoords[countryName];
                            } else {
                                // Si no, usa el centroide automático (funciona para la mayoría)
                                try {
                                    labelPos = layer.getBounds().getCenter();
                                } catch (e) {
                                    // Para países minúsculos sin polígono claro
                                    return;
                                }
                            }

                            // Crear etiqueta
                            L.marker(labelPos, {
                                icon: L.divIcon({ 
                                    className: 'country-label', 
                                    html: info.name, 
                                    iconSize: [100, 20] 
                                }),
                                interactive: false
                            }).addTo(labelsLayer);
                        }
                    }
                }
            }).addTo(map);
        }

        // 5. CONTROLADORES DE EVENTOS
        document.getElementById("continentSelect").onchange = (e) => {
            const val = e.target.value;
            updateMap(val);
            // Zooms por defecto
            const views = { "Europe": [[50, 15], 4], "Africa": [[0, 20], 3], "Americas": [[10, -80], 3], "Asia": [[30, 80], 3], "Oceania": [[-25, 135], 4], "all": [[20, 0], 2] };
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
        console.error("Error crítico:", err);
    }
})();