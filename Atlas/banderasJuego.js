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
            document.getElementById('btn-stop').onclick = () => endGame("Juego terminado");
            document.getElementById('btn-save-quit').onclick = saveGame;
            document.getElementById('next-btn').onclick = () => newRound();
            document.getElementById('skip-btn').onclick = () => {
                // Si saltan la bandera, todos deben estudiarla
                players.forEach(p => p.mistakes.push(currentCorrectAnswer));
                newRound();
            };
        } catch (e) { console.error("Error API:", e); }
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
                color: COLORS[i-1],
                mistakes: []
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
        if(gameSettings.flagLimit > 0 && flagsCount > gameSettings.flagLimit) return endGame("Reto completado");

        document.getElementById('flag-counter').textContent = `🚩 ${flagsCount}${gameSettings.flagLimit > 0 ? '/'+gameSettings.flagLimit : ''}`;
        document.getElementById('feedback').textContent = "";
        document.getElementById('next-btn').style.display = "none";
        document.getElementById('pass-btn').style.display = "block";
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
            btn.innerHTML = `<span>${o}</span>`;
            btn.onclick = () => checkAnswer(o, btn);
            grid.appendChild(btn);
        });
        updateScoreboard();
    }

    function checkAnswer(selected, btn) {
        btn.disabled = true;
        const tag = document.createElement('span');
        tag.className = 'player-tag';
        tag.style.backgroundColor = players[activeP].color;
        tag.textContent = players[activeP].name;
        btn.appendChild(tag);

        if(selected === currentCorrectAnswer) {
            btn.style.background = "#2ea44f";
            btn.style.color = "white";
            players[activeP].score += 10;
            document.getElementById('feedback').textContent = `🌟 ¡Bravo, ${players[activeP].name}!`;
            revealAndStop();
        } else {
            btn.style.background = "#ff4d4d";
            btn.style.color = "white";
            players[activeP].mistakes.push(currentCorrectAnswer);
            document.getElementById('feedback').textContent = `❌ ${players[activeP].name} falló.`;
            handleTurnChange();
        }
    }

    function handleTurnChange() {
        attemptsInRound++;
        activeP = (activeP + 1) % gameSettings.mode;
        if (attemptsInRound >= gameSettings.mode) {
            document.getElementById('feedback').textContent = "⚠️ Turnos agotados.";
            revealAndStop();
        } else {
            updateScoreboard();
        }
    }

    function revealAndStop() {
        document.querySelectorAll('.option').forEach(btn => {
            btn.disabled = true;
            if(btn.firstChild.textContent === currentCorrectAnswer) {
                btn.style.background = "#2ea44f";
                btn.style.color = "white";
            }
        });
        document.getElementById('next-btn').style.display = "block";
        document.getElementById('pass-btn').style.display = "none";
        document.getElementById('skip-btn').style.display = "none";
        updateScoreboard();
    }

    document.getElementById('pass-btn').onclick = () => {
        // Ceder turno ahora cuenta como fallo para las estadísticas
        players[activeP].mistakes.push(currentCorrectAnswer);
        document.getElementById('feedback').textContent = `${players[activeP].name} no supo y cedió.`;
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
        localStorage.setItem('atlas_quiz_save', JSON.stringify({ players, flagsCount, gameSettings }));
        alert("¡Progreso guardado!");
    }

    function endGame(reason) {
        clearInterval(timerInterval);
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('results-screen').style.display = 'block';

        const statsCont = document.getElementById('final-stats-container');
        statsCont.innerHTML = players.map(p => `
            <div class="result-row">
                <strong style="color:${p.color}">${p.name}</strong>
                <span>${p.score} Puntos</span>
            </div>
        `).join('');

        const studyCont = document.getElementById('study-recommendations');
        studyCont.innerHTML = players.map(p => {
            if(p.mistakes.length === 0) return `<div class="study-item">✅ <strong>${p.name}</strong>: ¡Nivel Experto! Sin errores.</div>`;
            const uniqueMistakes = [...new Set(p.mistakes)];
            return `<div class="study-item">📖 <strong>${p.name}</strong>, te faltó conocer: <br>${uniqueMistakes.join(', ')}.</div>`;
        }).join('');
    }

    init();
})();
