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

        filteredCountries = gameSettings.continent === "all" 
            ? allCountries 
            : allCountries.filter(c => c.region === gameSettings.continent);

        players = [];
        for(let i=1; i<=gameSettings.mode; i++) {
            players.push({
                name: document.getElementById(`p${i}-name`).value || `Player ${i}`,
                score: 0
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
        flagsCount++;
        if(gameSettings.flagLimit > 0 && flagsCount > gameSettings.flagLimit) return endGame("¡Reto completado!");

        document.getElementById('counter-display').textContent = `🚩 ${flagsCount}${gameSettings.flagLimit > 0 ? '/'+gameSettings.flagLimit : ''}`;
        document.getElementById('feedback').textContent = "";
        document.getElementById('next-btn').style.display = "none";
        document.getElementById('pass-btn').style.display = gameSettings.mode > 1 ? "block" : "none";
        
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
            btn.onclick = () => {
                if(o === correct) {
                    btn.style.background = "#2ea44f"; btn.style.color = "white";
                    players[activeP].score += 10;
                    document.getElementById('feedback').textContent = "🌟 ¡Correcto!";
                    finishRound();
                } else {
                    btn.style.background = "#cf222e"; btn.style.color = "white";
                    if(gameSettings.mode > 1) {
                        activeP = (activeP + 1) % gameSettings.mode;
                        document.getElementById('feedback').textContent = `¡Casi! Turno de ${players[activeP].name}`;
                        updateScoreboard();
                    } else {
                        document.getElementById('feedback').textContent = `Es ${correct}`;
                        finishRound();
                    }
                }
            };
            grid.appendChild(btn);
        });
        updateScoreboard();
    }

    // NUEVA FUNCIÓN: CEDER TURNO
    document.getElementById('pass-btn').onclick = () => {
        activeP = (activeP + 1) % gameSettings.mode;
        document.getElementById('feedback').textContent = `Turno cedido a ${players[activeP].name}`;
        updateScoreboard();
    };

    function finishRound() {
        document.querySelectorAll('.option').forEach(b => b.disabled = true);
        document.getElementById('next-btn').style.display = "block";
        document.getElementById('pass-btn').style.display = "none";
    }

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
        alert(`${reason}\nResumen: ${players.map(p => p.name + ": " + p.score).join(", ")}`);
        location.reload();
    }

    init();
})();
