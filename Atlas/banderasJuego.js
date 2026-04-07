(async function() {
    let countries = [];
    let players = [];
    let activeP = 0;
    let gameMode = 1;
    let isSecondAttempt = false;
    const STORAGE_KEY = 'atlas_explorer_data_v3';

    async function init() {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,translations");
        countries = await res.json();
        
        document.getElementById('gameMode').addEventListener('change', (e) => {
            const mode = parseInt(e.target.value);
            document.getElementById('p2-name').parentElement.style.opacity = mode >= 2 ? '1' : '0.3';
            document.getElementById('p3-name').parentElement.style.opacity = mode >= 3 ? '1' : '0.3';
        });

        loadData();
        document.getElementById('start-game-btn').onclick = startGame;
    }

    function startGame() {
        gameMode = parseInt(document.getElementById('gameMode').value);
        players = [];
        
        for(let i=1; i<=gameMode; i++) {
            let nameInput = document.getElementById(`p${i}-name`).value.trim();
            players.push({
                name: nameInput || `Player ${i}`,
                score: 0,
                learned: 0,
                repasar: {}
            });
        }
        
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        updateScoreboard();
        newRound();
    }

    function loadData() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            document.getElementById('gameMode').value = data.mode;
            data.names.forEach((n, i) => {
                if(document.getElementById(`p${i+1}-name`)) document.getElementById(`p${i+1}-name`).value = n;
            });
        }
    }

    window.saveGame = () => {
        const mode = parseInt(document.getElementById('gameMode').value);
        const names = [
            document.getElementById('p1-name').value,
            document.getElementById('p2-name').value,
            document.getElementById('p3-name').value
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify({mode, names}));
        alert("💾 ¡Configuración de exploradores guardada!");
    };

    window.resetEverything = () => {
        if(confirm("¿Borrar todos los datos guardados?")) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    };

    // --- LÓGICA DE JUEGO ---
    function updateScoreboard() {
        const sb = document.getElementById('scoreboard');
        sb.innerHTML = players.map((p, i) => `
            <div class="p-score ${i === activeP ? 'active-turn' : ''}" style="display:inline-block; margin:0 5px; padding:5px 10px; border-radius:8px; border:2px solid ${i === activeP ? '#ffd700' : '#ddd'}">
                <small>${p.name}</small><br><b>✨ ${p.score}</b>
            </div>
        `).join('');
    }

    function newRound() {
        isSecondAttempt = false;
        document.getElementById('feedback').innerHTML = "";
        document.getElementById('next-btn').style.display = "none";
        const grid = document.getElementById('options-grid');
        grid.innerHTML = "";
        
        let target = countries[Math.floor(Math.random() * countries.length)];
        let correct = target.translations.spa.common;
        document.getElementById('flag-img').src = target.flags.png;

        let opts = [correct];
        while(opts.length < 4) {
            let n = countries[Math.floor(Math.random() * countries.length)].translations.spa.common;
            if(!opts.includes(n)) opts.push(n);
        }
        
        opts.sort(() => Math.random() - 0.5).forEach(o => {
            const btn = document.createElement('button');
            btn.className = 'option';
            btn.textContent = o;
            btn.onclick = () => {
                if(o === correct) {
                    btn.classList.add('correct');
                    players[activeP].score += 10;
                    players[activeP].learned++;
                    document.getElementById('feedback').innerHTML = "🌟 ¡Excelente!";
                    endTurn();
                } else {
                    btn.classList.add('wrong'); btn.disabled = true;
                    players[activeP].repasar[correct] = (players[activeP].repasar[correct] || 0) + 1;
                    if(gameMode > 1 && !isSecondAttempt) {
                        isSecondAttempt = true;
                        activeP = (activeP + 1) % gameMode;
                        document.getElementById('feedback').innerHTML = "¡Casi! Le toca al compañero...";
                        updateScoreboard();
                    } else {
                        document.getElementById('feedback').innerHTML = `Es <b>${correct}</b>. ¡Seguimos!`;
                        endTurn();
                    }
                }
                updateScoreboard();
            };
            grid.appendChild(btn);
        });
    }

    function endTurn() {
        document.querySelectorAll('.option').forEach(b => b.disabled = true);
        document.getElementById('next-btn').style.display = "block";
    }

    document.getElementById('next-btn').onclick = () => {
        activeP = (activeP + 1) % gameMode;
        newRound();
        updateScoreboard();
    };

    window.showStats = () => {
        document.getElementById('stats-body').innerHTML = players.map(p => `
            <div style="margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px">
                <b>${p.name}</b>: ${p.learned} banderas aprendidas.
            </div>
        `).join('');
        document.getElementById('stats-modal').style.display = 'flex';
    };
    window.closeStats = () => document.getElementById('stats-modal').style.display = 'none';

    init();
})();
