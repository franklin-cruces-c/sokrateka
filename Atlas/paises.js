// --- LÓGICA PARA OCULTAR/MOSTRAR MENÚ ---
  const menuTrigger = document.getElementById("toggleMenu");
  const controlsContainer = document.getElementById("controlsContainer");

  menuTrigger.onclick = function() {
    controlsContainer.classList.toggle("collapsed");
    
    // Cambiar el icono según el estado
    if (controlsContainer.classList.contains("collapsed")) {
      menuTrigger.textContent = "❯"; // Flecha hacia la derecha cuando está cerrado
    } else {
      menuTrigger.textContent = "▼"; // Flecha hacia abajo cuando está abierto
    }
  };