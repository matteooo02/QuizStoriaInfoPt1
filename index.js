let examMode = false;
let examQuestions = [];
let answers = [];
let timerInterval;
let timeLeft;
let finalSummaryHTML = "";
let answered = false;
let reviewMode = false;
let reviewQuestions = [];



fetch("risultato.txt")
    .then(res => res.text())
    .then(text => parseQuestions(text));

let questions = [];
let i = 0;

function parseQuestions(text) {
    questions = text
        .split(/DOMANDA\s*:/)
        .slice(1)
        .map(block => {
            const [qPart, rPart] = block.split("RISPOSTA:");
            const lines = qPart.trim().split("\n");

            return {
                question: lines[0].trim(),
                options: lines
                    .slice(1)
                    .filter(l => /^[A-D]\)/.test(l.trim()))
                    .map(l => l.trim()),
                answer: rPart.trim().charAt(0)
            };
        });

    render();
}

function render() {
    answered = false;
    const q = reviewMode
        ? reviewQuestions[i]
        : examMode
            ? examQuestions[i]
            : questions[i];

    document.getElementById("counter").textContent =
        reviewMode
            ? `Ripasso ${i + 1} / ${reviewQuestions.length}`
            : examMode
                ? `Domanda ${i + 1} / 30`
                : `Domanda ${i + 1} / ${questions.length}`;


    document.getElementById("question").textContent = q.question;

    const optDiv = document.getElementById("options");
    optDiv.innerHTML = "";

    document.querySelector(".next").disabled = true;
    document.getElementById("feedback").textContent = "";

    q.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.textContent = opt;

        btn.onclick = () => {
            if (answered) return;
            check(opt[0], btn);
            answered = true;
            document.querySelector(".next").disabled = false;
        };

        optDiv.appendChild(btn);
    });
}



function check(choice, button) {
    const q = getCurrentQuestion();
    const correct = q.answer;

    const buttons = document.querySelectorAll("#options button");
    buttons.forEach(b => b.disabled = true);

    if (choice === correct) {
        button.classList.add("correct");
        document.getElementById("feedback").textContent = "✅ Giusto";
    } else {
        button.classList.add("wrong");
        document.getElementById("feedback").textContent =
            `❌ Sbagliato (era ${correct})`;

        buttons.forEach(b => {
            if (b.textContent.startsWith(correct)) {
                b.classList.add("correct");
            }
        });
    }
}



function next() {
    if (reviewMode && i === reviewQuestions.length - 1) {
        finishWeakReview();
        return;
    }

    if (examMode && i === examQuestions.length - 1) {
        finishExam();
        return;
    }

    i++;
    render();
}
function finishWeakReview() {
    reviewMode = false;

    document.querySelector(".app").innerHTML = `
    <h2>🎯 Ripasso completato</h2>
    <p>Hai ripassato le domande più difficili.</p>
    <button onclick="render()">⬅️ Torna al quiz</button>
  `;
}

const toggle = document.getElementById("themeToggle");

toggle.onclick = () => {
    document.body.classList.toggle("dark");
    toggle.textContent =
        document.body.classList.contains("dark")
            ? "☀️ Light mode"
            : "🌙 Dark mode";
};

function shuffle(array) {
    return [...array]
        .map(v => ({ v, r: Math.random() }))
        .sort((a, b) => a.r - b.r)
        .map(o => o.v);
}


function startExam() {
    examMode = true;
    i = 0;
    answers = [];

    examQuestions = shuffle(questions).slice(0, 30);

    startTimer(30 * 60); // 30 minuti
    render();
    document.getElementById("examBtn").style.display = "none";
    document.getElementById("exitExamBtn").style.display = "inline-block";

}
function startTimer(seconds) {
    timeLeft = seconds;
    updateTimer();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimer();

        if (timeLeft <= 0) {
            finishExam();
        }
    }, 1000);
}

function updateTimer() {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    document.getElementById("timer").textContent =
        `⏱️ ${min}:${sec.toString().padStart(2, "0")}`;
}



function finishExam() {
    clearInterval(timerInterval);

    let score = 0;
    examQuestions.forEach((q, idx) => {
        if (answers[idx] === q.answer) score++;
    });

    finalSummaryHTML = `
    <h2>📊 Esame completato</h2>
    <p>Risposte corrette: <strong>${score} / 30</strong></p>
    <p>Voto finale: <strong>${score}/30</strong></p>
    <button onclick="showReview()">🔍 Rivedi risposte</button>
    <button onclick="location.reload()">🔄 Nuovo esame</button>
  `;

    document.querySelector(".app").innerHTML = finalSummaryHTML;
    const stats = loadStats();

    stats.exams += 1;
    stats.bestScore = Math.max(stats.bestScore, score);
    stats.totalScore += score;

    examQuestions.forEach((q, idx) => {
        if (!stats.questions[q.question]) {
            stats.questions[q.question] = { seen: 0, wrong: 0 };
        }

        stats.questions[q.question].seen += 1;

        if (answers[idx] !== q.answer) {
            stats.questions[q.question].wrong += 1;
        }
    });

    saveStats(stats);
}


function showReview() {
    const app = document.querySelector(".app");

    app.innerHTML = `
    <button onclick="exitReview()">⬅️ Torna al risultato</button>
    <h2>📘 Revisione risposte</h2>
  `;

    examQuestions.forEach((q, idx) => {
        const userAnswer = answers[idx];
        const correct = q.answer;

        const block = document.createElement("div");
        block.className = "review-question";

        block.innerHTML = `
      <p><strong>Domanda ${idx + 1}</strong>: ${q.question}</p>
      <ul>
        ${q.options.map(opt => {
            const letter = opt[0];
            let cls = "";

            if (letter === correct) cls = "correct";
            if (letter === userAnswer && letter !== correct) cls = "wrong";

            return `<li class="${cls}">${opt}</li>`;
        }).join("")}
      </ul>
    `;

        app.appendChild(block);
    });
}
function exitReview() {
    document.querySelector(".app").innerHTML = finalSummaryHTML;
}

function exitExam() {
    if (!confirm("Vuoi uscire dalla modalità esame? I progressi andranno persi.")) {
        return;
    }

    clearInterval(timerInterval);

    examMode = false;
    examQuestions = [];
    answers = [];
    i = 0;

    document.getElementById("timer").textContent = "";
    document.getElementById("feedback").textContent = "";
    document.getElementById("examBtn").style.display = "inline-block";
    document.getElementById("exitExamBtn").style.display = "none";

    render();
}
function loadStats() {
    return JSON.parse(localStorage.getItem("stats")) || {
        exams: 0,
        bestScore: 0,
        totalScore: 0,
        questions: {}
    };
}

function saveStats(stats) {
    localStorage.setItem("stats", JSON.stringify(stats));
}

function showStats() {
    const stats = loadStats();
    const avg = stats.exams
        ? (stats.totalScore / stats.exams).toFixed(1)
        : 0;

    const app = document.querySelector(".app");

    app.innerHTML = `
    <h2>📊 Statistiche personali</h2>
    <p>Esami svolti: <strong>${stats.exams}</strong></p>
    <p>Miglior voto: <strong>${stats.bestScore}/30</strong></p>
    <p>Voto medio: <strong>${avg}/30</strong></p>

    <h3>Domande più difficili</h3>
    <ul>
      ${
        Object.entries(stats.questions)
            .sort((a, b) => b[1].wrong - a[1].wrong)
            .slice(0, 5)
            .map(([q, d]) =>
                `<li>${q} → Sbagliata ${d.wrong} / ${d.seen}</li>`
            )
            .join("")
    }
    </ul>

<button class="back-btn" onclick="exitStats()">⬅️ Torna indietro</button>
  `;
}
function exitStats() {
    location.reload();
}

function startWeakReview(limit = 10) {
    const stats = loadStats();

    // prendo solo domande sbagliate almeno una volta
    const weak = Object.entries(stats.questions)
        .filter(([_, d]) => d.wrong > 0)
        .sort((a, b) => (b[1].wrong / b[1].seen) - (a[1].wrong / a[1].seen))
        .slice(0, limit)
        .map(([questionText]) =>
            questions.find(q => q.question === questionText)
        )
        .filter(Boolean);

    if (weak.length === 0) {
        alert("🎉 Non hai ancora domande sbagliate!");
        return;
    }

    reviewMode = true;
    examMode = false;
    reviewQuestions = weak;
    i = 0;

    document.getElementById("timer").textContent = "";
    render();
}
function resetStats() {
    if (!confirm("Vuoi davvero azzerare tutte le statistiche?")) return;

    localStorage.removeItem("stats");
    alert("Statistiche azzerate ✅");
}
function getCurrentQuestion() {
    return reviewMode
        ? reviewQuestions[i]
        : examMode
            ? examQuestions[i]
            : questions[i];
}
