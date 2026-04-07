(async function() {
    let countries = [];
    let currentCountry = null;
    let score = 0;

    const flagImg = document.getElementById('flag-img');
    const optionsGrid = document.getElementById('options-grid');
    const scoreDisplay = document.getElementById('score');
    const feedback = document.getElementById('feedback');
    const nextBtn = document.getElementById('next-btn');

    async function loadGame() {
        try {
            // Usamos la misma API que en tu Atlas
            const response = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,translations");
            const data = await response.json();
            // Filtramos para asegurar que tengan nombre en español y bandera
            countries = data.map(c => ({
                name: c.translations?.spa?.common || c.name.common,
                flag: c.flags.png
            }));
            newQuestion();
        } catch (e) {
            console.error("Error loading flags:", e);
        }
    }

    function newQuestion() {
        feedback.textContent = "";
        nextBtn.style.display = "none";
        optionsGrid.innerHTML = "";
        
        // Seleccionar país correcto
        currentCountry = countries[Math.floor(Math.random() * countries.length)];
        flagImg.src = currentCountry.flag;

        // Generar 3 opciones incorrectas aleatorias
        let options = [currentCountry.name];
        while (options.length < 4) {
            let randomC = countries[Math.floor(Math.random() * countries.length)].name;
            if (!options.includes(randomC)) options.push(randomC);
        }

        // Mezclar opciones
        options.sort(() => Math.random() - 0.5);

        // Crear botones
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option';
            btn.textContent = opt;
            btn.onclick = () => checkAnswer(btn, opt);
            optionsGrid.appendChild(btn);
        });
    }

    function checkAnswer(btn, selected) {
        const allButtons = document.querySelectorAll('.option');
        allButtons.forEach(b => b.disabled = true);

        if (selected === currentCountry.name) {
            btn.classList.add('correct');
            feedback.textContent = "✅ Correct!";
            score += 10;
        } else {
            btn.classList.add('wrong');
            feedback.textContent = `❌ Wrong! It was ${currentCountry.name}`;
            // Resaltar la correcta
            allButtons.forEach(b => {
                if (b.textContent === currentCountry.name) b.classList.add('correct');
            });
            score = Math.max(0, score - 5);
        }

        scoreDisplay.textContent = score;
        nextBtn.style.display = "block";
    }

    nextBtn.onclick = newQuestion;

    loadGame();
})();