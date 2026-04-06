(async function () {
    const menuBtn = document.getElementById("toggleMenu");
    const container = document.getElementById("controlsContainer");
    const langSelect = document.getElementById("languageSelect");
    
    menuBtn.onclick = () => {
        container.classList.toggle("collapsed");
        menuBtn.textContent = container.classList.contains("collapsed") ? "❯" : "▼";
    };

    const i18n = {
        es: { 
            pop: "Población", area: "Área", lang: "Idiomas", curr: "Moneda",
            reset: "Reset Mundo", show: "Ocultar nombres", hide: "Mostrar nombres",
            filter: "Filtrar Continente:", exit: "🏠 Menú Principal", all: "Todo el Mundo"
        },
        en: { 
            pop: "Population", area: "Area", lang: "Languages", curr: "Currency",
            reset: "Reset World", show: "Hide names", hide: "Show names",
            filter: "Filter Continent:", exit: "🏠 Main Menu", all: "All World"
        }
    };

    const map = L.map("map").setView([20, 0], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png").addTo(map);

    let namesVisible = false;
    let currentLang = "en"; // Por defecto Inglés
    let geojsonLayer = null;
    const labelsLayer = L.layerGroup().addTo(map);
    const microLayer = L.layerGroup().addTo(map);
    const countryInfo = new Map();

    const manualCoords = { "Russia": [60, 95], "Norway": [62, 9] };

    const microList = [
        {id:"VAT", latlng:[41.902, 12.453], nameEn:"Vatican City", nameEs:"Vaticano", reg:"Europe"},
        {id:"MCO", latlng:[43.738, 7.424], nameEn:"Monaco", nameEs:"Mónaco", reg:"Europe"},
        {id:"SMR", latlng:[43.942, 12.457], nameEn:"San Marino", nameEs:"San Marino", reg:"Europe"},
        {id:"AND", latlng:[42.506, 1.521], nameEn:"Andorra", nameEs:"Andorra", reg:"Europe"},
        {id:"MLT", latlng:[35.898, 14.514], nameEn:"Malta", nameEs:"Malta", reg:"Europe"},
        {id:"SGP", latlng:[1.352, 103.81], nameEn:"Singapore", nameEs:"Singapur", reg:"Asia"}
    ];

    // Traducción manual simple para idiomas y monedas comunes cuando el idioma es ES
    const manualTr = {
        "Spanish": "Español", "English": "Inglés", "French": "Francés", "German": "Alemán", "Portuguese": "Portugués",
        "Euro": "Euro", "United States dollar": "Dólar estadounidense", "Pound sterling": "Libra esterlina"
    };

    try {
        const [geoRes, restRes] = await Promise.all([
            fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"),
            fetch("https://restcountries.com/v3.1/all?fields=name,translations,region,cca3,flags,population,area,languages,currencies")
        ]);
        const geoData = await geoRes.json();
        const restData = await restRes.json();

        restData.forEach(c => {
            const currencyKey = c.currencies ? Object.keys(c.currencies)[0] : null;
            const data = {
                nameEn: c.name.common,
                nameEs: c.translations?.spa?.common || c.name.common,
                region: c.region,
                flag: c.flags.png,
                pop: c.population.toLocaleString(currentLang === 'es' ? 'es-ES' : 'en-US'),
                area: c.area ? c.area.toLocaleString(currentLang === 'es' ? 'es-ES' : 'en-US') + " km²" : "N/A",
                langsEn: c.languages ? Object.values(c.languages).join(", ") : "N/A",
                currEn: currencyKey ? c.currencies[currencyKey].name : "N/A"
            };
            countryInfo.set(c.name.common, data);
            countryInfo.set(c.cca3, data);
        });

        function translateText(text) {
            if (currentLang !== 'es') return text;
            return text.split(", ").map(t => manualTr[t] || t).join(", ");
        }

        function buildPopup(info) {
            const t = i18n[currentLang];
            return `<div class="popup-card">
                <img src="${info.flag}">
                <b>${currentLang === 'es' ? info.nameEs : info.nameEn}</b>
                <span><b>${t.pop}:</b> ${info.pop}</span>
                <span><b>${t.area}:</b> ${info.area}</span>
                <span><b>${t.lang}:</b> ${translateText(info.langsEn)}</span>
                <span><b>${t.curr}:</b> ${translateText(info.currEn)}</span>
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
                                icon: L.divIcon({ className: 'country-label', html: currentLang === 'es' ? info.nameEs : info.nameEn, iconSize: [100, 20] }),
                                interactive: false
                            }).addTo(labelsLayer);
                        }
                    }
                }
            }).addTo(map);

            microList.forEach(m => {
                if (filter === "all" || m.reg === filter) {
                    const circle = L.circleMarker(m.latlng, { radius: 6, fillColor: "#e67e22", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(microLayer);
                    const info = countryInfo.get(m.id);
                    if (info) {
                        circle.bindPopup(buildPopup(info));
                        if (namesVisible) {
                            L.marker(m.latlng, {
                                icon: L.divIcon({ className: 'country-label', html: currentLang === 'es' ? m.nameEs : m.nameEn, iconSize: [80, 20] }),
                                interactive: false
                            }).addTo(labelsLayer);
                        }
                    }
                }
            });
        }

        langSelect.onchange = (e) => {
            currentLang = e.target.value;
            const t = i18n[currentLang];
            document.getElementById("resetBtn").textContent = t.reset;
            document.getElementById("toggleNamesBtn").textContent = namesVisible ? t.show : t.hide;
            updateMap(document.getElementById("continentSelect").value);
        };

        document.getElementById("toggleNamesBtn").onclick = (e) => {
            namesVisible = !namesVisible;
            e.target.textContent = namesVisible ? i18n[currentLang].show : i18n[currentLang].hide;
            updateMap(document.getElementById("continentSelect").value);
        };

        document.getElementById("resetBtn").onclick = () => {
            document.getElementById("continentSelect").value = "all";
            updateMap("all");
            map.flyTo([20, 0], 2);
        };

        updateMap();
    } catch (e) { console.error(e); }
})();