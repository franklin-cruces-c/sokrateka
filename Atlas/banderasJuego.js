(async function() {
    let allCountries = [];
    let filteredCountries = [];
    let players = [];
    let activeP = 0;
    let flagsCount = 0;
    let attemptsInRound = 0;
    let timerInterval;
    let startTime;
    let gameSettings = {};
    let currentCorrectAnswer = "";
    const COLORS = ['#ff2e63', '#ffd700', '#08d9d6'];

    async function init() {
        try {
            const res = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,translations,region");
            allCountries = await res.json();
            document.getElementById('start-game-btn').onclick = startGame;
            document.getElementById('btn-stop').onclick = () => location.reload();
            document.getElementById('btn-save-quit').onclick = saveGame;
            document.getElementById('next-btn').onclick = () => newRound();
            document.getElementById('skip-btn').onclick = () => newRound();
        } catch (e) { alert("Error de conexión con la API de países."); }
    }

    function startGame() {
        gameSettings = {
            mode: parseInt(document.getElementById('gameMode').value),
            continent: document.getElementById('continentFilter').value,
            timeLimit: parseInt(document.getElementById('timeLimit').value),
            flagLimit: parseInt(document.getElementById('flagLimit').value)
        };

        filteredCountries = gameSettings.continent === "all" 
            ? allCountries 
            : allCountries.filter(c => c.region === gameSettings.continent);

        players = [];
        for(let i=1; i<=gameSettings.mode; i++) {
            players.push({
                name: document.getElementById(`p${i}-name`).value || `Jugador ${i}`,
                score: 0,
                color: COLORS[i-1]
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
            if(gameSettings.timeLimit > 0 && elapsed >= gameSettings.timeLimit) endGame("¡Tiempo agotado!");
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('timer-display').textContent = `⏱️ ${mins}:${secs}`;
        }, 1000);
    }

    function newRound() {
        attemptsInRound = 0;
        flagsCount++;
        
        if(gameSettings.flagLimit > 0 && flagsCount > gameSettings.flagLimit) {
            return endGame("¡Reto completado!");
        }

        document.getElementById('flag-counter').textContent = `🚩 ${flagsCount}${gameSettings.flagLimit > 0 ? '/'+gameSettings.flagLimit : ''}`;
        document.getElementById('feedback').textContent = "";
        document.getElementById('next-btn').style.display = "none";
        document.getElementById('pass-btn').style.display = gameSettings.mode > 1 ? "block" : "none";
        document.getElementById('skip-btn').style.display = "block";
        
        const target = filteredCountries[Math.floor(Math.random() * filteredCountries.length)];
        currentCorrectAnswer = target.translations.spa.common;
        document.getElementById('flag-img').src = target.flags.png;

        const grid = document.getElementById('options-grid');
        grid.innerHTML = "";
        
        let opts = [currentCorrectAnswer];
        while(opts.length < 4) {
            let n = allCountries[Math.floor(Math.random() * allCountries.length)].translations.spa.common;
            if(!opts.includes(n)) opts.push(n);
        }

        opts.sort(() => Math.random() - 0.5).forEach(o => {
            const btn = document.createElement('button');
            btn.className = 'option';
            btn.textContent = o;
            btn.onclick = () => checkAnswer(o, btn);
            grid.appendChild(btn);
        });

        updateScoreboard();
    }

    function checkAnswer(selected, btn) {
        btn.disabled = true;
        btn.style.borderColor = players[activeP].color;
        btn.style.borderWidth = "4px";

        if(selected === currentCorrectAnswer) {
            btn.style.background = "#2ea44f";
            btn.style.color = "white";
            players[activeP].score += 10;
            document.getElementById('feedback').textContent = `🌟 ¡Excelente, ${players[activeP].name}!`;
            revealAndStop();
        } else {
            btn.style.background = "#ff4d4d";
            btn.style.color = "white";
            document.getElementById('feedback').textContent = `❌ ${players[activeP].name} se equivocó.`;
            handleTurnChange();
        }
    }

    function handleTurnChange() {
        attemptsInRound++;
        if (attemptsInRound >= gameSettings.mode) {
            document.getElementById('feedback').textContent = "⚠️ Turnos agotados.";
            revealAndStop();
        } else {
            activeP = (activeP + 1) % gameSettings.mode;
            updateScoreboard();
        }
    }

    function revealAndStop() {
        // Deshabilitar todo y mostrar el botón de siguiente
        document.querySelectorAll('.option').forEach(btn => {
            btn.disabled = true;
            if(btn.textContent === currentCorrectAnswer) {
                btn.style.background = "#2ea44f";
                btn.style.color = "white";
                btn.style.borderColor = "#1a7f37";
            }
        });
        document.getElementById('next-btn').style.display = "block";
        document.getElementById('pass-btn').style.display = "none";
        document.getElementById('skip-btn').style.display = "none";
        updateScoreboard();
    }

    document.getElementById('pass-btn').onclick = () => {
        document.getElementById('feedback').textContent = `${players[activeP].name} pasó.`;
        handleTurnChange();
    };

    function updateScoreboard() {
        const sb = document.getElementById('scoreboard');
        sb.innerHTML = players.map((p, i) => `
            <div class="p-score ${i === activeP ? 'active-p'+(i+1) : ''}">
                ${p.name}: ${p.score}
            </div>
        `).join('');
    }

    function saveGame() {
        const state = { players, flagsCount, settings: gameSettings };
        localStorage.setItem('atlas_quiz_save', JSON.stringify(state));
        alert("Configuración guardada en este navegador.");
    }

    function endGame(reason) {
        clearInterval(timerInterval);
        const scores = players.map(p => `${p.name}: ${p.score}`).join('\n');
        alert(`${reason}\n\nResultados Finales:\n${scores}`);
        location.reload();
    }

    init();
})();
