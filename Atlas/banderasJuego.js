(async function() {
    let allCountries = [];
    let filteredCountries = [];
    let players = [];
    let activeP = 0;
    let flagsCount = 0;
    let timerInterval;
    let startTime;
    let gameSettings = {};

    async function init() {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,translations,region");
        allCountries = await res.json();
        document.getElementById('start-game-btn').onclick = startGame;
    }

    function startGame() {
        gameSettings = {
            mode: parseInt(document.getElementById('gameMode').value),
            continent: document.getElementById('continentFilter').value,
            timeLimit: parseInt(document.getElementById('timeLimit').value),
            flagLimit: parseInt(document.getElementById('flagLimit').value)
        };

        // Filtrar países
        filteredCountries = gameSettings.continent === "all" 
            ? allCountries 
            : allCountries.filter(c => c.region === gameSettings.continent);

        // Inicializar jugadores
        players = [];
        for(let i=1; i<=gameSettings.mode; i++) {
            players.push({
                name: document.getElementById(`p${i}-name`).value || `P${i}`,
                score: 0,
                timeTotal: 0
            });
        }

        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        
        startTimer();
        newRound();
    }

    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            
            // Si hay límite de tiempo
            if(gameSettings.timeLimit > 0 && elapsed >= gameSettings.timeLimit) {
                endGame("¡Tiempo agotado!");
            }

            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('timer-display').textContent = `⏱️ ${mins}:${secs}`;
        }, 1000);
    }

    function newRound() {
        flagsCount++;
        // Verificar límite de banderas
        if(gameSettings.flagLimit > 0 && flagsCount > gameSettings.flagLimit) {
            return endGame("¡Reto completado!");
        }

        document.getElementById('counter-display').textContent = `🚩 ${flagsCount}${gameSettings.flagLimit > 0 ? '/'+gameSettings.flagLimit : ''}`;
        document.getElementById('feedback').textContent = "";
        document.getElementById('next-btn').style.display = "none";
        document.getElementById('skip-btn').style.display = "block";
        
        const target = filteredCountries[Math.floor(Math.random() * filteredCountries.length)];
        const correct = target.translations.spa.common;
        document.getElementById('flag-img').src = target.flags.png;

        const grid = document.getElementById('options-grid');
        grid.innerHTML = "";

        let opts = [correct];
        while(opts.length < 4) {
            let n = allCountries[Math.floor(Math.random() * allCountries.length)].translations.spa.common;
            if(!opts.includes(n)) opts.push(n);
        }

        opts.sort(() => Math.random() - 0.5).forEach(o => {
            const btn = document.createElement('button');
            btn.className = 'option';
            btn.textContent = o;
            btn.onclick = () => checkAnswer(o, correct, btn);
            grid.appendChild(btn);
        });

        updateScoreboard();
    }

    function checkAnswer(selected, correct, btn) {
        if(selected === correct) {
            btn.style.background = "#2ea44f";
            btn.style.color = "white";
            players[activeP].score += 10;
            document.getElementById('feedback').textContent = "🌟 ¡Correcto!";
            showNext();
        } else {
            btn.style.background = "#cf222e";
            btn.style.color = "white";
            // En modo multijugador, pasa el turno al fallar
            if(gameSettings.mode > 1) {
                activeP = (activeP + 1) % gameSettings.mode;
                document.getElementById('feedback').textContent = `¡Casi! Turno de ${players[activeP].name}`;
                updateScoreboard();
            } else {
                document.getElementById('feedback').textContent = `Es ${correct}`;
                showNext();
            }
        }
    }

    function showNext() {
        document.querySelectorAll('.option').forEach(b => b.disabled = true);
        document.getElementById('next-btn').style.display = "block";
        document.getElementById('skip-btn').style.display = "none";
    }

    document.getElementById('skip-btn').onclick = () => {
        activeP = (activeP + 1) % gameSettings.mode;
        newRound();
    };

    document.getElementById('next-btn').onclick = () => {
        activeP = (activeP + 1) % gameSettings.mode;
        newRound();
    };

    function updateScoreboard() {
        const sb = document.getElementById('scoreboard');
        sb.innerHTML = players.map((p, i) => `
            <div class="p-score ${i === activeP ? 'active-turn' : ''}">
                ${p.name}: ${p.score}
            </div>
        `).join('');
    }

    function endGame(reason) {
        clearInterval(timerInterval);
        alert(`${reason}\nNicole: ${players[0].score} puntos.`);
        location.reload();
    }

    init();
})();
