// Main Application Logic for PhD Exam Preparation
document.addEventListener("DOMContentLoaded", () => {
    // Load initial questions from questions.js (global window.INITIAL_QUESTIONS)
    let questionsList = window.INITIAL_QUESTIONS || [];
    let userAnswers = {}; // { questionId: selectedIndex }
    let isSubmitted = false;
    let timerInterval = null;
    let timeRemaining = 60 * 60; // 60 minutes in seconds

    // DOM Elements
    const questionsContainer = document.getElementById("questions-container");
    const statTotal = document.getElementById("stat-total");
    const statAnswered = document.getElementById("stat-answered");
    const statCorrect = document.getElementById("stat-correct");
    const statScore = document.getElementById("stat-score");
    const timerDisplay = document.getElementById("timer-display");

    const submitBtn = document.getElementById("submit-btn");
    const resetBtn = document.getElementById("reset-btn");
    const openJsonBtn = document.getElementById("open-json-btn");

    const finalResultCard = document.getElementById("final-result-card");
    const resultTitle = document.getElementById("result-title");
    const resultBadge = document.getElementById("result-badge");
    const resScore = document.getElementById("res-score");
    const resRaw = document.getElementById("res-raw");
    const resCorrectCnt = document.getElementById("res-correct-cnt");
    const resPercent = document.getElementById("res-percent");
    const resultExplanation = document.getElementById("result-explanation");

    // Modal elements
    const jsonModal = document.getElementById("json-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const jsonTextarea = document.getElementById("json-textarea");
    const jsonFileInput = document.getElementById("json-file-input");
    const downloadJsonBtn = document.getElementById("download-json-btn");
    const applyJsonBtn = document.getElementById("apply-json-btn");

    // Start 60 minute countdown timer
    function startTimer() {
        clearInterval(timerInterval);
        timeRemaining = 60 * 60;
        updateTimerDisplay();

        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                alert("Час іспиту вичерпано (60 хвилин)! Автоматична перевірка.");
                submitTest();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Render questions to the DOM
    function renderQuestions(filterSection = "all") {
        questionsContainer.innerHTML = "";

        let filtered = questionsList;
        if (filterSection !== "all") {
            const secNum = parseInt(filterSection, 10);
            filtered = questionsList.filter(q => q.section.startsWith(`${secNum}.`));
        }

        if (filtered.length === 0) {
            questionsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b;">Питань у цьому розділі не знайдено.</div>`;
            return;
        }

        filtered.forEach((q, idx) => {
            const card = document.createElement("div");
            card.className = "question-card";
            card.dataset.id = q.id;

            const selectedOption = userAnswers[q.id];

            let optionsHtml = "";
            q.options.forEach((optText, optIdx) => {
                const isChecked = selectedOption === optIdx ? "checked" : "";
                let itemClass = "option-item";

                if (isSubmitted) {
                    if (optIdx === q.correct) {
                        itemClass += " correct";
                    } else if (selectedOption === optIdx && selectedOption !== q.correct) {
                        itemClass += " wrong";
                    }
                }

                optionsHtml += `
                    <label class="${itemClass}">
                        <input type="radio" name="q_${q.id}" value="${optIdx}" ${isChecked} ${isSubmitted ? 'disabled' : ''}>
                        <span class="option-text">${optText}</span>
                    </label>
                `;
            });

            card.innerHTML = `
                <div class="question-meta">
                    <span class="section-tag">${q.section}</span>
                    <span class="q-number">Питання #${q.id}</span>
                </div>
                <div class="question-text">${q.question}</div>
                <div class="options-list">
                    ${optionsHtml}
                </div>
                <div class="explanation-box">
                    <strong>Пояснення:</strong> ${q.explanation || '—'}
                </div>
            `;

            questionsContainer.appendChild(card);
        });

        // Add event listeners for radio inputs
        questionsContainer.querySelectorAll("input[type='radio']").forEach(radio => {
            radio.addEventListener("change", (e) => {
                if (isSubmitted) return;
                const name = e.target.name;
                const qId = parseInt(name.replace("q_", ""), 10);
                const val = parseInt(e.target.value, 10);

                userAnswers[qId] = val;
                updateStats();
            });
        });
    }

    // Update live top statistics
    function updateStats() {
        const answeredCount = Object.keys(userAnswers).length;
        statTotal.textContent = questionsList.length;
        statAnswered.textContent = `${answeredCount} / ${questionsList.length}`;

        if (isSubmitted) {
            let correctCount = 0;
            questionsList.forEach(q => {
                if (userAnswers[q.id] === q.correct) {
                    correctCount++;
                }
            });

            statCorrect.textContent = `${correctCount} / ${questionsList.length}`;

            // Calculation according to official SumDU formula from syllabus:
            // T = 120 (each question = 4 raw points)
            // Raw points N = correctCount * 4
            // Formula: O = O_min + k * (N - r * T)
            // O_min = 100, k = 1.004, r = 0.17 => r * T = 20.4
            // O = 100 + 1.004 * (N - 20.4)
            const N = correctCount * 4;
            const rT = 0.17 * 120; // 20.4
            const k = 1.004
            let score = 100;

            if (N === 0) {
                score = 0;
            } else if (N < rT) {
                score = Math.round(100 + k * (N - rT)); // Below minimum threshold
            } else {
                score = Math.round(100 + k * (N - rT));
            }

            statScore.textContent = score;
        }
    }

    // Submit test function
    function submitTest() {
        if (isSubmitted) return;
        isSubmitted = true;
        clearInterval(timerInterval);
        document.body.classList.add("submitted");

        // Calculate score
        let correctCount = 0;
        questionsList.forEach(q => {
            if (userAnswers[q.id] === q.correct) {
                correctCount++;
            }
        });

        const rawPoints = correctCount * 4;
        const totalRaw = questionsList.length * 4;
        const k = 1.004
        const rT = 0.17 * totalRaw; // 20.4

        let score = 0;
        if (rawPoints > 0) {
            score = Math.round(100 + k * (rawPoints - rT));
        }

        const isPassed = rawPoints >= rT && score >= 100;
        const percent = Math.round((correctCount / questionsList.length) * 100);

        // Display results card
        finalResultCard.classList.remove("hidden");
        if (isPassed) {
            finalResultCard.className = "result-card passed";
            resultTitle.textContent = "Вітаємо! Іспит складено успішно!";
            resultBadge.textContent = "ЗАРАХОВАНО";
            resultBadge.className = "badge text-success";
        } else {
            finalResultCard.className = "result-card failed";
            resultTitle.textContent = "На жаль, поріг не подолано";
            resultBadge.textContent = "НЕ ЗАРАХОВАНО";
            resultBadge.className = "badge text-danger";
        }

        resScore.textContent = score;
        resRaw.textContent = `${rawPoints} / ${totalRaw}`;
        resCorrectCnt.textContent = `${correctCount} / ${questionsList.length}`;
        resPercent.textContent = `${percent}%`;

        resultExplanation.innerHTML = `Мінімально-допустимий тестовий поріг становить 17% (${rT} тестових балів / оцінка 100). Ваша підсумкова оцінка за шкалою 100–200 склала <strong>${score} балів</strong>.`;

        updateStats();
        renderQuestions(document.querySelector(".filter-btn.active").dataset.section);
    }

    // Reset test
    function resetTest() {
        if (confirm("Ви дійсно бажаєте скинути всі відповіді та розпочати спочатку?")) {
            userAnswers = {};
            isSubmitted = false;
            document.body.classList.remove("submitted");
            finalResultCard.classList.add("hidden");
            startTimer();
            updateStats();
            renderQuestions("all");
        }
    }

    // Filter Tab Click Handlers
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            renderQuestions(e.target.dataset.section);
        });
    });

    // Event listeners
    submitBtn.addEventListener("click", submitTest);
    resetBtn.addEventListener("click", resetTest);

    // JSON Modal Controls
    openJsonBtn.addEventListener("click", () => {
        jsonTextarea.value = JSON.stringify(questionsList, null, 2);
        jsonModal.classList.remove("hidden");
    });

    closeModalBtn.addEventListener("click", () => {
        jsonModal.classList.add("hidden");
    });

    applyJsonBtn.addEventListener("click", () => {
        try {
            const parsed = JSON.parse(jsonTextarea.value);
            if (!Array.isArray(parsed)) {
                alert("Помилка: JSON повинен бути масивом об'єктів питань.");
                return;
            }
            questionsList = parsed;
            userAnswers = {};
            isSubmitted = false;
            document.body.classList.remove("submitted");
            finalResultCard.classList.add("hidden");
            jsonModal.classList.add("hidden");
            startTimer();
            updateStats();
            renderQuestions("all");
            alert("Масив питань успішно оновлено!");
        } catch (err) {
            alert("Помилка у форматі JSON: " + err.message);
        }
    });

    downloadJsonBtn.addEventListener("click", () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questionsList, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "questions.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    jsonFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                jsonTextarea.value = event.target.result;
            } catch (err) {
                alert("Помилка зчитування файлу: " + err.message);
            }
        };
        reader.readAsText(file);
    });

    // Initialization
    startTimer();
    updateStats();
    renderQuestions("all");
});
