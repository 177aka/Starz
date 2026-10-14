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
    lang: 'fr',
    currency: 'CAD',
    privacyMode: false,
    timeFilter: '1d',
    chartType: 'candlestick',
    lineStyle: 'glow',
    showVolume: true,
    showGrid: true,
    activeTab: 'tab-execution'
};

let state = { ...defaultState };

function parseNum(val) {
    if (!val) return 0;
    return parseFloat(val.toString().replace(',', '.')) || 0;
}

function loadState() {
    const saved = localStorage.getItem('starz_pro_tradingview_v6');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...defaultState, ...parsed };
        } catch(e) { state = { ...defaultState }; }
    }
}

function saveState() {
    localStorage.setItem('starz_pro_tradingview_v6', JSON.stringify(state));
}

function showNotification(message) {
    const banner = document.getElementById('notification-banner');
    banner.textContent = message;
    banner.classList.remove('hidden');
    setTimeout(() => {
        banner.classList.add('hidden');
    }, 2000);
}

let currentChartData = [];
let activeTool = 'crosshair';
let drawings = [];
let isDrawingLine = false;
let startLinePoint = null;

document.getElementById('tool-crosshair').addEventListener('click', () => {
    activeTool = 'crosshair';
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tool-crosshair').classList.add('active');
});

document.getElementById('tool-line').addEventListener('click', () => {
    activeTool = 'line';
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tool-line').classList.add('active');
    showNotification('Cliquez deux points sur le graphique');
});

document.getElementById('tool-clear-drawings').addEventListener('click', () => {
    drawings = [];
    renderTradingChart();
    showNotification('Tracés effacés');
});

document.querySelectorAll('.side-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.side-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const tab = e.target.dataset.tab;
        state.activeTab = tab;
        
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(tab).classList.add('active');
    });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.timeFilter = e.target.dataset.filter;
        document.getElementById('active-tf-label').textContent = e.target.dataset.filter.toUpperCase();
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

const calcPriceInput = document.getElementById('calc-price');
const calcQtyInput = document.getElementById('calc-qty');
const calcRevVal = document.getElementById('calc-rev-val');
const calcCostVal = document.getElementById('calc-cost-val');
const calcProfitVal = document.getElementById('calc-profit-val');

const compVolume = document.getElementById('comp-volume');
const compModeType = document.getElementById('comp-mode-type');
const compCostA = document.getElementById('comp-cost-a');
const compUnitsA = document.getElementById('comp-units-a');
const compSellA = document.getElementById('comp-sell-a');
const compCostB = document.getElementById('comp-cost-b');
const compUnitsB = document.getElementById('comp-units-b');
const compSellB = document.getElementById('comp-sell-b');
const compProfitA = document.getElementById('comp-profit-a');
const compProfitB = document.getElementById('comp-profit-b');
const compBest = document.getElementById('comp-best');

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

    document.querySelectorAll('.side-tab').forEach(b => {
        if (b.dataset.tab === state.activeTab) b.click();
    });

    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === state.timeFilter);
    });

    document.getElementById('active-tf-label').textContent = state.timeFilter.toUpperCase();

    const privacyBtn = document.getElementById('btn-privacy');
    privacyBtn.style.opacity = state.privacyMode ? '1' : '0.5';

    setupCanvasInteractivity();
    updateBuyButtonText();
    updateQuickCalculator();
    updateComparator();
    recompute();
}

function updateBuyButtonText() {
    const cost = parseNum(realBoxCostInput.value) || 230;
    const costStr = state.privacyMode ? '••••' : cost;
    btnRealBuyBox.textContent = `ACHETER 1 BOX (-${costStr}${state.currency === 'EUR' ? '€' : '$'})`;
}

function updateQuickCalculator() {
    const price = parseNum(calcPriceInput.value);
    const qty = parseNum(calcQtyInput.value);
    const boxCost = parseNum(realBoxCostInput.value) || 230;
    const unitCost = boxCost / 10; 

    const totalRev = price * qty;
    const totalCost = unitCost * qty;
    const netProfit = totalRev - totalCost;

    calcRevVal.textContent = formatCurrency(totalRev);
    calcCostVal.textContent = formatCurrency(totalCost);
    calcProfitVal.textContent = (netProfit >= 0 ? '+' : '') + formatCurrency(netProfit);
    calcProfitVal.style.color = netProfit >= 0 ? 'var(--green)' : 'var(--red)';
}

function updateComparator() {
    const volume = parseNum(compVolume.value);
    const mode = compModeType.value;

    const costA = parseNum(compCostA.value);
    const unitsA = parseNum(compUnitsA.value) || 10;
    const sellA = parseNum(compSellA.value);

    const costB = parseNum(compCostB.value);
    const unitsB = parseNum(compUnitsB.value) || 10;
    const sellB = parseNum(compSellB.value);

    let boxesA = 0, boxesB = 0;
    if (mode === 'boxes') {
        boxesA = volume;
        boxesB = volume;
    } else {
        boxesA = volume / unitsA;
        boxesB = volume / unitsB;
    }

    const totalRevA = (mode === 'boxes' ? (volume * unitsA) : volume) * sellA;
    const totalCostA = boxesA * costA;
    const profitA = totalRevA - totalCostA;

    const totalRevB = (mode === 'boxes' ? (volume * unitsB) : volume) * sellB;
    const totalCostB = boxesB * costB;
    const profitB = totalRevB - totalCostB;

    compProfitA.textContent = (profitA >= 0 ? '+' : '') + formatCurrency(profitA);
    compProfitB.textContent = (profitB >= 0 ? '+' : '') + formatCurrency(profitB);

    if (profitA >= profitB) {
        compBest.textContent = 'Modèle A';
        compBest.style.color = 'var(--green)';
    } else {
        compBest.textContent = 'Modèle B';
        compBest.style.color = 'var(--green)';
    }
}

function filterTransactions(ledger) {
    if (state.timeFilter === 'all') return ledger;
    const now = new Date();
    
    let daysLimit = 1;
    if (state.timeFilter === '1d') daysLimit = 1;
    else if (state.timeFilter === '2d') daysLimit = 2;
    else if (state.timeFilter === '3d') daysLimit = 3;
    else if (state.timeFilter === '7d') daysLimit = 7;

    return ledger.filter(tx => {
        if (!tx.timestamp) return true;
        const txDate = new Date(tx.timestamp);
        const diffTime = Math.abs(now - txDate);
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= daysLimit;
    });
}

function recompute() {
    let currentCash = parseNum(state.realCash) || 0;
    let unitsSold = parseNum(state.realInitialUnits) || 0;
    let totalSpent = 0, totalEarned = 0;
    
    const initialBoxes = parseNum(state.realInitialBoxes) || 0;
    const boxCost = parseNum(realBoxCostInput.value) || 230;
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

function formatCurrency(val) {
    if (state.privacyMode) return '••••••';
    const sym = state.currency === 'EUR' ? '€' : '$';
    return `${val.toFixed(2)} ${sym}`;
}

function setupCanvasInteractivity() {
    canvas.addEventListener('mousedown', (e) => {
        if (activeTool === 'line') {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (!isDrawingLine) {
                isDrawingLine = true;
                startLinePoint = { x, y };
            } else {
                isDrawingLine = false;
                drawings.push({ x1: startLinePoint.x, y1: startLinePoint.y, x2: x, y2: y });
                startLinePoint = null;
                renderTradingChart();
            }
        }
    });

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
}

function renderTradingChart() {
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

    const paddingLeft = 10;
    const paddingRight = 50;
    const paddingTop = 15;
    const paddingBottom = state.showVolume ? 30 : 15;

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
        const volHeight = 18;
        const volYBase = rect.height - 4;
        const colWidth = Math.max(2, ((rect.width - paddingLeft - paddingRight) / Math.max(1, data.length)) - 2);

        data.forEach((val, i) => {
            const x = getX(i);
            const isGreenOp = i === 0 || data[i] >= data[i-1];
            ctx.fillStyle = isGreenOp ? 'rgba(8, 153, 129, 0.35)' : 'rgba(242, 54, 69, 0.35)';
            ctx.fillRect(x - colWidth/2, volYBase - (volHeight * 0.7), colWidth, volHeight * 0.7);
        });
    }

    if (state.chartType === 'candlestick' && data.length > 1) {
        const candleWidth = Math.max(2.5, ((rect.width - paddingLeft - paddingRight) / data.length) * 0.5);
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
            ctx.lineWidth = 1.2;

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
            ctx.shadowBlur = 6;
        }

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = '#2962ff';
    ctx.lineWidth = 1.5;
    drawings.forEach(d => {
        ctx.beginPath();
        ctx.moveTo(d.x1, d.y1);
        ctx.lineTo(d.x2, d.y2);
        ctx.stroke();
    });

    if (isDrawingLine && startLinePoint) {
        ctx.strokeStyle = 'rgba(41, 98, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(startLinePoint.x, startLinePoint.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.stroke();
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

        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isWhiteTheme ? '#888888' : '#94a3b8';
        ctx.lineWidth = 0.8;

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
        ctx.arc(pointX, pointY, 4, 0, Math.PI * 2);
        ctx.fillStyle = isWhiteTheme ? '#000000' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

function renderLedger(list) {
    ledgerTbody.innerHTML = '';
    const filteredList = filterTransactions(list);
    
    if (filteredList.length === 0) {
        ledgerTbody.innerHTML = `<tr><td colspan="5" class="empty">AUCUN ORDRE</td></tr>`;
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
                <td><button class="btn-delete-row" onclick="deleteTx(${realIndex})">X</button></td>
            </tr>`;
    });
}

window.deleteTx = function(index) {
    state.realLedger.splice(index, 1);
    saveState();
    recompute();
    showNotification('Ordre supprimé');
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
        desc: 'Achat Box',
        amount: cost
    });
    saveState(); 
    recompute();
    showNotification('Box achetée');
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
    saveState(); 
    recompute();
    showNotification('Vente enregistrée');
});

document.getElementById('btn-sim-buy').addEventListener('click', () => {
    state.simLedger.push({
        type: 'ACHAT',
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: 'Box Sim',
        amount: parseNum(simBoxCostInput.value) || 230
    });
    saveState(); 
    recompute();
    showNotification('Achat simulé');
});

document.getElementById('btn-sim-sell').addEventListener('click', () => {
    state.simLedger.push({
        type: 'VENTE',
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: 'Liquidation',
        amount: parseNum(simBoxRevenueInput.value) || 450
    });
    saveState(); 
    recompute();
    showNotification('Vente simulée');
});

document.getElementById('btn-clear-ledger').addEventListener('click', () => {
    if (confirm('Vider le carnet d\'ordres ?')) {
        state.realLedger = [];
        saveState(); 
        recompute();
        showNotification('Carnet vidé');
    }
});

calcPriceInput.addEventListener('input', updateQuickCalculator);
calcQtyInput.addEventListener('input', updateQuickCalculator);

compVolume.addEventListener('input', updateComparator);
compModeType.addEventListener('change', updateComparator);
compCostA.addEventListener('input', updateComparator);
compUnitsA.addEventListener('input', updateComparator);
compSellA.addEventListener('input', updateComparator);
compCostB.addEventListener('input', updateComparator);
compUnitsB.addEventListener('input', updateComparator);
compSellB.addEventListener('input', updateComparator);

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
    updateBuyButtonText();
    recompute();
    document.getElementById('settings-modal').classList.add('hidden');
    showNotification('Paramètres enregistrés');
});

const settingsModal = document.getElementById('settings-modal');
document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));

loadState();
init();
window.addEventListener('resize', () => {
    recompute();
});