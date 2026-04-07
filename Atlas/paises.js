(async function () {
    const menuBtn = document.getElementById("toggleMenu");
    const container = document.getElementById("controlsContainer");
    const langSelect = document.getElementById("languageSelect");
    
    menuBtn.onclick = () => {
        container.classList.toggle("collapsed");
        menuBtn.textContent = container.classList.contains("collapsed") ? "❯" : "▼";
    };

    const i18n = {
        en: { 
            pop: "Population", area: "Area", lang: "Languages", curr: "Currency",
            reset: "Reset World", show: "Hide names", hide: "Show names",
            filter: "Filter Continent:", exit: "🏠 Main Menu", all: "All World"
        },
        es: { 
            pop: "Población", area: "Área", lang: "Idiomas", curr: "Moneda",
            reset: "Reset Mundo", show: "Ocultar nombres", hide: "Mostrar nombres",
            filter: "Filtrar Continente:", exit: "🏠 Menú Principal", all: "Todo el Mundo"
        }
    };

    const dict = {
        "Spanish": "Español", "English": "Inglés", "French": "Francés", "German": "Alemán",
        "Portuguese": "Portugués", "Italian": "Italiano", "Chinese": "Chino", "Arabic": "Árabe",
        "Russian": "Ruso", "Japanese": "Japonés", "Dutch": "Neerlandés", "Greek": "Griego",
        "Euro": "Euro", "United States dollar": "Dólar estadounidense", "Pound sterling": "Libra esterlina",
        "Japanese yen": "Yen japonés", "Swiss franc": "Franco suizo", "Canadian dollar": "Dólar canadiense"
    };

    const map = L.map("map").setView([20, 0], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png").addTo(map);

    let namesVisible = false;
    let currentLang = "en"; 
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
        {id:"LIE", latlng:[47.141, 9.520], nameEn:"Liechtenstein", nameEs:"Liechtenstein", reg:"Europe"},
        {id:"SGP", latlng:[1.352, 103.81], nameEn:"Singapore", nameEs:"Singapur", reg:"Asia"}
    ];

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
                pop: c.population,
                area: c.area,
                langs: c.languages ? Object.values(c.languages) : ["N/A"],
                currEn: currencyKey ? c.currencies[currencyKey].name : "N/A"
            };
            countryInfo.set(c.name.common, data);
            countryInfo.set(c.cca3, data);
        });

        function translateVal(val) {
            if (currentLang === 'en') return Array.isArray(val) ? val.join(", ") : val;
            if (Array.isArray(val)) return val.map(item => dict[item] || item).join(", ");
            return dict[val] || val;
        }

        function buildPopup(info) {
            const t = i18n[currentLang];
            const name = currentLang === 'es' ? info.nameEs : info.nameEn;
            const popFmt = info.pop.toLocaleString(currentLang === 'es' ? 'es-ES' : 'en-US');
            const areaFmt = info.area ? info.area.toLocaleString(currentLang === 'es' ? 'es-ES' : 'en-US') + " km²" : "N/A";

            return `<div class="popup-card">
                <img src="${info.flag}">
                <b>${name}</b>
                <span><b>${t.pop}:</b> ${popFmt}</span>
                <span><b>${t.area}:</b> ${areaFmt}</span>
                <span><b>${t.lang}:</b> ${translateVal(info.langs)}</span>
                <span><b>${t.curr}:</b> ${translateVal(info.currEn)}</span>
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
                        layer.on('mouseover', function() { this.setStyle({ fillColor: "#ffcc00", fillOpacity: 0.8 }); });
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

            // DIBUJAR MICROESTADOS (Círculos Naranja)
            microList.forEach(m => {
                const info = countryInfo.get(m.id);
                const match = filter === "all" || (info && info.region === filter);
                if (match && info) {
                    const circle = L.circleMarker(m.latlng, { radius: 6, fillColor: "#e67e22", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(microLayer);
                    circle.bindPopup(buildPopup(info));
                    if (namesVisible) {
                        L.marker(m.latlng, {
                            icon: L.divIcon({ className: 'country-label', html: currentLang === 'es' ? m.nameEs : m.nameEn, iconSize: [80, 20] }),
                            interactive: false
                        }).addTo(labelsLayer);
                    }
                }
            });
        }

        langSelect.onchange = (e) => {
            currentLang = e.target.value;
            const t = i18n[currentLang];
            document.getElementById("resetBtn").textContent = t.reset;
            document.getElementById("toggleNamesBtn").textContent = namesVisible ? t.show : t.hide;
            document.getElementById("labelFilter").textContent = t.filter;
            document.getElementById("btnExit").textContent = t.exit;
            updateMap(document.getElementById("continentSelect").value);
        };

        document.getElementById("continentSelect").onchange = (e) => {
            const val = e.target.value;
            updateMap(val);
            const views = { 
                "Europe": [[50, 15], 4], "Africa": [[0, 20], 3], "Americas": [[10, -80], 3], 
                "Asia": [[30, 80], 3], "Oceania": [[-25, 135], 4], "all": [[20, 0], 2] 
            };
            if (views[val]) map.flyTo(views[val][0], views[val][1]);
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
    } catch (e) { console.error("Error:", e); }
})();