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
            filter: "Filter Continent:", exit: "🏠 Main Menu", all: "All World",
            wiki: "Read more on Wikipedia"
        },
        es: {
            pop: "Población", area: "Área", lang: "Idiomas", curr: "Moneda",
            reset: "Reset Mundo", show: "Ocultar nombres", hide: "Mostrar nombres",
            filter: "Filtrar Continente:", exit: "🏠 Menú Principal", all: "Todo el Mundo",
            wiki: "Leer más en Wikipedia"
        }
    };

    const dict = {
        "Spanish": "Español", "English": "Inglés", "French": "Francés", "German": "Alemán",
        "Portuguese": "Portugués", "Italian": "Italiano", "Chinese": "Chino", "Arabic": "Árabe",
        "Russian": "Ruso", "Japanese": "Japonés", "Dutch": "Neerlandés", "Greek": "Griego",
        "Danish": "Danés", "Lithuanian": "Lituano", "Basque": "Vasco", "Catalan": "Catalán",
        "Galician": "Gallego", "Swiss German": "Alemán suizo", "Romansh": "Romanche",
        "Swedish": "Sueco", "Norwegian": "Noruego", "Finnish": "Finlandés", "Polish": "Polaco",
        "Turkish": "Turco", "Hindi": "Hindi", "Bengali": "Bengalí", "Korean": "Coreano",
        "Euro": "Euro", "United States dollar": "Dólar estadounidense", "Pound sterling": "Libra esterlina",
        "Swiss franc": "Franco suizo", "Japanese yen": "Yen japonés", "Chinese yuan": "Yuan chino",
        "Colombian peso": "Peso colombiano", "Chilean peso": "Peso chileno", "Mexican peso": "Peso mexicano",
        "Argentine peso": "Peso argentino", "Uruguayan peso": "Peso uruguayo", "Dominican peso": "Peso dominicano",
        "Cuban peso": "Peso cubano", "Philippine peso": "Peso filipino", "Peruvian sol": "Sol peruano",
        "Brazilian real": "Real brasileño", "Bolivian boliviano": "Boliviano", "Paraguayan guaraní": "Guaraní paraguayo",
        "Venezuelan bolívar soberano": "Bolívar venezolano", "Guatemalan quetzal": "Quetzal guatemalteco",
        "Honduran lempira": "Lempira hondureño", "Nicaraguan córdoba": "Córdoba nicaragüense",
        "Costa Rican colón": "Colón costarricense", "Panamanian balboa": "Balboa panameño"
    };

    const map = L.map("map", {
        minZoom: 2,
        maxZoom: 18,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0
    }).setView([20, 0], 2);

    // Se usa 'voyager_nolabels' que tiene un azul de agua mucho más estético
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", {
        noWrap: true,
        bounds: [[-90, -180], [90, 180]]
    }).addTo(map);

    let namesVisible = false;
    let currentLang = "en";
    let geojsonLayer = null;
    let selectedLayer = null;
    const labelsLayer = L.layerGroup().addTo(map);
    const microLayer = L.layerGroup().addTo(map);
    const countryInfo = new Map();

    // Lógica de Popups Arrastrables
    map.on('popupopen', function(e) {
        const container = e.popup._container;
        container.style.cursor = 'grab';
        const draggable = new L.Draggable(container);
        draggable.enable();
        draggable.on('dragstart', () => { map.dragging.disable(); container.style.cursor = 'grabbing'; });
        draggable.on('dragend', () => { map.dragging.enable(); container.style.cursor = 'grab'; });
    });

    map.on('popupclose', function() {
        if (selectedLayer && geojsonLayer) {
            geojsonLayer.resetStyle(selectedLayer);
            selectedLayer = null;
        }
    });

    const microList = [
        {id:"VAT", latlng:[41.902, 12.453], nameEn:"Vatican City", nameEs:"Vaticano", reg:"Europe"},
        {id:"MCO", latlng:[43.738, 7.424], nameEn:"Monaco", nameEs:"Mónaco", reg:"Europe"},
        {id:"SMR", latlng:[43.942, 12.457], nameEn:"San Marino", nameEs:"San Marino", reg:"Europe"},
        {id:"AND", latlng:[42.506, 1.521], nameEn:"Andorra", nameEs:"Andorra", reg:"Europe"},
        {id:"MLT", latlng:[35.898, 14.514], nameEn:"Malta", nameEs:"Malta", reg:"Europe"},
        {id:"LIE", latlng:[47.141, 9.520], nameEn:"Liechtenstein", nameEs:"Liechtenstein", reg:"Europe"},
        {id:"SGP", latlng:[1.352, 103.81], nameEn:"Singapore", nameEs:"Singapur", reg:"Asia"},
        {id:"BHR", latlng:[26.066, 50.557], nameEn:"Bahrain", nameEs:"Baréin", reg:"Asia"},
        {id:"MDV", latlng:[3.202, 73.220], nameEn:"Maldives", nameEs:"Maldivas", reg:"Asia"},
        {id:"BRB", latlng:[13.193, -59.543], nameEn:"Barbados", nameEs:"Barbados", reg:"Americas"},
        {id:"ATG", latlng:[17.060, -61.796], nameEn:"Antigua and Barbuda", nameEs:"Antigua y Barbuda", reg:"Americas"},
        {id:"GRD", latlng:[12.116, -61.679], nameEn:"Grenada", nameEs:"Granada", reg:"Americas"},
        {id:"VCT", latlng:[13.252, -61.197], nameEn:"Saint Vincent and the Grenadines", nameEs:"San Vicente y las Granadinas", reg:"Americas"},
        {id:"LCA", latlng:[13.909, -60.978], nameEn:"Saint Lucia", nameEs:"Santa Lucía", reg:"Americas"},
        {id:"KNA", latlng:[17.357, -62.782], nameEn:"Saint Kitts and Nevis", nameEs:"San Cristóbal y Nieves", reg:"Americas"},
        {id:"MHL", latlng:[7.131, 171.184], nameEn:"Marshall Islands", nameEs:"Islas Marshall", reg:"Oceania"},
        {id:"PLW", latlng:[7.514, 134.582], nameEn:"Palau", nameEs:"Palaos", reg:"Oceania"},
        {id:"NRU", latlng:[-0.522, 166.931], nameEn:"Nauru", nameEs:"Nauru", reg:"Oceania"},
        {id:"TUV", latlng:[-8.518, 179.218], nameEn:"Tuvalu", nameEs:"Tuvalu", reg:"Oceania"},
        {id:"FSM", latlng:[7.425, 150.550], nameEn:"Micronesia", nameEs:"Micronesia", reg:"Oceania"},
        {id:"WSM", latlng:[-13.759, -172.104], nameEn:"Samoa", nameEs:"Samoa", reg:"Oceania"},
        {id:"TON", latlng:[-21.178, -175.198], nameEn:"Tonga", nameEs:"Tonga", reg:"Oceania"},
        {id:"VUT", latlng:[-15.376, 166.959], nameEn:"Vanuatu", nameEs:"Vanuatu", reg:"Oceania"},
        {id:"SYC", latlng:[-4.679, 55.491], nameEn:"Seychelles", nameEs:"Seychelles", reg:"Africa"},
        {id:"STP", latlng:[0.186, 6.613], nameEn:"São Tomé and Príncipe", nameEs:"Santo Tomé y Príncipe", reg:"Africa"},
        {id:"COM", latlng:[-11.645, 43.333], nameEn:"Comoros", nameEs:"Comoras", reg:"Africa"},
        {id:"BMU", latlng:[32.3078, -64.7505], nameEn:"Bermuda", nameEs:"Bermudas", reg:"Americas"},
        {id:"MUS", latlng:[-20.348, 57.552], nameEn:"Mauritius", nameEs:"Mauricio", reg:"Africa"}
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
            countryInfo.set(c.cca3, data);
            countryInfo.set(c.name.common, data);
        });

        function translateVal(val) {
            if (currentLang === 'en') return Array.isArray(val) ? val.join(", ") : val;
            if (Array.isArray(val)) return val.map(item => dict[item] || item).join(", ");
            return dict[val] || val;
        }

        // Estructura del Popup Compacta y Ordenada
        function buildPopup(info) {
            const t = i18n[currentLang];
            const name = currentLang === 'es' ? info.nameEs : info.nameEn;
            const wikiUrl = `https://${currentLang}.wikipedia.org/wiki/${encodeURIComponent(name)}`;

            return `<div class="popup-card">
                <img src="${info.flag}">
                <b class="country-title">${name}</b>
                <div class="info-row"><b>${t.pop}:</b> <span>${info.pop.toLocaleString()}</span></div>
                <div class="info-row"><b>${t.area}:</b> <span>${info.area ? info.area.toLocaleString() + " km²" : "N/A"}</span></div>
                <div class="info-row"><b>${t.lang}:</b> <span>${translateVal(info.langs)}</span></div>
                <div class="info-row"><b>${t.curr}:</b> <span>${translateVal(info.currEn)}</span></div>
                <hr class="separator">
                <a href="${wikiUrl}" target="_blank" class="wiki-link">📖 ${t.wiki}</a>
            </div>`;
        }

        function updateMap(filter = "all") {
            if (geojsonLayer) map.removeLayer(geojsonLayer);
            labelsLayer.clearLayers();
            microLayer.clearLayers();

            geojsonLayer = L.geoJSON(geoData, {
                style: (f) => {
                    const info = countryInfo.get(f.id) || countryInfo.get(f.properties.name);
                    const match = filter === "all" || (info && info.region === filter);
                    return { fillColor: match ? "#a3c9a8" : "#cccccc", fillOpacity: match ? 0.7 : 0.1, color: "black", weight: 1 };
                },
                onEachFeature: (f, layer) => {
                    const info = countryInfo.get(f.id) || countryInfo.get(f.properties.name);
                    if (info && (filter === "all" || info.region === filter)) {
                        layer.bindPopup(buildPopup(info));
                        layer.on({
                            mouseover: function() { if (selectedLayer !== this) this.setStyle({ fillOpacity: 0.9, color: "black", weight: 2 }); },
                            mouseout: function() { if (selectedLayer !== this) geojsonLayer.resetStyle(this); },
                            click: function() {
                                if (selectedLayer) geojsonLayer.resetStyle(selectedLayer);
                                selectedLayer = this;
                                this.setStyle({ fillColor: "#7fb069", fillOpacity: 0.9, weight: 3, color: "black" });
                            }
                        });
                        if (namesVisible) {
                            L.marker(layer.getBounds().getCenter(), {
                                icon: L.divIcon({ className: 'country-label', html: currentLang === 'es' ? info.nameEs : info.nameEn }),
                                interactive: false
                            }).addTo(labelsLayer);
                        }
                    }
                }
            }).addTo(map);

            microList.forEach(m => {
                const info = countryInfo.get(m.id);
                if (info && (filter === "all" || info.region === filter)) {
                    L.circleMarker(m.latlng, { radius: 6, fillColor: "#e67e22", color: "#fff", weight: 2, fillOpacity: 1 })
                     .addTo(microLayer).bindPopup(buildPopup(info));
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
            updateMap(e.target.value);
            const views = { "Europe": [[50, 15], 4], "Africa": [[0, 20], 3], "Americas": [[10, -80], 3], "Asia": [[30, 80], 3], "Oceania": [[-25, 135], 4], "all": [[20, 0], 2] };
            if (views[e.target.value]) map.flyTo(views[e.target.value][0], views[e.target.value][1]);
        };

        document.getElementById("toggleNamesBtn").onclick = () => {
            namesVisible = !namesVisible;
            document.getElementById("toggleNamesBtn").textContent = namesVisible ? i18n[currentLang].show : i18n[currentLang].hide;
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
