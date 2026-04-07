(async function() {
    let countries = [];
    let players = [];
    let activeP = 0;
    let gameMode = 1;
    let isSecondAttempt = false;
    const SAVE_KEY = 'atlasQuizData_v2';

    async function init() {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,translations");
        countries = await res.json();
        
        document.getElementById('gameMode').onchange = (e) => {
            const mode = parseInt(e.target.value);
            document.getElementById('p2-name').parentElement.style.display = mode >= 2 ? 'flex' : 'none';
            document.getElementById('p3-name').parentElement.style.display = mode >= 3 ? 'flex' : 'none';
        };

        loadSavedData();
        document.getElementById('start-game-btn').onclick = startGame;
    }

    function startGame() {
        gameMode = parseInt(document.getElementById('gameMode').value);
        players = [];
        
        for(let i=1; i<=gameMode; i++) {
            let inputName = document.getElementById(`p${i}-name`).value.trim();
            // Si el campo está vacío, ponemos Player 1, Player 2, etc.
            let finalName = inputName === "" ? `Player ${i}` : inputName;
            
            players.push({
                name: finalName,
                score: 0,
                learned: 0,
                toDedicateTime: {}
            });
        }
        
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        renderScoreboard();
        newRound();
    }

    function loadSavedData() {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            document.getElementById('gameMode').value = data.gameMode;
            // Disparamos el cambio visual
            document.getElementById('gameMode').dispatchEvent(new Event('change'));
            data.playerNames.forEach((name, i) => {
                if(document.getElementById(`p${i+1}-name`)) {
                    document.getElementById(`p${i+1}-name`).value = name;
                }
            });
            document.getElementById('save-status').textContent = "✅ Configuración cargada";
        }
    }

    window.saveGame = () => {
        const mode = parseInt(document.getElementById('gameMode').value);
        const names = [];
        for(let i=1; i<=mode; i++) {
            names.push(document.getElementById(`p${i}-name`).value);
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify({ gameMode: mode, playerNames: names }));
        document.getElementById('save-status').textContent = "💾 Guardado con éxito";
    };

    window.resetEverything = () => {
        if(confirm("¿Seguro que quieres borrar todos los nombres y el progreso?")) {
            localStorage.removeItem(SAVE_KEY);
            location.reload();
        }
    };

    // Funciones de juego (idénticas a la versión anterior para mantener lógica positiva)
    function renderScoreboard() {
        const container = document.getElementById('scoreboard');
        container.innerHTML = players.map((p, i) => `
            <div class="p-score ${i === activeP ? 'active-turn' : ''}">
                <div style="font-size:0.75rem; color:#57606a">${p.name}</div>
                <div style="font-weight:bold; font-size:1.2rem">✨ ${p.score}</div>
            </div>
        `).join('');
    }

    function newRound() {
        isSecondAttempt = false;
        document.getElementById('feedback').innerHTML = "";
        document.getElementById('next-btn').style.display = "none";
        document.getElementById('options-grid').innerHTML = "";
        let country = countries[Math.floor(Math.random() * countries.length)];
        let correct = country.translations.spa.common;
        document.getElementById('flag-img').src = country.flags.png;
        let opts = [correct];
        while(opts.length < 4) {
            let n = countries[Math.floor(Math.random() * countries.length)].translations.spa.common;
            if(!opts.includes(n)) opts.push(n);
        }
        opts.sort(() => Math.random() - 0.5).forEach(o => {
            const b = document.createElement('button');
            b.className = 'option';
            b.textContent = o;
            b.onclick = () => {
                if(o === correct) {
                    b.classList.add('correct');
                    players[activeP].score += 10;
                    players[activeP].learned++;
                    document.getElementById('feedback').innerHTML = "🌟 ¡Excelente!";
                    document.querySelectorAll('.option').forEach(btn => btn.disabled = true);
                    document.getElementById('next-btn').style.display = "block";
                } else {
                    b.classList.add('wrong'); b.disabled = true;
                    players[activeP].toDedicateTime[correct] = (players[activeP].toDedicateTime[correct] || 0) + 1;
                    if(gameMode > 1 && !isSecondAttempt) {
                        isSecondAttempt = true;
                        activeP = (activeP + 1) % gameMode;
                        document.getElementById('feedback').innerHTML = "¡Casi! Turno del compañero";
                        renderScoreboard();
                    } else {
                        document.getElementById('feedback').innerHTML = `Es <b>${correct}</b>. ¡A por la otra!`;
                        document.querySelectorAll('.option').forEach(btn => btn.disabled = true);
                        document.getElementById('next-btn').style.display = "block";
                    }
                }
                renderScoreboard();
            };
            document.getElementById('options-grid').appendChild(b);
        });
    }

    document.getElementById('next-btn').onclick = () => { activeP = (activeP + 1) % gameMode; newRound(); renderScoreboard(); };
    window.showStats = () => {
        document.getElementById('stats-body').innerHTML = players.map(p => `<div><b>${p.name}</b>: ${p.learned} aprendidas</div>`).join('');
        document.getElementById('stats-modal').style.display = 'flex';
    };
    window.closeStats = () => document.getElementById('stats-modal').style.display = 'none';

    init();
})();
