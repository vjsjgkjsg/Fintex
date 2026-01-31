/* === КОНФИГУРАЦИЯ И ДАННЫЕ === */
const CONFIG = {
    categories: {
        expense: [
            { id: 'food', name: 'Еда', icon: 'fa-utensils', color: '#f59e0b' },
            { id: 'transport', name: 'Авто', icon: 'fa-car', color: '#3b82f6' },
            { id: 'shop', name: 'Покупки', icon: 'fa-bag-shopping', color: '#8b5cf6' },
            { id: 'house', name: 'Дом', icon: 'fa-house', color: '#10b981' },
            { id: 'ent', name: 'Досуг', icon: 'fa-gamepad', color: '#ec4899' },
            { id: 'other', name: 'Разное', icon: 'fa-bars', color: '#64748b' },
        ],
        income: [
            { id: 'salary', name: 'Зарплата', icon: 'fa-wallet', color: '#10b981' },
            { id: 'freelance', name: 'Подработка', icon: 'fa-laptop', color: '#3b82f6' },
            { id: 'gift', name: 'Подарок', icon: 'fa-gift', color: '#f43f5e' },
        ]
    }
};

let STATE = {
    pin: localStorage.getItem('neoPin') || null,
    transactions: JSON.parse(localStorage.getItem('neoTrans')) || [],
    credits: JSON.parse(localStorage.getItem('neoCredits')) || [],
    tempPin: '',
    currentCat: 0,
    chart: null,
    attempts: 3,        // Добавлено: счетчик попыток
    isLocked: false     // Добавлено: статус блокировки
};

/* === МЕНЕДЖЕР PIN-КОДА === */
const PinManager = {
    init() {
        if (!STATE.pin) {
            document.getElementById('pin-status').innerText = "Придумайте новый код (4 цифры)";
        }
    },
    enter(num) {
        if (STATE.isLocked) return; // Блокировка ввода

        if (STATE.tempPin.length < 4) {
            STATE.tempPin += num;
            this.renderDots();
            if (STATE.tempPin.length === 4) this.check();
        }
    },
    backspace() {
        if (STATE.isLocked) return;
        STATE.tempPin = STATE.tempPin.slice(0, -1);
        this.renderDots();
    },
    renderDots() {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((d, i) => {
            if (i < STATE.tempPin.length) d.classList.add('filled');
            else d.classList.remove('filled');
        });
    },
    check() {
        const statusText = document.getElementById('pin-status');
        const pinDotsBox = document.querySelector('.pin-dots');

        setTimeout(() => {
            if (!STATE.pin) {
                // Создание нового
                STATE.pin = STATE.tempPin;
                localStorage.setItem('neoPin', STATE.pin);
                Toast.show("PIN установлен!");
                App.unlock();
            } else {
                // Проверка
                if (STATE.tempPin === STATE.pin) {
                    STATE.attempts = 3; // Сброс попыток при успехе
                    App.unlock();
                } else {
                    // ОШИБКА
                    STATE.attempts--;
                    pinDotsBox.classList.add('shake'); // Эффект тряски
                    
                    if (STATE.attempts > 0) {
                        statusText.innerText = `Неверно! Осталось попыток: ${STATE.attempts}`;
                        statusText.classList.add('text-danger');
                    } else {
                        this.lockInput(30); // Блокировка на 30 сек
                    }

                    // Очистка после тряски
                    setTimeout(() => {
                        pinDotsBox.classList.remove('shake');
                        STATE.tempPin = '';
                        this.renderDots();
                    }, 400);
                }
            }
        }, 200);
    },

    lockInput(seconds) {
        STATE.isLocked = true;
        let timeLeft = seconds;
        const statusText = document.getElementById('pin-status');
        
        const timer = setInterval(() => {
            statusText.innerText = `Блокировка: ${timeLeft} сек.`;
            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(timer);
                STATE.isLocked = false;
                STATE.attempts = 3;
                statusText.innerText = "Введите код доступа";
                statusText.classList.remove('text-danger');
            }
        }, 1000);
    }
};

/* === ОСНОВНОЕ ПРИЛОЖЕНИЕ === */
const App = {
    unlock() {
        document.getElementById('pin-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        this.updateUI();
        this.renderCats();
        if (typeof ThemeManager !== 'undefined') ThemeManager.init();
    },

    updateUI() {
        let inc = 0, exp = 0;
        STATE.transactions.forEach(t => {
            if(t.type === 'income') inc += t.amount;
            else exp += t.amount;
        });

        const balance = inc - exp;

        document.getElementById('total-balance').innerText = this.formatMoney(balance);
        document.getElementById('display-inc').innerText = this.formatMoney(inc);
        document.getElementById('display-exp').innerText = this.formatMoney(exp);
        document.getElementById('chart-bal').innerText = this.formatMoney(balance);

        this.renderHistory();
        this.renderCredits();
        this.renderAnalysis(exp);
        this.drawChart(inc, exp, balance);

        localStorage.setItem('neoTrans', JSON.stringify(STATE.transactions));
        localStorage.setItem('neoCredits', JSON.stringify(STATE.credits));
    },

    formatMoney: n => new Intl.NumberFormat('ru-RU').format(n) + ' ₸',

    renderHistory() {
        const list = document.getElementById('history-list');
        if (!list) return;
        list.innerHTML = '';
        [...STATE.transactions].reverse().forEach(t => {
            const el = document.createElement('div');
            el.className = 'trans-item';
            el.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="cat-bubble" style="background:${t.color}; margin:0; width:30px; height:30px; font-size:12px;"><i class="fa-solid ${t.icon}"></i></div>
                    <div><b style="font-size:12px;">${t.title || t.catName}</b></div>
                </div>
                <div style="font-weight:800; font-size:13px; color:${t.type === 'income' ? 'var(--success)' : 'inherit'}">
                    ${t.type === 'income' ? '+' : '-'} ${t.amount}
                </div>
            `;
            list.appendChild(el);
        });
    },

    renderAnalysis(totalExp) {
        const list = document.getElementById('category-analysis');
        if (!list) return;
        list.innerHTML = '';
        if (totalExp === 0) return list.innerHTML = '<p style="font-size:12px; color:gray">Нет расходов</p>';

        const groups = {};
        STATE.transactions.filter(t => t.type === 'expense').forEach(t => {
            if (!groups[t.catId]) groups[t.catId] = { sum: 0, meta: t };
            groups[t.catId].sum += t.amount;
        });

        Object.values(groups).forEach(g => {
            const p = Math.round((g.sum / totalExp) * 100);
            const el = document.createElement('div');
            el.className = 'bar-item';
            el.innerHTML = `
                <div style="font-size:10px; width:60px; font-weight:700;">${g.meta.catName}</div>
                <div class="progress-bg"><div class="progress-fill" style="width:${p}%; background:${g.meta.color}"></div></div>
                <div style="font-size:10px; width:30px; text-align:right;">${p}%</div>
            `;
            list.appendChild(el);
        });
    },

    updateCreditLabels() {
        const typeInput = document.querySelector('input[name="c-type"]:checked');
        if (!typeInput) return;
        const type = typeInput.value;
        const isGoal = type === 'goal';
        document.getElementById('lbl-name').innerText = isGoal ? "На что копим?" : "Название кредита";
        document.getElementById('lbl-total').innerText = isGoal ? "Нужная сумма" : "Сумма долга";
        document.getElementById('lbl-paid').innerText = isGoal ? "Уже накоплено" : "Уже внесено";
        const btn = document.querySelector('#credit-form .save-btn');
        btn.innerText = isGoal ? "Создать цель" : "Добавить кредит";
        btn.style.background = isGoal ? "var(--success)" : "var(--primary)";
    },

    addTrans(e) {
        e.preventDefault();
        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = parseFloat(document.getElementById('t-amount').value);
        const cat = CONFIG.categories[type][STATE.currentCat];
        STATE.transactions.push({ 
            id: Date.now(), type, amount, catName: cat.name, icon: cat.icon, 
            color: cat.color, catId: cat.id, title: document.getElementById('t-desc').value 
        });
        Modal.close('trans-modal'); e.target.reset(); this.updateUI();
    },

    addCredit(e) {
        e.preventDefault();
        const type = document.querySelector('input[name="c-type"]:checked').value;
        STATE.credits.push({ 
            id: Date.now(), type, 
            name: document.getElementById('c-name').value, 
            total: parseFloat(document.getElementById('c-total').value), 
            paid: parseFloat(document.getElementById('c-paid').value) || 0 
        });
        Modal.close('credit-modal'); e.target.reset(); this.updateUI();
    },

    renderCredits() {
        const list = document.getElementById('credits-list');
        if (!list) return;
        list.innerHTML = '';
        STATE.credits.forEach(c => {
            const p = Math.min(100, Math.round((c.paid / c.total) * 100));
            const isGoal = c.type === 'goal';
            const color = isGoal ? 'var(--success)' : 'var(--primary)';
            const el = document.createElement('div');
            el.className = 'card'; el.style.padding = '12px'; el.style.marginBottom = '8px';
            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:800; margin-bottom:5px;">
                    <span>${isGoal ? '🎯' : '💳'} ${c.name}</span>
                    <span style="color:${color}">${p}%</span>
                </div>
                <div class="progress-bg"><div class="progress-fill" style="width:${p}%; background:${color}"></div></div>
                <div style="display:flex; justify-content:space-between; font-size:10px; margin-top:5px; color:gray;">
                    <span>${this.formatMoney(c.paid)}</span><span>${this.formatMoney(c.total)}</span>
                </div>
                <button onclick="App.payCredit(${c.id})" style="width:100%; margin-top:8px; padding:6px; border:none; background:var(--bg-body); border-radius:8px; font-size:10px; font-weight:700;">Пополнить</button>
            `;
            list.appendChild(el);
        });
    },

    payCredit(id) {
        const val = parseFloat(prompt("Сумма пополнения:"));
        if (val) {
            const c = STATE.credits.find(x => x.id === id);
            c.paid += val;
            STATE.transactions.push({ 
                id: Date.now(), type: 'expense', amount: val, catName: c.name, 
                icon: 'fa-coins', color: '#6366f1', catId: 'credit', title: 'Платеж: ' + c.name 
            });
            this.updateUI();
        }
    },

    drawChart(inc, exp, balance) {
        const canvas = document.getElementById('finance-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (STATE.chart) STATE.chart.destroy();
        const data = balance >= 0 ? [exp, balance] : [1, 0];
        const colors = balance >= 0 ? ['#6366f1', '#10b981'] : ['#ef4444', '#eee'];
        STATE.chart = new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }] },
            options: { cutout: '80%', plugins: { tooltip: { enabled: false } } }
        });
    },

    renderCats() {
        const typeInput = document.querySelector('input[name="type"]:checked');
        if (!typeInput) return;
        const type = typeInput.value;
        const grid = document.getElementById('cat-grid'); 
        if (!grid) return;
        grid.innerHTML = '';
        CONFIG.categories[type].forEach((c, i) => {
            const el = document.createElement('div');
            el.className = `cat-item ${i === STATE.currentCat ? 'active' : ''}`;
            el.onclick = () => { STATE.currentCat = i; App.renderCats(); };
            el.innerHTML = `<div class="cat-bubble" style="background:${c.color}"><i class="fa-solid ${c.icon}"></i></div><div class="cat-name">${c.name}</div>`;
            grid.appendChild(el);
        });
    },

    clearHistory() { if (confirm("Удалить историю?")) { STATE.transactions = []; this.updateUI(); } },
    resetAll() { if (confirm("Сбросить всё?")) { localStorage.clear(); location.reload(); } }
};

/* ВАЖНО: Добавь это в свой style.css, чтобы работала тряска */
/*
.shake { animation: shake 0.4s ease-in-out; }
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    50% { transform: translateX(8px); }
    75% { transform: translateX(-8px); }
}
.text-danger { color: #ef4444 !important; }
*/

document.addEventListener('DOMContentLoaded', () => {
    PinManager.init();
    const transForm = document.getElementById('trans-form');
    const creditForm = document.getElementById('credit-form');
    if (transForm) transForm.onsubmit = e => App.addTrans(e);
    if (creditForm) creditForm.onsubmit = e => App.addCredit(e);
});
