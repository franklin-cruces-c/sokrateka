(async function () {
    // 1. INTERFAZ Y NAVEGACIÓN
    const menuBtn = document.getElementById("toggleMenu");
    const container = document.getElementById("controlsContainer");
    const langSelect = document.getElementById("languageSelect");
    
    menuBtn.onclick = () => {
        container.classList.toggle("collapsed");
        menuBtn.textContent = container.classList.contains("collapsed") ? "❯ Mostrar" : "▼ Cerrar";
    };

    // Diccionario de Traducción para la Interfaz del Popup
    const i18n = {
        es: { pop: "Población", area: "Área", lang: "Idiomas", show: "Ocultar nombres", hide: "Mostrar nombres" },
        en: { pop: "Population", area: "Area", lang: "Languages", show: "Hide names", hide: "Show names" },
        default: { pop: "Población", area: "Área", lang: "Idiomas", show: "Ocultar nombres", hide: "Mostrar nombres" }
    };

    // 2. CONFIGURACIÓN DEL MAPA
    const map = L.map("map").setView([20, 0], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png").addTo(map);

    let namesVisible = false;
    let currentLang = "default";
    let geojsonLayer = null;
    const labelsLayer = L.layerGroup().addTo(map);
    const microLayer = L.layerGroup().addTo(map);
    const countryInfo = new Map();

    const manualCoords = { "Russia": [60, 95], "Norway": [62, 9] };

    const microList = [
        {id:"VAT", latlng:[41.902, 12.453], name:"Vaticano", nameEn:"Vatican City", reg:"Europe"},
        {id:"MCO", latlng:[43.738, 7.424], name:"Mónaco", nameEn:"Monaco", reg:"Europe"},
        {id:"SMR", latlng:[43.942, 12.457], name:"San Marino", nameEn:"San Marino", reg:"Europe"},
        {id:"AND", latlng:[42.506, 1.521], name:"Andorra", nameEn:"Andorra", reg:"Europe"},
        {id:"MLT", latlng:[35.898, 14.514], name:"Malta", nameEn:"Malta", reg:"Europe"},
        {id:"LIE", latlng:[47.141, 9.520], name:"Liechtenstein", nameEn:"Liechtenstein", reg:"Europe"},
        {id:"SGP", latlng:[1.352, 103.81], name:"Singapur", nameEn:"Singapore", reg:"Asia"}
    ];

    try {
        const [geoRes, restRes] = await Promise.all([
            fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"),
            fetch("https://restcountries.com/v3.1/all?fields=name,translations,region,cca3,flags,population,area,languages")
        ]);
        const geoData = await geoRes.json();
        const restData = await restRes.json();

        restData.forEach(c => {
            const data = {
                nameDefault: c.name.common,
                nameEs: c.translations?.spa?.common || c.name.common,
                nameEn: c.name.common,
                region: c.region,
                flag: c.flags.png,
                pop: c.population.toLocaleString('es-ES'),
                area: c.area ? c.area.toLocaleString('es-ES') + " km²" : "N/A",
                langs: c.languages ? Object.values(c.languages).join(", ") : "N/A"
            };
            countryInfo.set(c.name.common, data);
            countryInfo.set(c.cca3, data);
        });

        function getDisplayName(info) {
            if (currentLang === "es") return info.nameEs;
            if (currentLang === "en") return info.nameEn;
            return info.nameDefault;
        }

        function buildPopup(info) {
            const t = i18n[currentLang] || i18n.default;
            return `<div class="popup-card">
                <img src="${info.flag}">
                <b>${getDisplayName(info)}</b>
                <span><b>${t.pop}:</b> ${info.pop}</span>
                <span><b>${t.area}:</b> ${info.area}</span>
                <span><b>${t.lang}:</b> ${info.langs}</span>
            </div>`;
        }

        function updateMap(filter = "all") {
            if (geojsonLayer) map.removeLayer(geojsonLayer);
            labelsLayer.clearLayers();
            microLayer.clearLayers();

            geojsonLayer = L.geoJSON(geoData, {
                style: (f) => {
                    const info = countryInfo.get(f.properties.name) || countryInfo.get(f.id);
                    const match = filter === "all" || (info && info.region === filter);
                    return { fillColor: match ? "#1f6feb" : "#cccccc", fillOpacity: match ? 0.6 : 0.05, color: "white", weight: 1 };
                },
                onEachFeature: (f, layer) => {
                    const info = countryInfo.get(f.properties.name) || countryInfo.get(f.id);
                    const match = filter === "all" || (info && info.region === filter);

                    if (match && info) {
                        layer.bindPopup(buildPopup(info));
                        layer.on('mouseover', function() { this.setStyle({ fillColor: "#ffcc00", fillOpacity: 0.9 }); });
                        layer.on('mouseout', function() { geojsonLayer.resetStyle(this); });

                        if (namesVisible) {
                            const pos = manualCoords[f.properties.name] || layer.getBounds().getCenter();
                            L.marker(pos, {
                                icon: L.divIcon({ className: 'country-label', html: getDisplayName(info), iconSize: [100, 20] }),
                                interactive: false
                            }).addTo(labelsLayer);
                        }
                    }
                }
            }).addTo(map);

            microList.forEach(m => {
                if (filter === "all" || m.reg === filter) {
                    const circle = L.circleMarker(m.latlng, { radius: 6, fillColor: "#e67e22", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(microLayer);
                    const info = countryInfo.get(m.id) || countryInfo.get(m.name);
                    if (info) {
                        circle.bindPopup(buildPopup(info));
                        if (namesVisible) {
                            L.marker(m.latlng, {
                                icon: L.divIcon({ className: 'country-label', html: getDisplayName(info), iconSize: [80, 20] }),
                                interactive: false
                            }).addTo(labelsLayer);
                        }
                    }
                }
            });
        }

        // EVENTOS
        langSelect.onchange = (e) => {
            currentLang = e.target.value;
            const btn = document.getElementById("toggleNamesBtn");
            const t = i18n[currentLang] || i18n.default;
            btn.textContent = namesVisible ? t.show : t.hide;
            updateMap(document.getElementById("continentSelect").value);
        };

        document.getElementById("continentSelect").onchange = (e) => {
            updateMap(e.target.value);
            const views = { "Europe": [[50, 15], 4], "Africa": [[0, 20], 3], "Americas": [[10, -80], 3], "Asia": [[30, 80], 3], "Oceania": [[-25, 135], 4], "all": [[20, 0], 2] };
            if (views[e.target.value]) map.flyTo(views[e.target.value][0], views[e.target.value][1]);
        };

        document.getElementById("toggleNamesBtn").onclick = (e) => {
            namesVisible = !namesVisible;
            const t = i18n[currentLang] || i18n.default;
            e.target.textContent = namesVisible ? t.show : t.hide;
            updateMap(document.getElementById("continentSelect").value);
        };

        document.getElementById("resetBtn").onclick = () => {
            document.getElementById("continentSelect").value = "all";
            updateMap("all");
            map.flyTo([20, 0], 2);
        };

        updateMap();
    } catch (e) { console.error("Error cargando el mapa:", e); }
})();