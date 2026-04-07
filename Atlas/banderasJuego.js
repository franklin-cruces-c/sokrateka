(async function() {
    let countries = [];
    let currentCountry = null;
    let players = [];
    let activeP = 0;
    let gameMode = 1;
    let isSecondAttempt = false;

    async function init() {
        // Carga multilenguaje desde la API de tu Atlas
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,translations");
        countries = await res.json();

        document.getElementById('gameMode').onchange = (e) => {
            const mode = parseInt(e.target.value);
            document.getElementById('p2-name').style.display = mode >= 2 ? 'block' : 'none';
            document.getElementById('p3-name').style.display = mode >= 3 ? 'block' : 'none';
        };

        document.getElementById('start-game-btn').onclick = startGame;
    }

    function startGame() {
        gameMode = parseInt(document.getElementById('gameMode').value);
        for(let i=1; i<=gameMode; i++) {
            players.push({
                name: document.getElementById(`p${i}-name`).value || `Explorador ${i}`,
                score: 0,
                learned: 0,
                toDedicateTime: {} // Antes llamado "difíciles"
            });
        }
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        renderScoreboard();
        newRound();
    }

    function renderScoreboard() {
        const container = document.getElementById('scoreboard');
        container.innerHTML = players.map((p, i) => `
            <div class="p-score ${i === activeP ? 'active-turn' : ''}">
                <div style="font-size:0.8rem; color:#666">${p.name}</div>
                <div style="font-weight:bold">✨ ${p.score}</div>
            </div>
        `).join('');
    }

    function newRound() {
        isSecondAttempt = false;
        document.getElementById('feedback').innerHTML = "";
        document.getElementById('next-btn').style.display = "none";
        document.getElementById('options-grid').innerHTML = "";
        
        currentCountry = countries[Math.floor(Math.random() * countries.length)];
        const correctName = currentCountry.translations.spa.common; // Español por defecto
        document.getElementById('flag-img').src = currentCountry.flags.png;

        let options = [correctName];
        while(options.length < 4) {
            let n = countries[Math.floor(Math.random() * countries.length)].translations.spa.common;
            if(!options.includes(n)) options.push(n);
        }
        options.sort(() => Math.random() - 0.5);

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option';
            btn.textContent = opt;
            btn.onclick = () => check(btn, opt, correctName);
            document.getElementById('options-grid').appendChild(btn);
        });
    }

    function check(btn, selected, correct) {
        if(selected === correct) {
            btn.classList.add('correct');
            players[activeP].score += 10;
            players[activeP].learned++;
            document.getElementById('feedback').innerHTML = "🌟 ¡Qué buena memoria!";
            finish();
        } else {
            btn.classList.add('wrong');
            btn.disabled = true;
            players[activeP].toDedicateTime[correct] = (players[activeP].toDedicateTime[correct] || 0) + 1;

            if(gameMode > 1 && !isSecondAttempt) {
                isSecondAttempt = true;
                document.getElementById('feedback').innerHTML = "¡Casi! ¿Alguien más quiere intentarlo?";
                activeP = (activeP + 1) % gameMode;
                renderScoreboard();
            } else {
                document.getElementById('feedback').innerHTML = `Este es <b>${correct}</b>. ¡Apuntado para la próxima!`;
                finish();
            }
        }
        renderScoreboard();
    }

    function finish() {
        document.querySelectorAll('.option').forEach(b => b.disabled = true);
        document.getElementById('next-btn').style.display = "block";
    }

    window.showStats = () => {
        const body = document.getElementById('stats-body');
        body.innerHTML = players.map(p => {
            const list = Object.entries(p.toDedicateTime)
                .sort((a,b) => b[1] - a[1]).slice(0,3).map(x => x[0]).join(", ");
            return `
                <div style="margin-bottom:15px">
                    <b>${p.name}</b><br>
                    Países conocidos: ${p.learned}<br>
                    <span style="color:#1f6feb; font-size:0.9rem">
                        💡 Próximo objetivo: ${list || "¡Nuevas banderas!"}
                    </span>
                </div>
            `;
        }).join("<hr>");
        document.getElementById('stats-modal').style.display = 'flex';
    };

    window.closeStats = () => document.getElementById('stats-modal').style.display = 'none';
    document.getElementById('next-btn').onclick = () => {
        activeP = (activeP + 1) % gameMode;
        newRound();
        renderScoreboard();
    };

    init();
})();
