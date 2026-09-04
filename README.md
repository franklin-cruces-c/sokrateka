# Sokrateka

Aplicación educativa para niños que combina geografía interactiva y juego de memoria de banderas, alojada en GitHub Pages.

## 🌍 Características

### Módulo de Geografía
- **Mapa interactivo mundial** usando Leaflet.js
- **Información detallada de países** al hacer clic:
  - Bandera y nombre localizado (ES/EN)
  - Población y área formateados
  - Idiomas oficiales y moneda
  - Enlace a Wikipedia
- **Filtros por continente** (Europa, África, Américas, Asia, Oceanía, Mundo)
- **Controles de visualización**:
  - Mostrar/ocultar nombres de países
  - Mostrar/ocultar capitales en el mapa
  - Reiniciar vista inicial
- **Experiencia de usuario**:
  - Popups arrastrables
  - Soporte para microestados (Vaticano, Mónaco, etc.)
  - Diseño responsive para móviles y escritorio

### Juego de Memoria de Banderas
- **Multijugador** (1-3 jugadores) con entrada de nombres
- **Configuración personalizable**:
  - Filtro por continente
  - Límite de tiempo (sin límite, 3 min, 5 min)
  - Número de banderas (10, 20, ilimitado)
- **Mecánica de juego**:
  - Turn-based: identificar país por su bandera
  - Retroalimentación visual inmediata (correcto/error)
  - Opciones: pasar turno o saltar bandera
  - Sistema de puntuación y rachas
- **Aprendizaje reforzado**:
  - Registro de errores por jugador
  - Pantalla de resultados con recomendaciones de estudio personalizadas
  - Guardado de partida en progreso (localStorage)

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5 Semántico, CSS3 (Flexbox/Grid), JavaScript ES6+
- **Mapas**: [Leaflet.js](https://leafletjs.com/) con capas de OpenStreetMap y CartoDB
- **Datos**: 
  - [REST Countries API](https://restcountries.com/) (datos de países, banderas, etc.)
  - GeoJSON de fronteras mundiales (github.com/johan/world.geo.json)
  - CSV de capitales de países (procesado desde D3 gallery)
- **Almacenamiento**: localStorage para persistencia de sesión
- **Hosting**: GitHub Pages

## 🚀 Cómo Ejecutar Localmente

Como es una aplicación estática, simplemente:
1. Clonar el repositorio: `git clone https://github.com/tu-usuario/sokrateka.git`
2. Abrir `index.html` en cualquier navegador moderno
3. ¡Disfrutar aprendiendo!

## 📱 Despliegue

La aplicación está configurada para desplegarse automáticamente en GitHub Pages desde la rama `main`.

## 🙏 Créditos y APIs Gratuitas

- **REST Countries API**: Proporciona datos actualizados de países, banderas, poblaciones, etc.
- **OpenStreetMap**: Tiles de mapa bajo licencia ODbL
- **CartoDB**: Estilo alternativo de mapa Voyager_nolabels
- **Datos de capitales**: Procesados desde fuentes públicas
- **Imágenes de banderas**: Generadas dinámicamente desde REST Countries con fallback a flagcdn.com

## 🎯 Objetivo Educativo

Sokrateka busca hacer el aprendizaje de geografía divertido y accesible para niños mediante:
- Exploración autodirigida en mapas interactivos
- Refuerzo de memoria mediante juego de turnos
- Retroalimentación inmediata y positiva
- Adaptabilidad a diferentes ritmos de aprendizaje
- Bilingüismo (Español/Inglés) para apoyo lingüístico

## 🔜 Posibles Mejoras Futuras

- Añadir modo de quiz al módulo de geografía (identificar países/capitales solicitados)
- Implementar sistema de logros o medallas
- Expandir a temas específicos (monumentos, animales, alimentos típicos por región)
- Agregar sonidos de retroalimentación (configurable)
- Modo de impresión para actividades offline
- Sincronización de progreso entre dispositivos (requiría backend)

---

*Desarrollado con ❤️ para hacer del aprendizaje una aventura.*