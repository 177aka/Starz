document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'u' || e.key === 's' || e.key === 'a')) {
        e.preventDefault();
    }
});

// --- DICTIONNAIRE MULTILINGUE (FR / EN) ---
const translations = {
    fr: {
        'lbl-cash': 'TRÉSORERIE',
        'lbl-pnl': 'P&L NET',
        'lbl-units': 'UNITÉS',
        'chart-title': 'ÉVOLUTION DE LA TRÉSORERIE',
        'opt-line': 'Ligne',
        'opt-step': 'Cubes (Step)',
        'opt-area': 'Aire Dégradée',
        'tf-1d': '1 J', 'tf-2d': '2 J', 'tf-3d': '3 J', 'tf-7d': '7 J', 'tf-all': 'Tout',
        'tab-orders': 'Ordres', 'tab-comp': 'Comparateur', 'tab-sim': 'Simulation',
        'card-capital': 'CAPITAL & STOCK',
        'lbl-init-cash': 'Trésorerie Initiale',
        'lbl-box-cost': 'Coût Box Standard',
        'btn-buy-box': 'ACHETER 1 BOX',
        'card-sale': 'VENTE CLIENT DIRECTE',
        'lbl-client': 'Client',
        'lbl-model': 'Modèle',
        'lbl-unit-price': 'Prix Unitaire',
        'lbl-qty': 'Quantité',
        'btn-validate-sale': 'VALIDER VENTE',
        'card-ledger': "CARNET D'ORDRES",
        'btn-clear': 'Vider',
        'th-time': 'Heure', 'th-type': 'Type', 'th-details': 'Détails', 'th-net': 'Net',
        'empty-ledger': 'Aucun ordre',
        'card-comp-title': 'COMPARATEUR DE STRATÉGIES',
        'lbl-volume': 'Volume (Boîtes)',
        'lbl-units-box': 'Unités / Boîte',
        'lbl-cost-a': 'Coût Box A', 'lbl-sell-a': 'Revente Unité A',
        'lbl-cost-b': 'Coût Box B', 'lbl-sell-b': 'Revente Unité B',
        'res-prof-a': 'Profit Modèle A:', 'res-prof-b': 'Profit Modèle B:', 'res-best': 'Le plus rentable:',
        'card-calc-fast': 'CALCULATEUR DE MARGE RAPIDE',
        'res-ca': "CA Estimé:", 'res-pru': 'Coût Estimé (PRU):', 'res-net': 'Profit Net Prévu:',
        'card-sim-graph': 'SIMULATION SUR GRAPHIQUE',
        'lbl-sim-cash': 'Trésorerie Initiale Sim',
        'lbl-sim-cost': 'Coût Box Sim', 'lbl-sim-rev': 'Revente Box Sim',
        'btn-sim-buy': 'ACHAT TEST', 'btn-sim-sell': 'LIQUIDATION', 'btn-sim-reset': 'RÉINITIALISER SIM'
    },
    en: {
        'lbl-cash': 'CASH FLOW',
        'lbl-pnl': 'NET P&L',
        'lbl-units': 'UNITS',
        'chart-title': 'CASH FLOW EVOLUTION',
        'opt-line': 'Line',
        'opt-step': 'Cubes (Step)',
        'opt-area': 'Gradient Area',
        'tf-1d': '1 D', 'tf-2d': '2 D', 'tf-3d': '3 D', 'tf-7d': '7 D', 'tf-all': 'All',
        'tab-orders': 'Orders', 'tab-comp': 'Comparator', 'tab-sim': 'Simulator',
        'card-capital': 'CAPITAL & STOCK',
        'lbl-init-cash': 'Initial Cash',
        'lbl-box-cost': 'Standard Box Cost',
        'btn-buy-box': 'BUY 1 BOX',
        'card-sale': 'DIRECT CLIENT SALE',
        'lbl-client': 'Client',
        'lbl-model': 'Model',
        'lbl-unit-price': 'Unit Price',
        'lbl-qty': 'Quantity',
        'btn-validate-sale': 'VALIDATE SALE',
        'card-ledger': 'ORDER LEDGER',
        'btn-clear': 'Clear',
        'th-time': 'Time', 'th-type': 'Type', 'th-details': 'Details', 'th-net': 'Net',
        'empty-ledger': 'No orders',
        'card-comp-title': 'STRATEGY COMPARATOR',
        'lbl-volume': 'Volume (Boxes)',
        'lbl-units-box': 'Units / Box',
        'lbl-cost-a': 'Box Cost A', 'lbl-sell-a': 'Unit Sell A',
        'lbl-cost-b': 'Box Cost B', 'lbl-sell-b': 'Unit Sell B',
        'res-prof-a': 'Model A Profit:', 'res-prof-b': 'Model B Profit:', 'res-best': 'Most Profitable:',
        'card-calc-fast': 'QUICK MARGIN CALCULATOR',
        'res-ca': 'Estimated Rev:', 'res-pru': 'Estimated Cost (PRU):', 'res-net': 'Expected Net Profit:',
        'card-sim-graph': 'CHART SIMULATION',
        'lbl-sim-cash': 'Sim Initial Cash',
        'lbl-sim-cost': 'Sim Box Cost', 'lbl-sim-rev': 'Sim Box Revenue',
        'btn-sim-buy': 'TEST BUY', 'btn-sim-sell': 'LIQUIDATION', 'btn-sim-reset': 'RESET SIM'
    }
};

const defaultState = {
    realCash: 1000,
    realBoxCost: 230,
    realLedger: [],
    simInitialCash: 1000,
    simLedger: [],
    simBoxCost: 230,
    simBoxRevenue: 450,
    theme: 'dark',
    lang: 'fr',
    chartStyle: 'line',
    privacyMode: false,
    timeFilter: '1d',
    activeTab: 'tab-execution',
    // Valeurs des champs de saisie pour sauvegarde totale
    inputs: {
        'real-initial-cash': '1000',
        'real-box-cost': '230',
        'client-name': '',
        'client-model': '',
        'client-price': '45',
        'client-qty': '1',
        'comp-volume': '1',
        'comp-units-per-box': '10',
        'comp-cost-a': '190',
        'comp-sell-a': '30',
        'comp-cost-b': '230',
        'comp-sell-b': '45',
        'calc-price': '45',
        'calc-qty': '1',
        'sim-initial-cash': '1000',
        'sim-box-cost': '230',
        'sim-box-revenue': '450'
    }
};

let state = { ...defaultState };

function parseNum(val) {
    if (!val) return 0;
    return parseFloat(val.toString().replace(',', '.')) || 0;
}

function loadState() {
    const saved = localStorage.getItem('starz_pro_v13');
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            state = { 
                ...defaultState, 
                ...parsed, 
                inputs: { ...defaultState.inputs, ...(parsed.inputs || {}) } 
            }; 
        } 
        catch(e) { state = { ...defaultState }; }
    }
}

function saveState() {
    localStorage.setItem('starz_pro_v13', JSON.stringify(state));
}

// Sauvegarde l'état de tous les champs input à la volée
function saveInputsToState() {
    Object.keys(state.inputs).forEach(id => {
        const el = document.getElementById(id);
        if (el) state.inputs[id] = el.value;
    });
    saveState();
}

function restoreInputsFromState() {
    Object.keys(state.inputs).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = state.inputs[id];
    });
}

function showNotification(msg) {
    const banner = document.getElementById('notification-banner');
    banner.textContent = msg;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 1800);
}

let currentChartData = [];

// --- GESTION DES THÈMES, LANGUE ET STYLE ---
const themes = ['dark', 'oled', 'white'];
const themeNames = { dark: 'Dark', oled: 'OLED', white: 'Blanc' };

document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    let nextIdx = (themes.indexOf(state.theme) + 1) % themes.length;
    state.theme = themes[nextIdx];
    applyTheme();
    saveState();
});

document.getElementById('btn-lang').addEventListener('click', () => {
    state.lang = state.lang === 'fr' ? 'en' : 'fr';
    applyLanguage();
    saveState();
});

document.getElementById('chart-style-select').addEventListener('change', (e) => {
    state.chartStyle = e.target.value;
    saveState();
    renderChart();
});

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.getElementById('btn-theme-toggle').textContent = themeNames[state.theme];
}

function applyLanguage() {
    const dict = translations[state.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.textContent = dict[key];
    });
    document.getElementById('btn-lang').textContent = state.lang.toUpperCase();
}

// --- ONGLETS & FILTRES ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.activeTab = e.target.dataset.tab;
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(state.activeTab).classList.add('active');
        saveState();
        recompute();
    });
});

document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.timeFilter = e.target.dataset.filter;
        document.getElementById('active-tf-label').textContent = e.target.textContent.toUpperCase();
        saveState();
        recompute();
    });
});

// --- CANVAS & GRAPHIQUE ---
const canvas = document.getElementById('tradingChart');
const ctx = canvas.getContext('2d');
let mouseX = -1, mouseY = -1, isHovering = false;

function setupCanvasInteractivity() {
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        isHovering = true;
        renderChart();
    });
    canvas.addEventListener('mouseleave', () => {
        isHovering = false;
        renderChart();
    });
}

function formatCurrency(val) {
    if (state.privacyMode) return '••••••';
    return `${val.toFixed(2)} $`;
}

function updateComparator() {
    const numBoxes = parseNum(document.getElementById('comp-volume').value) || 1;
    const unitsPerBox = parseNum(document.getElementById('comp-units-per-box').value) || 10;
    const costA = parseNum(document.getElementById('comp-cost-a').value);
    const sellA = parseNum(document.getElementById('comp-sell-a').value);
    const costB = parseNum(document.getElementById('comp-cost-b').value);
    const sellB = parseNum(document.getElementById('comp-sell-b').value);

    const profitA = (numBoxes * unitsPerBox * sellA) - (numBoxes * costA);
    const profitB = (numBoxes * unitsPerBox * sellB) - (numBoxes * costB);

    document.getElementById('comp-profit-a').textContent = (profitA >= 0 ? '+' : '') + formatCurrency(profitA);
    document.getElementById('comp-profit-b').textContent = (profitB >= 0 ? '+' : '') + formatCurrency(profitB);

    const bestElem = document.getElementById('comp-best');
    const adviceElem = document.getElementById('comp-advice');

    if (profitA > profitB) {
        bestElem.textContent = 'Modèle A';
        adviceElem.innerHTML = state.lang === 'fr' ? `Modèle A plus rentable de <b>+${formatCurrency(profitA - profitB)}</b>.` : `Model A more profitable by <b>+${formatCurrency(profitA - profitB)}</b>.`;
    } else if (profitB > profitA) {
        bestElem.textContent = 'Modèle B';
        adviceElem.innerHTML = state.lang === 'fr' ? `Modèle B plus rentable de <b>+${formatCurrency(profitB - profitA)}</b>.` : `Model B more profitable by <b>+${formatCurrency(profitB - profitA)}</b>.`;
    } else {
        bestElem.textContent = 'Équivalent';
        adviceElem.innerHTML = state.lang === 'fr' ? `Rentabilité identique.` : `Identical profitability.`;
    }
}

function updateQuickCalculator() {
    const price = parseNum(document.getElementById('calc-price').value);
    const qty = parseNum(document.getElementById('calc-qty').value);
    const boxCost = parseNum(document.getElementById('real-box-cost').value) || 230;
    const unitCost = boxCost / 10;

    const totalRev = price * qty;
    const totalCost = unitCost * qty;
    const netProfit = totalRev - totalCost;

    document.getElementById('calc-rev-val').textContent = formatCurrency(totalRev);
    document.getElementById('calc-cost-val').textContent = formatCurrency(totalCost);
    const profitEl = document.getElementById('calc-profit-val');
    profitEl.textContent = (netProfit >= 0 ? '+' : '') + formatCurrency(netProfit);
}

function filterTransactions(ledger) {
    if (state.timeFilter === 'all') return ledger;
    const now = new Date();
    let daysLimit = 1;
    if (state.timeFilter === '2d') daysLimit = 2;
    if (state.timeFilter === '3d') daysLimit = 3;
    if (state.timeFilter === '7d') daysLimit = 7;

    return ledger.filter(tx => {
        if (!tx.timestamp) return true;
        return Math.abs(now - new Date(tx.timestamp)) / (1000 * 60 * 60 * 24) <= daysLimit;
    });
}

function recompute() {
    const isSimMode = state.activeTab === 'tab-simulator';
    let currentCash = isSimMode ? (parseNum(document.getElementById('sim-initial-cash').value) || 0) : (parseNum(document.getElementById('real-initial-cash').value) || 0);
    let totalSpent = 0, totalEarned = 0, unitsSold = 0;

    const ledger = isSimMode ? state.simLedger : state.realLedger;
    const filteredLedger = filterTransactions(ledger);
    const history = [currentCash];

    ledger.forEach(tx => {
        if (tx.type === 'ACHAT') { currentCash -= tx.amount; totalSpent += tx.amount; }
        else if (tx.type === 'VENTE') { currentCash += tx.amount; totalEarned += tx.amount; unitsSold += tx.units || 1; }
        if (filteredLedger.includes(tx)) history.push(currentCash);
    });

    const netPnl = totalEarned - totalSpent;
    const roi = totalSpent > 0 ? (netPnl / totalSpent) * 100 : 0;

    document.getElementById('tk-cash').textContent = formatCurrency(currentCash);
    document.getElementById('tk-pnl').textContent = (netPnl >= 0 ? '+' : '') + formatCurrency(netPnl);
    document.getElementById('tk-roi').textContent = state.privacyMode ? '••••' : ((roi >= 0 ? '+' : '') + roi.toFixed(2) + '%');
    document.getElementById('tk-units').textContent = unitsSold;

    currentChartData = history;
    if (!isSimMode) renderLedger(state.realLedger);
    renderChart();
    updateQuickCalculator();
}

function renderChart() {
    const data = currentChartData;
    const rect = canvas.parentNode.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const padLeft = 10, padRight = 75, padTop = 15, padBottom = 20;
    const styles = getComputedStyle(document.documentElement);
    const gridColor = styles.getPropertyValue('--border').trim();
    const textColor = styles.getPropertyValue('--text-secondary').trim();
    const lineColor = styles.getPropertyValue('--line-color').trim();

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = (maxVal - minVal) || 100;

    const getX = (i) => padLeft + (i / Math.max(1, data.length - 1)) * (rect.width - padLeft - padRight);
    const getY = (val) => rect.height - padBottom - ((val - minVal) / range) * (rect.height - padTop - padBottom);

    // GRILLE & ÉCHELLE DROITE
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.fillStyle = textColor;
    ctx.font = '10px sans-serif';

    for (let i = 0; i <= 4; i++) {
        const y = padTop + ((rect.height - padTop - padBottom) / 4) * i;
        const valAtY = maxVal - (i / 4) * range;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width - padRight, y);
        ctx.stroke();

        ctx.fillText(formatCurrency(valAtY), rect.width - padRight + 6, y + 3);
    }

    if (!data || data.length === 0) return;

    // STYLE DE GRAPHIQUE (Ligne, Cubes/Step, Aire)
    if (state.chartStyle === 'area') {
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(data[0]));
        for (let i = 1; i < data.length; i++) ctx.lineTo(getX(i), getY(data[i]));
        ctx.lineTo(getX(data.length - 1), rect.height - padBottom);
        ctx.lineTo(getX(0), rect.height - padBottom);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, padTop, 0, rect.height - padBottom);
        grad.addColorStop(0, 'rgba(0, 200, 150, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    
    if (state.chartStyle === 'step') {
        for (let i = 1; i < data.length; i++) {
            ctx.lineTo(getX(i), getY(data[i - 1]));
            ctx.lineTo(getX(i), getY(data[i]));
        }
    } else {
        for (let i = 1; i < data.length; i++) {
            ctx.lineTo(getX(i), getY(data[i]));
        }
    }

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // CROSSHAIR
    if (isHovering && data.length > 0) {
        let closestIdx = 0, minDist = Infinity;
        for (let i = 0; i < data.length; i++) {
            const dist = Math.abs(mouseX - getX(i));
            if (dist < minDist) { minDist = dist; closestIdx = i; }
        }

        const pointX = getX(closestIdx);
        const pointY = getY(data[closestIdx]);

        ctx.save();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = textColor;
        ctx.beginPath(); ctx.moveTo(pointX, 0); ctx.lineTo(pointX, rect.height - padBottom); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, pointY); ctx.lineTo(rect.width - padRight, pointY); ctx.stroke();
        ctx.restore();

        ctx.fillStyle = lineColor;
        ctx.fillRect(rect.width - padRight, pointY - 9, padRight, 18);
        ctx.fillStyle = state.theme === 'white' ? '#ffffff' : '#000000';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(formatCurrency(data[closestIdx]), rect.width - padRight + 6, pointY + 3);
    }
}

function renderLedger(list) {
    const tbody = document.getElementById('ledger-tbody');
    tbody.innerHTML = '';
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty" data-i18n="empty-ledger">${translations[state.lang]['empty-ledger']}</td></tr>`;
        return;
    }
    list.slice().reverse().forEach((tx, idx) => {
        const isBuy = tx.type === 'ACHAT';
        tbody.innerHTML += `
            <tr>
                <td>${tx.time}</td>
                <td><b>${tx.type}</b></td>
                <td>${tx.desc}</td>
                <td>${isBuy ? '-' : '+'}${formatCurrency(tx.amount)}</td>
                <td><button class="btn-del" onclick="deleteTx(${list.length - 1 - idx})">✕</button></td>
            </tr>`;
    });
}

window.deleteTx = function(i) {
    state.realLedger.splice(i, 1);
    saveState(); recompute();
};

// ACTIONS BOUTONS
document.getElementById('btn-real-buy-box').addEventListener('click', () => {
    state.realLedger.push({
        type: 'ACHAT', timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: 'Achat Box', amount: parseNum(document.getElementById('real-box-cost').value) || 230
    });
    saveState(); recompute(); showNotification(state.lang === 'fr' ? 'Box enregistrée' : 'Box saved');
});

document.getElementById('btn-real-sell-unit').addEventListener('click', () => {
    const price = parseNum(document.getElementById('client-price').value) || 45;
    const qty = parseNum(document.getElementById('client-qty').value) || 1;
    state.realLedger.push({
        type: 'VENTE', timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: `${document.getElementById('client-name').value || 'Client'} [x${qty}]`,
        amount: price * qty, units: qty
    });
    saveState(); recompute(); showNotification(state.lang === 'fr' ? 'Vente enregistrée' : 'Sale saved');
});

document.getElementById('btn-clear-ledger').addEventListener('click', () => {
    if (confirm(state.lang === 'fr' ? 'Vider le carnet ?' : 'Clear ledger?')) { state.realLedger = []; saveState(); recompute(); }
});

document.getElementById('btn-sim-buy').addEventListener('click', () => {
    state.simLedger.push({ type: 'ACHAT', timestamp: Date.now(), time: 'SIM', desc: 'Box Sim', amount: parseNum(document.getElementById('sim-box-cost').value) || 230 });
    saveState(); recompute();
});

document.getElementById('btn-sim-sell').addEventListener('click', () => {
    state.simLedger.push({ type: 'VENTE', timestamp: Date.now(), time: 'SIM', desc: 'Liq. Sim', amount: parseNum(document.getElementById('sim-box-revenue').value) || 450 });
    saveState(); recompute();
});

document.getElementById('btn-sim-reset').addEventListener('click', () => {
    state.simLedger = []; saveState(); recompute(); showNotification(state.lang === 'fr' ? 'Simulation réinitialisée' : 'Simulation reset');
});

document.getElementById('btn-privacy').addEventListener('click', () => {
    state.privacyMode = !state.privacyMode;
    saveState(); recompute();
});

// Écouteurs globaux pour sauvegarder chaque saisie instantanément
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
        saveInputsToState();
        updateComparator();
        updateQuickCalculator();
        recompute();
    });
});

// INITIALISATION AU DÉMARRAGE
loadState();
applyTheme();
applyLanguage();
restoreInputsFromState();
document.getElementById('chart-style-select').value = state.chartStyle;

// Activer le bon onglet et le bon filtre temporel sauvegardés
document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.dataset.tab === state.activeTab) b.click();
});
document.querySelectorAll('.tf-btn').forEach(b => {
    if (b.dataset.filter === state.timeFilter) b.click();
});

setupCanvasInteractivity();
updateComparator();
recompute();
window.addEventListener('resize', recompute);