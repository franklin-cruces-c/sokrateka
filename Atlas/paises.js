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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO"
    }).addTo(map);

    let namesVisible = false;
    let geojsonLayer = null;
    const labelsLayer = L.layerGroup().addTo(map);
    const microstatesLayer = L.layerGroup().addTo(map); // Capa para círculos naranjas
    const countryDataMap = new Map();

    // Lista de Microestados (Refuerzo visual: Círculos Naranjas)
    // Se definen manualmente porque el GeoJSON a veces no los dibuja o RestCountries no da coords exactas para punto
    const microstatesRefuerzo = [
        { id: "VAT", name: "Vatican City", display: "Vaticano", latlng: [41.9029, 12.4534], region: "Europe" },
        { id: "SMR", name: "San Marino", display: "San Marino", latlng: [43.9424, 12.4578], region: "Europe" },
        { id: "LIE", name: "Liechtenstein", display: "Liechtenstein", latlng: [47.1410, 9.5209], region: "Europe" },
        { id: "AND", name: "Andorra", display: "Andorra", latlng: [42.5063, 1.5218], region: "Europe" },
        { id: "MCO", name: "Monaco", display: "Mónaco", latlng: [43.7384, 7.4246], region: "Europe" },
        { id: "MLT", name: "Malta", display: "Malta", latlng: [35.8989, 14.5146], region: "Europe" },
        { id: "SGP", name: "Singapore", display: "Singapur", latlng: [1.3521, 103.8198], region: "Asia" }
    ];

    // 3. CARGA DE DATOS (GeoJSON + API RestCountries)
    try {
        const [geoRes, restRes] = await Promise.all([
            fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"),
            fetch("https://restcountries.com/v3.1/all?fields=name,region,cca3,flags,population,area,languages")
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
                // RECUPERADO: Idiomas oficiales
                langs: c.languages ? Object.values(c.languages).join(", ") : "N/A"
            };
            countryDataMap.set(c.name.common, info);
            countryDataMap.set(c.cca3, info);
        });

        // Función auxiliar para generar el popup unificado
        function buildPopupContent(info) {
            return `
                <div class="popup-card">
                    <img src="${info.flag}">
                    <div class="title">${info.name}</div>
                    <div class="data-field">
                        <b>Población:</b> ${info.pop}<br>
                        <b>Área:</b> ${info.area}<br>
                        <b>Idiomas:</b> ${info.langs}
                    </div>
                </div>`;
        }

        // 4. FUNCIÓN PARA DIBUJAR PAÍSES Y MICROESTADOS
        function updateMap(filter = "all") {
            if (geojsonLayer) map.removeLayer(geojsonLayer);
            labelsLayer.clearLayers();
            microstatesLayer.clearLayers(); // Limpiar círculos naranjas

            // A. Dibujar países normales (GeoJSON)
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
                        layer.bindPopup(buildPopupContent(info));

                        if (namesVisible) {
                            const center = layer.getBounds().getCenter();
                            L.marker(center, {
                                icon: L.divIcon({ className: 'country-label', html: info.name, iconSize: [100, 20] }),
                                interactive: false
                            }).addTo(labelsLayer);
                        }
                    } else {
                        layer.unbindPopup();
                    }
                }
            }).addTo(map);

            // B. DIBUJAR MICROESTADOS (Círculos Naranjas) - RECUPERADO
            microstatesRefuerzo.forEach(ms => {
                const match = filter === "all" || ms.region === filter;
                if (match) {
                    const dot = L.circleMarker(ms.latlng, {
                        radius: 7,
                        fillColor: "#e67e22", // Naranja
                        color: "#fff",
                        weight: 2,
                        fillOpacity: 0.9
                    }).addTo(microstatesLayer);

                    const info = countryDataMap.get(ms.id) || countryDataMap.get(ms.name);
                    if (info) {
                        dot.bindPopup(buildPopupContent(info));
                    } else {
                        dot.bindPopup(`<b>${ms.display}</b>`);
                    }

                    if (namesVisible) {
                        L.marker(ms.latlng, {
                            icon: L.divIcon({ className: 'country-label', html: ms.display, iconSize: [80, 20] }),
                            interactive: false
                        }).addTo(labelsLayer);
                    }
                }
            });
        }

        // 5. CONTROLADORES DE EVENTOS
        document.getElementById("continentSelect").onchange = (e) => {
            const val = e.target.value;
            updateMap(val);
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

        updateMap(); // Inicializar

    } catch (err) {
        console.error("Error crítico:", err);
    }
})();