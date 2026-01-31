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
    chart: null
};

/* === МЕНЕДЖЕР PIN-КОДА === */
const PinManager = {
    init() {
        if (!STATE.pin) {
            document.getElementById('pin-status').innerText = "Придумайте новый код (4 цифры)";
        }
    },
    enter(num) {
        if (STATE.tempPin.length < 4) {
            STATE.tempPin += num;
            this.renderDots();
            if (STATE.tempPin.length === 4) this.check();
        }
    },
    backspace() {
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
                    App.unlock();
                } else {
                    Toast.show("Неверный код!");
                    document.querySelector('.pin-dots').classList.add('shake'); // Можно добавить CSS анимацию
                    STATE.tempPin = '';
                    this.renderDots();
                }
            }
        }, 200);
    }
};

/* === ОСНОВНОЕ ПРИЛОЖЕНИЕ === */
const App = {
    unlock() {
        document.getElementById('pin-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        this.updateUI();
        this.renderCats();
        ThemeManager.init();
    },

    updateUI() {
        // 1. Расчет баланса
        let inc = 0, exp = 0;
        STATE.transactions.forEach(t => {
            if(t.type === 'income') inc += t.amount;
            else exp += t.amount;
        });

        const balance = inc - exp;

        // 2. Обновление цифр
        document.getElementById('total-balance').innerText = this.formatMoney(balance);
        document.getElementById('display-inc').innerText = this.formatMoney(inc);
        document.getElementById('display-exp').innerText = this.formatMoney(exp);
        document.getElementById('chart-bal').innerText = this.formatMoney(balance);

        // 3. Списки
        this.renderHistory();
        this.renderCredits();
        this.renderAnalysis(exp); // Новая функция
        this.drawChart(inc, exp, balance);

        // 4. Тренд (простая логика)
        const trend = document.getElementById('trend-badge');
        if (balance >= 0) {
            trend.className = 'trend positive';
            trend.innerText = 'В плюсе';
        } else {
            trend.className = 'trend negative';
            trend.innerText = 'Перерасход';
        }

        // 5. Сохранение
        localStorage.setItem('neoTrans', JSON.stringify(STATE.transactions));
        localStorage.setItem('neoCredits', JSON.stringify(STATE.credits));
    },

    renderHistory() {
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        const sorted = [...STATE.transactions].reverse();
        
        if(sorted.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Операций пока нет</p>';
            return;
        }

        sorted.forEach(t => {
            const el = document.createElement('div');
            el.className = 'trans-item';
            const isInc = t.type === 'income';
            
            el.innerHTML = `
                <div class="trans-left">
                    <div class="t-icon" style="background: ${t.color}">
                        <i class="fa-solid ${t.icon}"></i>
                    </div>
                    <div>
                        <div style="font-weight:700; font-size:14px;">${t.title || t.catName}</div>
                        <div style="font-size:11px; color:var(--text-sec);">${new Date(t.id).toLocaleDateString()}</div>
                    </div>
                </div>
                <div style="font-weight:800; color: ${isInc ? 'var(--success)' : 'var(--text-main)'}">
                    ${isInc ? '+' : '-'} ${this.formatMoney(t.amount)}
                </div>
                <button onclick="App.deleteTrans(${t.id})" style="border:none; background:none; color:#ccc; margin-left:10px;"><i class="fa-solid fa-trash"></i></button>
            `;
            list.appendChild(el);
        });
    },

    // НОВАЯ ПОЛЕЗНАЯ ФУНКЦИЯ: Анализ категорий
    renderAnalysis(totalExp) {
        const list = document.getElementById('category-analysis');
        list.innerHTML = '';

        if (totalExp === 0) {
            list.innerHTML = '<p class="empty-msg" style="text-align:center; color:#999; font-size:13px;">Расходов еще не было</p>';
            return;
        }

        // Группируем расходы по категориям
        let groups = {};
        STATE.transactions.filter(t => t.type === 'expense').forEach(t => {
            if (!groups[t.catId]) groups[t.catId] = { amount: 0, meta: t };
            groups[t.catId].amount += t.amount;
        });

        // Сортируем
        Object.values(groups).sort((a,b) => b.amount - a.amount).forEach(item => {
            const percent = Math.round((item.amount / totalExp) * 100);
            const el = document.createElement('div');
            el.className = 'bar-item';
            el.innerHTML = `
                <div class="bar-icon">
                    <i class="fa-solid ${item.meta.icon}" style="color: ${item.meta.color}"></i>
                </div>
                <div class="bar-content">
                    <div class="bar-top">
                        <span>${item.meta.catName}</span>
                        <span>${this.formatMoney(item.amount)} (${percent}%)</span>
                    </div>
                    <div class="progress-bg">
                        <div class="progress-fill" style="width: ${percent}%; background: ${item.meta.color}"></div>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
    },

    renderCredits() {
        const list = document.getElementById('credits-list');
        list.innerHTML = '';
        STATE.credits.forEach(c => {
            const percent = Math.min(100, Math.round((c.paid / c.total) * 100));
            const el = document.createElement('div');
            el.className = 'card';
            el.style.padding = '15px';
            el.style.marginBottom = '10px';
            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:5px;">
                    <span>${c.name}</span>
                    <button onclick="App.deleteCredit(${c.id})" style="border:none; background:none; color:#ccc;"><i class="fa-solid fa-times"></i></button>
                </div>
                <div style="font-size:12px; color:var(--text-sec); display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>Выплачено: ${this.formatMoney(c.paid)}</span>
                    <span>Долг: ${this.formatMoney(c.total)}</span>
                </div>
                <div class="progress-bg" style="height:8px; background:var(--bg-body);">
                    <div class="progress-fill" style="width:${percent}%; background:var(--primary);"></div>
                </div>
                ${c.paid < c.total ? 
                    `<button onclick="App.payCredit(${c.id})" style="width:100%; margin-top:10px; padding:8px; border:1px solid var(--border); background:var(--bg-body); border-radius:8px; font-weight:700; font-size:12px;">Внести платеж</button>` 
                    : '<div style="text-align:center; color:var(--success); font-size:12px; font-weight:700; margin-top:5px;">Закрыт!</div>'}
            `;
            list.appendChild(el);
        });
    },

    drawChart(inc, exp, balance) {
        const ctx = document.getElementById('finance-chart').getContext('2d');
        if (STATE.chart) STATE.chart.destroy();
        
        // Логика круга: показываем расходы vs остаток
        // Если ушли в минус, круг становится красным
        let data = [], colors = [];
        
        if (balance >= 0) {
            data = [balance, exp]; // Остаток, Расход
            colors = ['#e5e7eb', '#6366f1']; // Серый (фон), Синий (расход)
            // Или лучше: Зеленый (остаток), Красный (расход)?
            // Давай так: Весь круг - это доход. Сектор расхода откусывает от него.
            // Но если дохода нет, а расход есть?
            
            // Упрощенная визуализация как просил:
            data = [exp, Math.max(0, inc - exp)];
            colors = ['#ef4444', '#10b981']; // Красный (расход), Зеленый (свободно)
            if (inc === 0 && exp === 0) {
                data = [1]; colors = ['#e5e7eb']; // Пустой
            }
        } else {
            // Если в минусе
            data = [1];
            colors = ['#ef4444'];
        }

        STATE.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Расход', 'Свободно'],
                datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }]
            },
            options: {
                cutout: '85%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                animation: { animateScale: true }
            }
        });
    },

    renderCats() {
        const type = document.querySelector('input[name="type"]:checked').value;
        const grid = document.getElementById('cat-grid');
        grid.innerHTML = '';
        
        CONFIG.categories[type].forEach((cat, idx) => {
            const el = document.createElement('div');
            el.className = `cat-item ${idx === STATE.currentCat ? 'active' : ''}`;
            el.onclick = () => {
                STATE.currentCat = idx;
                App.renderCats(); // перерисовка для выделения
            };
            el.innerHTML = `
                <div class="cat-bubble" style="background: ${cat.color}"><i class="fa-solid ${cat.icon}"></i></div>
                <span class="cat-name">${cat.name}</span>
            `;
            grid.appendChild(el);
        });
    },

    // Действия
    addTrans(e) {
        e.preventDefault();
        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = parseFloat(document.getElementById('t-amount').value);
        const desc = document.getElementById('t-desc').value;
        
        if(!amount) return;

        const cat = CONFIG.categories[type][STATE.currentCat];
        
        STATE.transactions.push({
            id: Date.now(),
            type, amount, title: desc,
            catName: cat.name, catIcon: cat.icon, catColor: cat.color, catId: cat.id
        });

        Modal.close('trans-modal');
        e.target.reset();
        Toast.show("Запись добавлена");
        this.updateUI();
    },

    addCredit(e) {
        e.preventDefault();
        const name = document.getElementById('c-name').value;
        const total = parseFloat(document.getElementById('c-total').value);
        const paid = parseFloat(document.getElementById('c-paid').value) || 0;

        if(!name || !total) return;

        STATE.credits.push({ id: Date.now(), name, total, paid });
        Modal.close('credit-modal');
        e.target.reset();
        Toast.show("Кредит добавлен");
        this.updateUI();
    },

    payCredit(id) {
        const amount = prompt("Сколько внести?");
        if(amount) {
            const val = parseFloat(amount);
            const cred = STATE.credits.find(c => c.id === id);
            if(cred) {
                cred.paid += val;
                // Автоматически добавляем расход
                STATE.transactions.push({
                    id: Date.now(), type: 'expense', amount: val, title: 'Платеж по кредиту: ' + cred.name,
                    catName: 'Долги', catIcon: 'fa-file-invoice', catColor: '#6366f1', catId: 'debt'
                });
                Toast.show("Платеж внесен!");
                this.updateUI();
            }
        }
    },

    deleteTrans(id) {
        if(confirm("Удалить запись?")) {
            STATE.transactions = STATE.transactions.filter(t => t.id !== id);
            this.updateUI();
        }
    },
    deleteCredit(id) {
        if(confirm("Удалить кредит?")) {
            STATE.credits = STATE.credits.filter(c => c.id !== id);
            this.updateUI();
        }
    },
    resetAll() {
        if(confirm("Сбросить всё (включая PIN)?")) {
            localStorage.clear();
            location.reload();
        }
    },
    clearHistory() {
        if(confirm("Очистить историю транзакций?")) {
            STATE.transactions = [];
            this.updateUI();
        }
    },

    formatMoney(num) {
        return new Intl.NumberFormat('ru-RU').format(num) + ' ₸';
    }
};

/* === МОДАЛЬНЫЕ ОКНА === */
const Modal = {
    open(id, type) {
        document.getElementById(id).classList.add('open');
        if(type && id === 'trans-modal') {
            // Переключаем радио кнопку
            const radios = document.getElementsByName('type');
            radios.forEach(r => r.checked = (r.value === type));
            App.renderCats();
        }
    },
    close(id) {
        document.getElementById(id).classList.remove('open');
    }
};

/* === ТЕМА === */
const ThemeManager = {
    init() {
        const t = localStorage.getItem('neoTheme') || 'light';
        document.documentElement.setAttribute('data-theme', t);
    },
    toggle() {
        const curr = document.documentElement.getAttribute('data-theme');
        const next = curr === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('neoTheme', next);
    }
};

/* === УВЕДОМЛЕНИЯ === */
const Toast = {
    show(msg) {
        const con = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerText = msg;
        con.appendChild(el);
        setTimeout(() => el.remove(), 2500);
    }
};

/* === ЗАПУСК === */
document.addEventListener('DOMContentLoaded', () => {
    PinManager.init();
    
    // Слушатели форм
    document.getElementById('trans-form').onsubmit = (e) => App.addTrans(e);
    document.getElementById('credit-form').onsubmit = (e) => App.addCredit(e);
});
