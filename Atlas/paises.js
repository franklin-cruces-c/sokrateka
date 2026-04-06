// 1. Inicialización del mapa (Asegúrate de que el div tenga id="map")
const map = L.map('map').setView([54, 15], 4);

// 2. Capa de fondo (La que usabas originalmente)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 3. Cargar el GeoJSON de países
fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                color: "#2c3e50",
                weight: 1,
                fillColor: "#3498db",
                fillOpacity: 0.3
            },
            onEachFeature: function(feature, layer) {
                // Eventos de hover como los tenías
                layer.on('mouseover', function() {
                    this.setStyle({ fillOpacity: 0.7, fillColor: "#2980b9" });
                });
                layer.on('mouseout', function() {
                    this.setStyle({ fillOpacity: 0.3, fillColor: "#3498db" });
                });
                // Popup con el nombre del país
                layer.bindPopup("<b>" + feature.properties.name + "</b>");
            }
        }).addTo(map);
    });

// 4. Lógica de los botones (Busca los IDs de tu HTML original)
document.getElementById('resetBtn').onclick = function() {
    map.setView([54, 15], 4);
};

// Si tus botones se llaman diferente en el HTML, cámbialos aquí:
document.querySelector('button:nth-child(2)').onclick = function() {
    alert("Aquí puedes activar la capa de nombres");
};

document.querySelector('button:nth-child(3)').onclick = function() {
    alert("Aquí puedes activar la capa de capitales");
};