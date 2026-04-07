(async function() {
    let countries = [];
    let currentCountry = null;
    let currentLang = 'es';
    let gameMode = 1; // 1 o 2 jugadores
    let players = [{ name: '', score: 0 }, { name: '', score: 0 }];
    let activePlayerIndex = 0;
    let isSecondAttempt = false;

    const i18n = {
        es: {
            q: "¿Qué país es?", next: "Siguiente", correct: "¡Correcto!", 
            wrong: "Incorrecto", wrongDuel: "Incorrecto, intenta el otro...",
            final: "La respuesta era: ", turn: "Turno de: ", score: "Puntos: "
        },
        en: {
            q: "Which country is it?", next: "Next", correct: "Correct!", 
            wrong: "Wrong", wrongDuel: "Wrong, other player's turn...",
            final: "The answer was: ", turn: "Turn of: ", score: "Score: "
        }
    };

    async function init() {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,translations");
        countries = await res.json();

        // Mostrar/Ocultar segundo nombre según el modo
        document.getElementById('gameMode').onchange = (e) => {
            const display = e.target.value === "2" ? "block" : "none";
            document.getElementById('p2-name').style.display = display;
        };

        document.getElementById('start-game-btn').onclick = startGame;
    }

    function startGame() {
        currentLang = document.getElementById('gameLanguage').value;
        gameMode = parseInt(document.getElementById('gameMode').value);
        players[0].name = document.getElementById('p1-name').value || "P1";
        players[1].name = document.getElementById('p2-name').value || "P2";

        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        
        if(gameMode === 2) document.getElementById('p2-hub').style.display = 'block';
        
        updateUI();
        newRound();
    }

    function updateUI() {
        const t = i18n[currentLang];
        document.getElementById('p1-label').textContent = players[0].name;
        document.getElementById('p2-label').textContent = players[1].name;
        document.getElementById('question-text').textContent = t.q;
        document.getElementById('next-btn').textContent = t.next;
        refreshTurnDisplay();
    }

    function refreshTurnDisplay() {
        const t = i18n[currentLang];
        if (gameMode === 2) {
            document.getElementById('turn-display').textContent = t.turn + players[activePlayerIndex].name;
            document.getElementById('p1-hub').className = activePlayerIndex === 0 ? 'p-score active-turn' : 'p-score';
            document.getElementById('p2-hub').className = activePlayerIndex === 1 ? 'p-score active-turn' : 'p-score';
        } else {
            document.getElementById('turn-display').textContent = t.score + players[0].score;
            document.getElementById('p1-hub').className = 'p-score active-turn';
        }
    }

    function newRound() {
        isSecondAttempt = false;
        document.getElementById('feedback').textContent = "";
        document.getElementById('next-btn').style.display = "none";
        document.getElementById('options-grid').innerHTML = "";
        
        currentCountry = countries[Math.floor(Math.random() * countries.length)];
        const nameCorrect = currentLang === 'es' ? (currentCountry.translations.spa.common) : currentCountry.name.common;
        document.getElementById('flag-img').src = currentCountry.flags.png;

        let options = [nameCorrect];
        while(options.length < 4) {
            let rand = countries[Math.floor(Math.random() * countries.length)];
            let n = currentLang === 'es' ? rand.translations.spa.common : rand.name.common;
            if(!options.includes(n)) options.push(n);
        }
        options.sort(() => Math.random() - 0.5);

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option';
            btn.textContent = opt;
            btn.onclick = () => checkAnswer(btn, opt, nameCorrect);
            document.getElementById('options-grid').appendChild(btn);
        });
    }

    function checkAnswer(btn, selected, correct) {
        const t = i18n[currentLang];
        if (selected === correct) {
            btn.classList.add('correct');
            players[activePlayerIndex].score += 10;
            document.getElementById('feedback').textContent = "✅ " + t.correct;
            finishRound(true);
        } else {
            btn.classList.add('wrong');
            btn.disabled = true;

            if (gameMode === 2 && !isSecondAttempt) {
                isSecondAttempt = true;
                document.getElementById('feedback').textContent = "❌ " + t.wrongDuel;
                activePlayerIndex = activePlayerIndex === 0 ? 1 : 0;
                refreshTurnDisplay();
            } else {
                document.getElementById('feedback').textContent = (gameMode === 2 ? "" : "❌ ") + t.final + correct;
                players[activePlayerIndex].score = Math.max(0, players[activePlayerIndex].score - 5);
                finishRound(true);
            }
        }
        document.getElementById('p1-score').textContent = players[0].score;
        document.getElementById('p2-score').textContent = players[1].score;
    }

    function finishRound(done) {
        if(done) {
            document.querySelectorAll('.option').forEach(b => b.disabled = true);
            document.getElementById('next-btn').style.display = "block";
        }
    }

    document.getElementById('next-btn').onclick = () => {
        if(gameMode === 2) activePlayerIndex = activePlayerIndex === 0 ? 1 : 0;
        newRound();
        refreshTurnDisplay();
    };

    init();
})();
