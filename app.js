const defaultState = {
    realCash: 0,
    realBoxCost: 230,
    realInitialBoxes: 0,
    realInitialUnits: 0,
    realLedger: [],
    simInitialCash: 0,
    simLedger: [],
    simBoxCost: 230,
    simBoxRevenue: 450,
    theme: 'basic',
    lang: 'en',
    currency: 'CAD',
    privacyMode: false,
    timeFilter: 'all',
    chartType: 'line',
    lineStyle: 'glow',
    showVolume: true,
    showGrid: true
};

let state = { ...defaultState };

const i18n = {
    fr: {
        cash: "TRÉSORERIE", pnl: "P&L NET", roi: "ROI", units: "UNITÉS",
        chart_sub: "PERFORMANCE FINANCIÈRE",
        execution_title: "EXÉCUTION DES ORDRES", box_capital: "CAPITAL & STOCK",
        lbl_treasury: "Trésorerie", lbl_box_cost: "Coût Box",
        box_sale: "VENTE CLIENT DIRECTE", lbl_client: "Client", lbl_model: "Modèle",
        lbl_flavor: "Goût", lbl_price: "Prix Unitaire", lbl_qty: "Quantité",
        btn_validate_sale: "VALIDER VENTE CLIENT",
        box_sim: "SIMULATION DE BOX", lbl_box_rev: "Revente Box",
        btn_sim_buy: "ACHAT TEST", btn_sim_sell: "LIQUIDATION",
        lbl_margin: "MARGE NETTE:", lbl_profit_test: "PROFIT TEST:",
        ledger_title: "CARNET D'ORDRES", btn_clear: "VIDER",
        th_time: "HEURE", th_type: "TYPE", th_detail: "DÉTAIL", th_net: "NET",
        empty_orders: "AUCUN ORDRE",
        settings_title: "Paramètres", lbl_theme: "Thème Visuel", lbl_lang: "Langue",
        lbl_currency: "Devise", btn_save: "Enregistrer",
        filter_all: "TOUT", filter_today: "AUJOURD'HUI", filter_7d: "7J"
    },
    en: {
        cash: "TREASURY", pnl: "NET P&L", roi: "ROI", units: "UNITS",
        chart_sub: "FINANCIAL PERFORMANCE",
        execution_title: "ORDER EXECUTION", box_capital: "CAPITAL & STOCK",
        lbl_treasury: "Treasury", lbl_box_cost: "Box Cost",
        box_sale: "DIRECT CLIENT SALE", lbl_client: "Client", lbl_model: "Model",
        lbl_flavor: "Flavor", lbl_price: "Unit Price", lbl_qty: "Quantity",
        btn_validate_sale: "VALIDATE SALE",
        box_sim: "BOX SIMULATION", lbl_box_rev: "Box Revenue",
        btn_sim_buy: "TEST BUY", btn_sim_sell: "LIQUIDATION",
        lbl_margin: "NET MARGIN:", lbl_profit_test: "TEST PROFIT:",
        ledger_title: "ORDER BOOK", btn_clear: "CLEAR",
        th_time: "TIME", th_type: "TYPE", th_detail: "DETAIL", th_net: "NET",
        empty_orders: "NO ORDERS",
        settings_title: "Settings", lbl_theme: "Visual Theme", lbl_lang: "Language",
        lbl_currency: "Currency", btn_save: "Save",
        filter_all: "ALL", filter_today: "TODAY", filter_7d: "7D"
    }
};

function parseNum(val) {
    if (!val) return 0;
    return parseFloat(val.toString().replace(',', '.')) || 0;
}

function t(key) {
    return i18n[state.lang][key] || key;
}

function updateTexts() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    document.documentElement.setAttribute('data-theme', state.theme);
    document.documentElement.setAttribute('data-lang', state.lang);
}

function loadState() {
    const saved = localStorage.getItem('starz_pro_final_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...defaultState, ...parsed };
        } catch(e) { state = { ...defaultState }; }
    }
}

function saveState() {
    localStorage.setItem('starz_pro_final_state', JSON.stringify(state));
}

let activeMode = 'real';
let currentChartData = [];

document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeMode = e.target.dataset.mode;
        document.getElementById('badge-mode').textContent = activeMode === 'real' ? (state.lang === 'fr' ? 'RÉEL' : 'REAL') : 'SIM';
        document.getElementById('panel-real').classList.toggle('active', activeMode === 'real');
        document.getElementById('panel-sim').classList.toggle('active', activeMode === 'sim');
        recompute();
    });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.timeFilter = e.target.dataset.filter;
        recompute();
    });
});

const tkCash = document.getElementById('tk-cash');
const tkPnl = document.getElementById('tk-pnl');
const tkRoi = document.getElementById('tk-roi');
const tkUnits = document.getElementById('tk-units');

const realInitialCashInput = document.getElementById('real-initial-cash');
const realBoxCostInput = document.getElementById('real-box-cost');
const realInitialBoxesInput = document.getElementById('real-initial-boxes');
const realInitialUnitsInput = document.getElementById('real-initial-units');
const btnRealBuyBox = document.getElementById('btn-real-buy-box');

const simInitialCashInput = document.getElementById('sim-initial-cash');
const simBoxCostInput = document.getElementById('sim-box-cost');
const simBoxRevenueInput = document.getElementById('sim-box-revenue');

// Elements du Calculateur de Marge Rapide
const calcPriceInput = document.getElementById('calc-price');
const calcQtyInput = document.getElementById('calc-qty');
const calcRevVal = document.getElementById('calc-rev-val');
const calcCostVal = document.getElementById('calc-cost-val');
const calcProfitVal = document.getElementById('calc-profit-val');

const ledgerTbody = document.getElementById('ledger-tbody');
const canvas = document.getElementById('tradingChart');
const ctx = canvas.getContext('2d');

let mouseX = -1;
let mouseY = -1;
let isHoveringCanvas = false;

function init() {
    realInitialCashInput.value = state.realCash;
    realBoxCostInput.value = state.realBoxCost;
    realInitialBoxesInput.value = state.realInitialBoxes || 0;
    realInitialUnitsInput.value = state.realInitialUnits || 0;

    simInitialCashInput.value = state.simInitialCash;
    simBoxCostInput.value = state.simBoxCost;
    simBoxRevenueInput.value = state.simBoxRevenue;
    
    document.getElementById('setting-theme').value = state.theme;
    document.getElementById('setting-lang').value = state.lang;
    document.getElementById('setting-currency').value = state.currency;
    document.getElementById('setting-chart-type').value = state.chartType;
    document.getElementById('setting-line-style').value = state.lineStyle;
    document.getElementById('setting-show-volume').value = state.showVolume.toString();
    document.getElementById('setting-show-grid').value = state.showGrid.toString();

    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === state.timeFilter);
    });

    const privacyBtn = document.getElementById('btn-privacy');
    privacyBtn.style.opacity = state.privacyMode ? '1' : '0.5';

    setupCanvasInteractivity();
    updateTexts();
    updateBuyButtonText();
    updateQuickCalculator();
    recompute();
}

function updateBuyButtonText() {
    const cost = parseNum(realBoxCostInput.value) || 230;
    const costStr = state.privacyMode ? '••••' : cost;
    const buyText = state.lang === 'fr' ? 'ACHETER 1 BOX' : 'BUY 1 BOX';
    btnRealBuyBox.textContent = `+ ${buyText} (-${costStr}${state.currency === 'EUR' ? '€' : '$'})`;
}

function updateQuickCalculator() {
    const price = parseNum(calcPriceInput.value);
    const qty = parseNum(calcQtyInput.value);
    const boxCost = parseNum(realBoxCostInput.value) || 230;
    // Estimation unitaire basée sur 10 unités par box (ajustable si besoin)
    const unitCost = boxCost / 10; 

    const totalRev = price * qty;
    const totalCost = unitCost * qty;
    const netProfit = totalRev - totalCost;

    calcRevVal.textContent = formatCurrency(totalRev);
    calcCostVal.textContent = formatCurrency(totalCost);
    calcProfitVal.textContent = (netProfit >= 0 ? '+' : '') + formatCurrency(netProfit);
    calcProfitVal.style.color = netProfit >= 0 ? 'var(--green)' : 'var(--red)';
}

function filterTransactions(ledger) {
    if (state.timeFilter === 'all') return ledger;
    const now = new Date();
    return ledger.filter(tx => {
        if (!tx.timestamp) return true;
        const txDate = new Date(tx.timestamp);
        if (state.timeFilter === 'today') {
            return txDate.toDateString() === now.toDateString();
        } else if (state.timeFilter === '7d') {
            const diffTime = Math.abs(now - txDate);
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            return diffDays <= 7;
        }
        return true;
    });
}

function recompute() {
    if (activeMode === 'real') {
        computeReal();
    } else {
        computeSim();
    }
}

function formatCurrency(val) {
    if (state.privacyMode) return '••••••';
    const sym = state.currency === 'EUR' ? '€' : '$';
    return `${val.toFixed(2)} ${sym}`;
}

function computeReal() {
    let currentCash = parseNum(state.realCash) || 0;
    let unitsSold = parseNum(state.realInitialUnits) || 0;
    let totalSpent = 0, totalEarned = 0;
    
    const initialBoxes = parseNum(state.realInitialBoxes) || 0;
    const boxCost = parseNum(state.realBoxCost) || 230;
    if (initialBoxes > 0) {
        totalSpent += initialBoxes * boxCost;
    }

    const historyData = [currentCash];

    state.realLedger.forEach(tx => {
        if (tx.type === 'ACHAT') {
            currentCash -= tx.amount;
            totalSpent += tx.amount;
        } else if (tx.type === 'VENTE') {
            currentCash += tx.amount;
            unitsSold += tx.units || 1;
            totalEarned += tx.amount;
        }
        historyData.push(currentCash);
    });

    const netPnl = totalEarned - totalSpent;
    const roi = totalSpent > 0 ? (netPnl / totalSpent) * 100 : 0;

    tkCash.textContent = formatCurrency(currentCash);
    tkPnl.textContent = (netPnl >= 0 ? '+' : '') + formatCurrency(netPnl);
    tkPnl.className = 'val ' + (netPnl >= 0 ? 'positive' : 'negative');
    tkRoi.textContent = state.privacyMode ? '••••' : ((roi >= 0 ? '+' : '') + roi.toFixed(2) + '%');
    tkUnits.textContent = unitsSold;

    let runningCash = parseNum(state.realCash) || 0;
    const filteredLedger = filterTransactions(state.realLedger);
    const chartHistory = [runningCash];

    state.realLedger.forEach(tx => {
        if (tx.type === 'ACHAT') runningCash -= tx.amount;
        else if (tx.type === 'VENTE') runningCash += tx.amount;

        if (filteredLedger.includes(tx)) {
            chartHistory.push(runningCash);
        }
    });

    currentChartData = chartHistory;
    renderLedger(state.realLedger);
    renderTradingChart();
}

function computeSim() {
    let simCash = parseNum(state.simInitialCash) || 0;
    let simSpent = 0, simEarned = 0, simBoxes = 0;
    const historyData = [simCash];

    state.simLedger.forEach(tx => {
        if (tx.type === 'ACHAT') {
            simCash -= tx.amount;
            simSpent += tx.amount;
        } else if (tx.type === 'VENTE') {
            simCash += tx.amount;
            simEarned += tx.amount;
            simBoxes++;
        }
        historyData.push(simCash);
    });

    currentChartData = historyData;
    const netPnl = simEarned - simSpent;
    tkCash.textContent = formatCurrency(simCash);
    tkPnl.textContent = (netPnl >= 0 ? '+' : '') + formatCurrency(netPnl);
    tkPnl.className = 'val ' + (netPnl >= 0 ? 'positive' : 'negative');
    tkRoi.textContent = simBoxes + ' BOX';
    tkUnits.textContent = simBoxes;

    const margin = (parseNum(simBoxRevenueInput.value) || 450) - (parseNum(simBoxCostInput.value) || 230);
    document.getElementById('sim-margin-val').textContent = '+' + formatCurrency(margin);
    document.getElementById('sim-pnl-val').textContent = (netPnl >= 0 ? '+' : '') + formatCurrency(netPnl);

    renderLedger(state.simLedger);
    renderTradingChart();
}

function setupCanvasInteractivity() {
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        isHoveringCanvas = true;
        renderTradingChart();
    });

    canvas.addEventListener('mouseleave', () => {
        isHoveringCanvas = false;
        renderTradingChart();
    });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.touches[0].clientX - rect.left;
            mouseY = e.touches[0].clientY - rect.top;
            isHoveringCanvas = true;
            renderTradingChart();
        }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
        isHoveringCanvas = false;
        renderTradingChart();
    });
}

function renderTradingChart() {
    const data = currentChartData;
    const rect = canvas.parentNode.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const paddingLeft = 15;
    const paddingRight = 65;
    const paddingTop = 25;
    const paddingBottom = state.showVolume ? 45 : 25;

    const isWhiteTheme = state.theme === 'white';
    const gridColor = isWhiteTheme ? '#e5e7eb' : '#2a2e39';

    if (state.showGrid) {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        for (let i = 1; i <= 4; i++) {
            const y = paddingTop + ((rect.height - paddingTop - paddingBottom) / 5) * i;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width - paddingRight, y); ctx.stroke();
        }
        for (let i = 1; i <= 6; i++) {
            const x = paddingLeft + ((rect.width - paddingLeft - paddingRight) / 7) * i;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height - paddingBottom); ctx.stroke();
        }
    }

    if (!data || data.length === 0) return;

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = (maxVal - minVal) || 1;

    const getX = (i) => paddingLeft + (i / Math.max(1, data.length - 1)) * (rect.width - paddingLeft - paddingRight);
    const getY = (val) => rect.height - paddingBottom - ((val - minVal) / range) * (rect.height - paddingTop - paddingBottom);

    const isUp = data[data.length - 1] >= data[0];
    const lineColor = isWhiteTheme ? '#111111' : (isUp ? '#089981' : '#f23645');

    if (state.showVolume) {
        const volHeight = 25;
        const volYBase = rect.height - 10;
        const colWidth = Math.max(2, ((rect.width - paddingLeft - paddingRight) / Math.max(1, data.length)) - 3);

        data.forEach((val, i) => {
            const x = getX(i);
            const isGreenOp = i === 0 || data[i] >= data[i-1];
            ctx.fillStyle = isGreenOp ? 'rgba(8, 153, 129, 0.35)' : 'rgba(242, 54, 69, 0.35)';
            ctx.fillRect(x - colWidth/2, volYBase - (volHeight * 0.7), colWidth, volHeight * 0.7);
        });
    }

    if (state.chartType === 'candlestick' && data.length > 1) {
        const candleWidth = Math.max(3, ((rect.width - paddingLeft - paddingRight) / data.length) * 0.6);
        for (let i = 1; i < data.length; i++) {
            const x = getX(i);
            const openVal = data[i-1];
            const closeVal = data[i];
            const highVal = Math.max(openVal, closeVal) + (range * 0.03);
            const lowVal = Math.min(openVal, closeVal) - (range * 0.03);

            const yOpen = getY(openVal);
            const yClose = getY(closeVal);
            const yHigh = getY(highVal);
            const yLow = getY(lowVal);

            const isGreen = closeVal >= openVal;
            ctx.strokeStyle = isGreen ? '#089981' : '#f23645';
            ctx.fillStyle = isGreen ? '#089981' : '#f23645';
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.moveTo(x, yHigh);
            ctx.lineTo(x, yLow);
            ctx.stroke();

            const bodyY = Math.min(yOpen, yClose);
            const bodyH = Math.max(2, Math.abs(yClose - yOpen));
            ctx.fillRect(x - candleWidth/2, bodyY, candleWidth, bodyH);
        }
    } else {
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(data[0]));
        for (let i = 1; i < data.length; i++) {
            ctx.lineTo(getX(i), getY(data[i]));
        }

        if (state.lineStyle === 'glow') {
            ctx.shadowColor = lineColor;
            ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (state.chartType === 'area') {
            const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
            if (isWhiteTheme) {
                gradient.addColorStop(0, 'rgba(17, 17, 17, 0.2)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            } else {
                gradient.addColorStop(0, isUp ? 'rgba(8, 153, 129, 0.3)' : 'rgba(242, 54, 69, 0.3)');
                gradient.addColorStop(1, 'rgba(19, 23, 34, 0)');
            }
            ctx.lineTo(getX(data.length - 1), rect.height - paddingBottom);
            ctx.lineTo(getX(0), rect.height - paddingBottom);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        for (let i = 0; i < data.length; i++) {
            ctx.beginPath();
            ctx.arc(getX(i), getY(data[i]), 3.5, 0, Math.PI * 2);
            ctx.fillStyle = lineColor;
            ctx.fill();
        }
    }

    if (isHoveringCanvas && data.length > 0) {
        let closestIndex = 0;
        let minDistance = Infinity;

        for (let i = 0; i < data.length; i++) {
            const dist = Math.abs(mouseX - getX(i));
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
            }
        }

        const pointX = getX(closestIndex);
        const pointY = getY(data[closestIndex]);
        const pointVal = data[closestIndex];

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isWhiteTheme ? '#888888' : '#94a3b8';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(pointX, 0);
        ctx.lineTo(pointX, rect.height - paddingBottom);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, pointY);
        ctx.lineTo(rect.width - paddingRight, pointY);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(pointX, pointY, 6, 0, Math.PI * 2);
        ctx.fillStyle = isWhiteTheme ? '#000000' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        const badgeText = formatCurrency(pointVal);
        ctx.font = '10px monospace';
        const badgeWidth = ctx.measureText(badgeText).width + 10;

        ctx.fillStyle = lineColor;
        ctx.fillRect(rect.width - paddingRight, pointY - 10, badgeWidth, 20);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, rect.width - paddingRight + 5, pointY + 3);

        const diff = closestIndex > 0 ? pointVal - data[closestIndex - 1] : 0;
        const diffText = state.privacyMode ? '••••' : (diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff));
        const tooltipLines = [
            `Op #${closestIndex}`,
            `Cash: ${formatCurrency(pointVal)}`,
            `Var: ${diffText}`
        ];

        const boxWidth = 140;
        const boxHeight = 55;
        let boxX = pointX + 15;
        let boxY = pointY - 25;

        if (boxX + boxWidth > rect.width - paddingRight) boxX = pointX - boxWidth - 15;
        if (boxY < 10) boxY = 10;

        ctx.fillStyle = isWhiteTheme ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isWhiteTheme ? '#111111' : '#f8fafc';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(tooltipLines[0], boxX + 8, boxY + 16);

        ctx.font = '10px monospace';
        ctx.fillText(tooltipLines[1], boxX + 8, boxY + 32);

        ctx.fillStyle = diff >= 0 ? '#089981' : '#f23645';
        ctx.fillText(tooltipLines[2], boxX + 8, boxY + 46);
    }
}

function renderLedger(list) {
    ledgerTbody.innerHTML = '';
    const filteredList = filterTransactions(list);
    
    if (filteredList.length === 0) {
        ledgerTbody.innerHTML = `<tr><td colspan="5" class="empty">${t('empty_orders')}</td></tr>`;
        return;
    }
    
    filteredList.slice().reverse().forEach((tx) => {
        const realIndex = list.indexOf(tx);
        const color = tx.type === 'ACHAT' ? 'var(--red)' : 'var(--green)';
        ledgerTbody.innerHTML += `
            <tr>
                <td>${tx.time || '--:--'}</td>
                <td style="color:${color}; font-weight:700">${tx.type}</td>
                <td>${tx.desc || 'Box'}</td>
                <td style="color:${color}">${tx.type==='ACHAT'?'-':'+'}${formatCurrency(tx.amount)}</td>
                <td><button class="btn-delete-row" onclick="deleteTx(${realIndex})" title="Supprimer">🗑️</button></td>
            </tr>`;
    });
}

window.deleteTx = function(index) {
    if (activeMode === 'real') {
        state.realLedger.splice(index, 1);
    } else {
        state.simLedger.splice(index, 1);
    }
    saveState();
    recompute();
}

document.getElementById('btn-privacy').addEventListener('click', () => {
    state.privacyMode = !state.privacyMode;
    document.getElementById('btn-privacy').style.opacity = state.privacyMode ? '1' : '0.5';
    saveState();
    updateBuyButtonText();
    recompute();
});

btnRealBuyBox.addEventListener('click', () => {
    const cost = parseNum(realBoxCostInput.value) || 230;
    state.realLedger.push({
        type: 'ACHAT',
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: state.lang === 'fr' ? 'Achat Box' : 'Box Buy',
        amount: cost
    });
    saveState(); recompute();
});

document.getElementById('btn-real-sell-unit').addEventListener('click', () => {
    const client = document.getElementById('client-name').value.trim() || 'Client';
    const model = document.getElementById('client-model').value.trim() || 'Standard';
    const unitPrice = parseNum(document.getElementById('client-price').value) || 45;
    const qty = parseInt(document.getElementById('client-qty').value) || 1;
    const totalAmount = unitPrice * qty;

    state.realLedger.push({
        type: 'VENTE',
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: `${client} (${model}) [x${qty}]`,
        amount: totalAmount,
        units: qty
    });

    document.getElementById('client-name').value = '';
    document.getElementById('client-model').value = '';
    document.getElementById('client-qty').value = '1';
    saveState(); recompute();
});

document.getElementById('btn-sim-buy').addEventListener('click', () => {
    state.simLedger.push({
        type: 'ACHAT',
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: 'Box Sim',
        amount: parseNum(simBoxCostInput.value) || 230
    });
    saveState(); recompute();
});

document.getElementById('btn-sim-sell').addEventListener('click', () => {
    state.simLedger.push({
        type: 'VENTE',
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: 'Liquidation',
        amount: parseNum(simBoxRevenueInput.value) || 450
    });
    saveState(); recompute();
});

document.getElementById('btn-clear-ledger').addEventListener('click', () => {
    const msg = state.lang === 'fr' ? 'Réinitialiser le carnet ?' : 'Clear order book?';
    if (confirm(msg)) {
        if (activeMode === 'real') state.realLedger = [];
        else state.simLedger = [];
        saveState(); recompute();
    }
});

// Écouteurs pour le calculateur rapide
calcPriceInput.addEventListener('input', updateQuickCalculator);
calcQtyInput.addEventListener('input', updateQuickCalculator);

realInitialCashInput.addEventListener('input', (e) => { state.realCash = parseNum(e.target.value); saveState(); recompute(); });
realBoxCostInput.addEventListener('input', (e) => { state.realBoxCost = parseNum(e.target.value) || 230; updateBuyButtonText(); updateQuickCalculator(); saveState(); recompute(); });
realInitialBoxesInput.addEventListener('input', (e) => { state.realInitialBoxes = parseNum(e.target.value); saveState(); recompute(); });
realInitialUnitsInput.addEventListener('input', (e) => { state.realInitialUnits = parseNum(e.target.value); saveState(); recompute(); });

simInitialCashInput.addEventListener('input', (e) => { state.simInitialCash = parseNum(e.target.value); saveState(); recompute(); });
simBoxCostInput.addEventListener('input', (e) => { state.simBoxCost = parseNum(e.target.value) || 230; saveState(); recompute(); });
simBoxRevenueInput.addEventListener('input', (e) => { state.simBoxRevenue = parseNum(e.target.value) || 450; saveState(); recompute(); });

document.getElementById('save-settings').addEventListener('click', () => {
    state.theme = document.getElementById('setting-theme').value;
    state.lang = document.getElementById('setting-lang').value;
    state.currency = document.getElementById('setting-currency').value;
    state.chartType = document.getElementById('setting-chart-type').value;
    state.lineStyle = document.getElementById('setting-line-style').value;
    state.showVolume = document.getElementById('setting-show-volume').value === 'true';
    state.showGrid = document.getElementById('setting-show-grid').value === 'true';

    saveState();
    updateTexts();
    updateBuyButtonText();
    recompute();
    document.getElementById('settings-modal').classList.add('hidden');
});

const settingsModal = document.getElementById('settings-modal');
document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));

loadState();
init();
window.addEventListener('resize', () => {
    recompute();
});