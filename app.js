const defaultState = {
    initialCash: 0,
    boxCost: 230,
    boxRevenue: 450,
    ledger: []
};

let state = { ...defaultState };

function loadState() {
    const saved = localStorage.getItem('starz_terminal_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = {
                initialCash: typeof parsed.initialCash === 'number' ? parsed.initialCash : 0,
                boxCost: typeof parsed.boxCost === 'number' ? parsed.boxCost : 230,
                boxRevenue: typeof parsed.boxRevenue === 'number' ? parsed.boxRevenue : 450,
                ledger: Array.isArray(parsed.ledger) ? parsed.ledger : []
            };
        } catch(e) {
            state = { ...defaultState };
        }
    }
}

function saveState() {
    localStorage.setItem('starz_terminal_state', JSON.stringify(state));
}

// DOM
const initialCashInput = document.getElementById('initial-cash');
const boxCostInput = document.getElementById('box-cost');
const boxRevenueInput = document.getElementById('box-revenue');

const metricCash = document.getElementById('metric-cash');
const metricPnl = document.getElementById('metric-pnl');
const metricStock = document.getElementById('metric-stock');
const metricRoi = document.getElementById('metric-roi');

const btnBuyBox = document.getElementById('btn-buy-box');
const btnSellBox = document.getElementById('btn-sell-box');
const riskAlert = document.getElementById('risk-alert');

const ledgerTbody = document.getElementById('ledger-tbody');
const ledgerCount = document.getElementById('ledger-count');
const btnClearLedger = document.getElementById('btn-clear-ledger');

const btnSnapshot = document.getElementById('btn-snapshot');
const btnExport = document.getElementById('btn-export');
const specimenModal = document.getElementById('specimen-modal');
const closeModal = document.getElementById('close-modal');
const closeSpecimen = document.getElementById('close-specimen');
const printSpecimen = document.getElementById('print-specimen');
const specimenContent = document.getElementById('specimen-content');

const canvas = document.getElementById('equityChart');
const ctx = canvas.getContext('2d');

function init() {
    initialCashInput.value = state.initialCash;
    boxCostInput.value = state.boxCost;
    boxRevenueInput.value = state.boxRevenue;
    updateButtonsText();
    recompute();
}

function updateButtonsText() {
    btnBuyBox.textContent = `Acheter 1 Box (-${state.boxCost} $)`;
    btnSellBox.textContent = `Liquider / Vendre 1 Box (+${state.boxRevenue} $)`;
}

function recompute() {
    if (!Array.isArray(state.ledger)) state.ledger = [];

    let currentCash = parseFloat(state.initialCash) || 0;
    let boxesSold = 0;
    let totalSpent = 0;
    let totalEarned = 0;
    const historyData = [currentCash];

    state.ledger.forEach(tx => {
        if (tx.type === 'ACHAT_BOX') {
            currentCash -= tx.amount;
            totalSpent += tx.amount;
        } else if (tx.type === 'VENTE_BOX') {
            currentCash += tx.amount;
            boxesSold++;
            totalEarned += tx.amount;
        }
        historyData.push(currentCash);
    });

    const netPnl = totalEarned - totalSpent;
    const roi = totalSpent > 0 ? (netPnl / totalSpent) * 100 : 0;

    metricCash.textContent = currentCash.toFixed(2) + ' $';
    metricCash.className = 'metric-val ' + (currentCash < 0 ? 'negative' : 'neutral');
    
    metricPnl.textContent = (netPnl >= 0 ? '+' : '') + netPnl.toFixed(2) + ' $';
    metricPnl.className = 'metric-val ' + (netPnl >= 0 ? 'positive' : 'negative');
    
    metricStock.textContent = boxesSold + ' box';
    metricRoi.textContent = (roi >= 0 ? '+' : '') + roi.toFixed(2) + ' %';
    metricRoi.className = 'metric-val ' + (roi >= 0 ? 'positive' : 'negative');

    drawTradingViewChart(historyData);
    renderLedger();
}

function drawTradingViewChart(data) {
    const rect = canvas.parentNode.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (data.length < 2) {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px monospace';
        ctx.fillText('Attente d\'opérations pour tracer la courbe...', 20, 30);
        return;
    }

    const padding = 20;
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = (maxVal - minVal) || 1;

    const getX = (i) => padding + (i / (data.length - 1)) * (canvas.width - 2 * padding);
    const getY = (val) => canvas.height - padding - ((val - minVal) / range) * (canvas.height - 2 * padding);

    ctx.strokeStyle = '#1f2b45';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
        const y = (canvas.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    const isUp = data[data.length - 1] >= data[0];
    const lineColor = isUp ? '#10b981' : '#ef4444';

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)');
    gradient.addColorStop(1, 'rgba(7, 9, 14, 0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
        ctx.lineTo(getX(i), getY(data[i]));
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.lineTo(getX(data.length - 1), canvas.height);
    ctx.lineTo(getX(0), canvas.height);
    ctx.fillStyle = gradient;
    ctx.fill();
}

function renderLedger() {
    ledgerTbody.innerHTML = '';
    ledgerCount.textContent = `${state.ledger.length} transactions`;

    if (state.ledger.length === 0) {
        ledgerTbody.innerHTML = `<tr class="empty-row"><td colspan="7">Aucune opération enregistrée.</td></tr>`;
        return;
    }

    let runningCash = parseFloat(state.initialCash) || 0;

    state.ledger.forEach((tx, idx) => {
        if (tx.type === 'ACHAT_BOX') runningCash -= tx.amount;
        if (tx.type === 'VENTE_BOX') runningCash += tx.amount;

        const tr = document.createElement('tr');
        const color = tx.type === 'ACHAT_BOX' ? 'var(--danger)' : 'var(--success)';

        tr.innerHTML = `
            <td style="color: var(--text-muted);">#ORD-${1000 + idx}</td>
            <td>${tx.timestamp}</td>
            <td style="font-weight: 600; color: ${color};">${tx.type === 'ACHAT_BOX' ? 'ACHAT' : 'VENTE'}</td>
            <td>${tx.desc}</td>
            <td style="color: ${color};">${tx.type === 'ACHAT_BOX' ? '-' : '+'}${tx.amount.toFixed(2)} $</td>
            <td>${runningCash.toFixed(2)} $</td>
            <td><button class="btn-text" onclick="deleteTx(${idx})">Suppr</button></td>
        `;
        ledgerTbody.appendChild(tr);
    });
}

// Events
btnBuyBox.addEventListener('click', () => {
    const cost = parseFloat(boxCostInput.value) || 0;
    state.ledger.push({
        type: 'ACHAT_BOX',
        timestamp: new Date().toLocaleTimeString(),
        desc: `Achat 1 Box`,
        amount: cost
    });
    saveState();
    recompute();
});

btnSellBox.addEventListener('click', () => {
    const rev = parseFloat(boxRevenueInput.value) || 0;
    state.ledger.push({
        type: 'VENTE_BOX',
        timestamp: new Date().toLocaleTimeString(),
        desc: `Liquidation / Revente 1 Box`,
        amount: rev
    });
    saveState();
    recompute();
});

initialCashInput.addEventListener('input', (e) => {
    state.initialCash = parseFloat(e.target.value) || 0;
    saveState();
    recompute();
});

boxCostInput.addEventListener('input', (e) => {
    state.boxCost = parseFloat(e.target.value) || 0;
    updateButtonsText();
    saveState();
    recompute();
});

boxRevenueInput.addEventListener('input', (e) => {
    state.boxRevenue = parseFloat(e.target.value) || 0;
    updateButtonsText();
    saveState();
    recompute();
});

window.deleteTx = function(idx) {
    state.ledger.splice(idx, 1);
    saveState();
    recompute();
};

btnClearLedger.addEventListener('click', () => {
    if (confirm('Réinitialiser le carnet de transactions ?')) {
        state.ledger = [];
        saveState();
        recompute();
    }
});

btnSnapshot.addEventListener('click', () => {
    let currentCash = parseFloat(state.initialCash) || 0;
    let spent = 0, earned = 0;
    state.ledger.forEach(t => {
        if (t.type === 'ACHAT_BOX') { currentCash -= t.amount; spent += t.amount; }
        if (t.type === 'VENTE_BOX') { currentCash += t.amount; earned += t.amount; }
    });

    specimenContent.innerHTML = `
        <div><strong>STARZ // SYNTHÈSE DE CLÔTURE</strong></div>
        <div>Date : ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}</div>
        <hr style="border-color: var(--border); margin: 8px 0;">
        <div>• Trésorerie Initiale : ${state.initialCash.toFixed(2)} $</div>
        <div>• Total Investi (Box) : ${spent.toFixed(2)} $</div>
        <div>• Total Recettes (Reventes) : ${earned.toFixed(2)} $</div>
        <div style="font-weight: bold; color: ${earned - spent >= 0 ? 'var(--success)' : 'var(--danger)'}">
            • Profit Net : ${(earned - spent >= 0 ? '+' : '')}${(earned - spent).toFixed(2)} $
        </div>
        <hr style="border-color: var(--border); margin: 8px 0;">
        <div><strong>Solde Final Liquide : ${currentCash.toFixed(2)} $</strong></div>
    `;
    specimenModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => specimenModal.classList.add('hidden'));
closeSpecimen.addEventListener('click', () => specimenModal.classList.add('hidden'));
printSpecimen.addEventListener('click', () => window.print());

btnExport.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `starz_data_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
});

loadState();
init();
window.addEventListener('resize', recompute);