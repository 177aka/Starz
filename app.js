const defaultState = {
    realCash: 0,
    realBoxCost: 230,
    realLedger: [],
    simLedger: [],
    simBoxCost: 230,
    simBoxRevenue: 450,
    theme: 'basic',
    lang: 'fr',
    currency: 'CAD'
};

let state = { ...defaultState };

const i18n = {
    fr: {
        cash: "TRÉSORERIE", pnl: "P&L NET", roi: "ROI", units: "UNITÉS",
        btn_bilan: "Bilan", chart_sub: "PERFORMANCE FINANCIÈRE",
        execution_title: "EXÉCUTION DES ORDRES", box_capital: "CAPITAL & STOCK",
        lbl_treasury: "Trésorerie", lbl_box_cost: "Coût Box",
        box_sale: "VENTE CLIENT DIRECTE", lbl_client: "Client", lbl_model: "Modèle",
        lbl_flavor: "Goût", lbl_price: "Montant Encaissé", btn_validate_sale: "VALIDER VENTE CLIENT",
        box_sim: "SIMULATION DE BOX", lbl_box_rev: "Revente Box",
        btn_sim_buy: "ACHAT TEST", btn_sim_sell: "LIQUIDATION",
        lbl_margin: "MARGE NETTE:", lbl_profit_test: "PROFIT TEST:",
        ledger_title: "CARNET D'ORDRES", btn_clear: "VIDER",
        th_time: "HEURE", th_type: "TYPE", th_detail: "DÉTAIL", th_net: "NET",
        empty_orders: "AUCUN ORDRE", bilan_title: "Bilan",
        btn_img: "Télécharger Image", btn_print: "Imprimer / PDF", btn_close: "Fermer",
        settings_title: "Paramètres", lbl_theme: "Thème Visuel", lbl_lang: "Langue",
        lbl_currency: "Devise", btn_save: "Enregistrer"
    },
    en: {
        cash: "TREASURY", pnl: "NET P&L", roi: "ROI", units: "UNITS",
        btn_bilan: "Report", chart_sub: "FINANCIAL PERFORMANCE",
        execution_title: "ORDER EXECUTION", box_capital: "CAPITAL & STOCK",
        lbl_treasury: "Treasury", lbl_box_cost: "Box Cost",
        box_sale: "DIRECT CLIENT SALE", lbl_client: "Client", lbl_model: "Model",
        lbl_flavor: "Flavor", lbl_price: "Amount Received", btn_validate_sale: "VALIDATE SALE",
        box_sim: "BOX SIMULATION", lbl_box_rev: "Box Revenue",
        btn_sim_buy: "TEST BUY", btn_sim_sell: "LIQUIDATION",
        lbl_margin: "NET MARGIN:", lbl_profit_test: "TEST PROFIT:",
        ledger_title: "ORDER BOOK", btn_clear: "CLEAR",
        th_time: "TIME", th_type: "TYPE", th_detail: "DETAIL", th_net: "NET",
        empty_orders: "NO ORDERS", bilan_title: "Report",
        btn_img: "Download Image", btn_print: "Print / PDF", btn_close: "Close",
        settings_title: "Settings", lbl_theme: "Visual Theme", lbl_lang: "Language",
        lbl_currency: "Currency", btn_save: "Save"
    }
};

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
        document.getElementById('badge-mode').textContent = activeMode === 'real' ? 'RÉEL' : 'SIM';
        document.getElementById('panel-real').classList.toggle('active', activeMode === 'real');
        document.getElementById('panel-sim').classList.toggle('active', activeMode === 'sim');
        recompute();
    });
});

const tkCash = document.getElementById('tk-cash');
const tkPnl = document.getElementById('tk-pnl');
const tkRoi = document.getElementById('tk-roi');
const tkUnits = document.getElementById('tk-units');

const realInitialCashInput = document.getElementById('real-initial-cash');
const realBoxCostInput = document.getElementById('real-box-cost');
const btnRealBuyBox = document.getElementById('btn-real-buy-box');
const simBoxCostInput = document.getElementById('sim-box-cost');
const simBoxRevenueInput = document.getElementById('sim-box-revenue');

const ledgerTbody = document.getElementById('ledger-tbody');
const canvas = document.getElementById('tradingChart');
const ctx = canvas.getContext('2d');

let mouseX = -1;
let mouseY = -1;
let isHoveringCanvas = false;

function init() {
    realInitialCashInput.value = state.realCash;
    realBoxCostInput.value = state.realBoxCost;
    simBoxCostInput.value = state.simBoxCost;
    simBoxRevenueInput.value = state.simBoxRevenue;
    
    document.getElementById('setting-theme').value = state.theme;
    document.getElementById('setting-lang').value = state.lang;
    document.getElementById('setting-currency').value = state.currency;

    setupCanvasInteractivity();
    updateTexts();
    updateBuyButtonText();
    recompute();
}

function updateBuyButtonText() {
    const cost = parseFloat(realBoxCostInput.value) || 230;
    btnRealBuyBox.textContent = `+ ACHETER 1 BOX (-${cost}${state.currency === 'EUR' ? '€' : '$'})`;
}

function recompute() {
    if (activeMode === 'real') {
        computeReal();
    } else {
        computeSim();
    }
}

function formatCurrency(val) {
    const sym = state.currency === 'EUR' ? '€' : '$';
    return `${val.toFixed(2)} ${sym}`;
}

function computeReal() {
    let currentCash = parseFloat(state.realCash) || 0;
    let unitsSold = 0, totalSpent = 0, totalEarned = 0;
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

    currentChartData = historyData;
    const netPnl = totalEarned - totalSpent;
    const roi = totalSpent > 0 ? (netPnl / totalSpent) * 100 : 0;

    tkCash.textContent = formatCurrency(currentCash);
    tkPnl.textContent = (netPnl >= 0 ? '+' : '') + formatCurrency(netPnl);
    tkPnl.className = 'val ' + (netPnl >= 0 ? 'positive' : 'negative');
    tkRoi.textContent = (roi >= 0 ? '+' : '') + roi.toFixed(2) + '%';
    tkUnits.textContent = unitsSold;

    renderLedger(state.realLedger);
    renderTradingChart();
}

function computeSim() {
    let simCash = 0, simSpent = 0, simEarned = 0, simBoxes = 0;
    const historyData = [0];

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
    tkUnits.textContent = 'SIM';

    const margin = (parseFloat(simBoxRevenueInput.value) || 450) - (parseFloat(simBoxCostInput.value) || 230);
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
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paddingLeft = 15;
    const paddingRight = 65;
    const paddingTop = 25;
    const paddingBottom = 25;

    const isWhiteTheme = state.theme === 'white';
    const gridColor = isWhiteTheme ? '#e5e7eb' : '#2a2e39';
    const textColor = isWhiteTheme ? '#555555' : '#787b86';

    // Grille de fond
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;

    for (let i = 1; i <= 4; i++) {
        const y = paddingTop + ((canvas.height - paddingTop - paddingBottom) / 5) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width - paddingRight, y); ctx.stroke();
    }
    for (let i = 1; i <= 6; i++) {
        const x = paddingLeft + ((canvas.width - paddingLeft - paddingRight) / 7) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height - paddingBottom); ctx.stroke();
    }

    if (!data || data.length === 0) return;

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = (maxVal - minVal) || 1;

    const getX = (i) => paddingLeft + (i / Math.max(1, data.length - 1)) * (canvas.width - paddingLeft - paddingRight);
    const getY = (val) => canvas.height - paddingBottom - ((val - minVal) / range) * (canvas.height - paddingTop - paddingBottom);

    const isUp = data[data.length - 1] >= data[0];
    const lineColor = isWhiteTheme ? '#111111' : (isUp ? '#089981' : '#f23645');

    // Dégradé sous la courbe
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isWhiteTheme) {
        gradient.addColorStop(0, 'rgba(17, 17, 17, 0.15)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else {
        gradient.addColorStop(0, isUp ? 'rgba(8, 153, 129, 0.25)' : 'rgba(242, 54, 69, 0.25)');
        gradient.addColorStop(1, 'rgba(19, 23, 34, 0)');
    }

    // Tracé de la ligne
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
        ctx.lineTo(getX(i), getY(data[i]));
    }

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.lineTo(getX(data.length - 1), canvas.height - paddingBottom);
    ctx.lineTo(getX(0), canvas.height - paddingBottom);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Points
    for (let i = 0; i < data.length; i++) {
        ctx.beginPath();
        ctx.arc(getX(i), getY(data[i]), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
    }

    // Interaction Crosshair / Survol
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

        // Lignes pointillées du Viseur
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isWhiteTheme ? '#888888' : '#94a3b8';
        ctx.lineWidth = 1;

        // Ligne verticale
        ctx.beginPath();
        ctx.moveTo(pointX, 0);
        ctx.lineTo(pointX, canvas.height - paddingBottom);
        ctx.stroke();

        // Ligne horizontale
        ctx.beginPath();
        ctx.moveTo(0, pointY);
        ctx.lineTo(canvas.width - paddingRight, pointY);
        ctx.stroke();
        ctx.restore();

        // Point survolé lumineux
        ctx.beginPath();
        ctx.arc(pointX, pointY, 6, 0, Math.PI * 2);
        ctx.fillStyle = isWhiteTheme ? '#000000' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Badge Valeur sur l'Axe Y à droite
        const badgeText = formatCurrency(pointVal);
        ctx.font = '10px monospace';
        const badgeWidth = ctx.measureText(badgeText).width + 10;

        ctx.fillStyle = lineColor;
        ctx.fillRect(canvas.width - paddingRight, pointY - 10, badgeWidth, 20);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, canvas.width - paddingRight + 5, pointY + 3);

        // Tooltip Flottant
        const diff = closestIndex > 0 ? pointVal - data[closestIndex - 1] : 0;
        const diffText = diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff);
        const tooltipLines = [
            `Opération #${closestIndex}`,
            `Trésorerie: ${formatCurrency(pointVal)}`,
            `Var: ${diffText}`
        ];

        const boxWidth = 140;
        const boxHeight = 55;
        let boxX = pointX + 15;
        let boxY = pointY - 25;

        if (boxX + boxWidth > canvas.width - paddingRight) boxX = pointX - boxWidth - 15;
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
    if (list.length === 0) {
        ledgerTbody.innerHTML = `<tr><td colspan="4" class="empty">${t('empty_orders')}</td></tr>`;
        return;
    }
    list.slice().reverse().forEach(tx => {
        const color = tx.type === 'ACHAT' ? 'var(--red)' : 'var(--green)';
        ledgerTbody.innerHTML += `
            <tr>
                <td>${tx.time || '--:--'}</td>
                <td style="color:${color}; font-weight:700">${tx.type}</td>
                <td>${tx.desc || 'Box'}</td>
                <td style="color:${color}">${tx.type==='ACHAT'?'-':'+'}${formatCurrency(tx.amount)}</td>
            </tr>`;
    });
}

btnRealBuyBox.addEventListener('click', () => {
    const cost = parseFloat(realBoxCostInput.value) || 230;
    state.realLedger.push({
        type: 'ACHAT',
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: 'Achat Box',
        amount: cost
    });
    saveState(); recompute();
});

document.getElementById('btn-real-sell-unit').addEventListener('click', () => {
    const client = document.getElementById('client-name').value.trim() || 'Client';
    const model = document.getElementById('client-model').value.trim() || 'Standard';
    const price = parseFloat(document.getElementById('client-price').value) || 45;

    state.realLedger.push({
        type: 'VENTE',
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: `${client} (${model})`,
        amount: price,
        units: 1
    });

    document.getElementById('client-name').value = '';
    document.getElementById('client-model').value = '';
    saveState(); recompute();
});

document.getElementById('btn-sim-buy').addEventListener('click', () => {
    state.simLedger.push({
        type: 'ACHAT',
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: 'Box Sim',
        amount: parseFloat(simBoxCostInput.value) || 230
    });
    saveState(); recompute();
});

document.getElementById('btn-sim-sell').addEventListener('click', () => {
    state.simLedger.push({
        type: 'VENTE',
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        desc: 'Liquidation Sim',
        amount: parseFloat(simBoxRevenueInput.value) || 450
    });
    saveState(); recompute();
});

document.getElementById('btn-clear-ledger').addEventListener('click', () => {
    if (confirm(state.lang === 'fr' ? 'Réinitialiser le carnet ?' : 'Clear order book?')) {
        if (activeMode === 'real') state.realLedger = [];
        else state.simLedger = [];
        saveState(); recompute();
    }
});

realInitialCashInput.addEventListener('input', (e) => { state.realCash = parseFloat(e.target.value) || 0; saveState(); recompute(); });
realBoxCostInput.addEventListener('input', (e) => { state.realBoxCost = parseFloat(e.target.value) || 230; updateBuyButtonText(); saveState(); recompute(); });
simBoxCostInput.addEventListener('input', (e) => { state.simBoxCost = parseFloat(e.target.value) || 230; saveState(); recompute(); });
simBoxRevenueInput.addEventListener('input', (e) => { state.simBoxRevenue = parseFloat(e.target.value) || 450; saveState(); recompute(); });

document.getElementById('btn-snapshot').addEventListener('click', () => {
    let cash = parseFloat(state.realCash) || 0;
    let spent = 0, earned = 0;
    state.realLedger.forEach(t => {
        if (t.type === 'ACHAT') { cash -= t.amount; spent += t.amount; }
        if (t.type === 'VENTE') { cash += t.amount; earned += t.amount; }
    });

    const last10 = state.realLedger.slice(-10).reverse();
    let salesHtml = last10.length ? last10.map(s => `<tr><td>${s.time}</td><td>${s.desc}</td><td style="color:${s.type==='VENTE'?'var(--green)':'var(--red)'}">${formatCurrency(s.amount)}</td></tr>`).join('') : `<tr><td colspan="3">Aucune vente récente</td></tr>`;

    const chartDataUrl = canvas.toDataURL('image/png');

    document.getElementById('specimen-content').innerHTML = `
        <div id="bilan-printable" style="background:var(--bg-side); color:var(--text-primary); padding:10px;">
            <div style="font-size:14px; font-weight:bold; margin-bottom:6px;">STARZ // RAPPORT FINANCIER</div>
            <div style="font-size:10px; color:var(--text-secondary); margin-bottom:10px;">Date : ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}</div>
            <hr style="border-color:var(--border); margin-bottom:10px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px; font-size:11px;">
                <div>Trésorerie Initiale : <strong>${formatCurrency(state.realCash)}</strong></div>
                <div>Total Investissements : <strong>${formatCurrency(spent)}</strong></div>
                <div>Total Recettes : <strong>${formatCurrency(earned)}</strong></div>
                <div>Profit Net : <strong style="color:var(--green);">${formatCurrency(earned - spent)}</strong></div>
            </div>
            <div style="font-size:12px; font-weight:bold; margin-bottom:6px;">Aperçu Graphique</div>
            <img src="${chartDataUrl}" style="width:100%; height:120px; object-fit:contain; background:var(--bg-main); border:1px solid var(--border); margin-bottom:10px; border-radius:3px;">
            <div style="font-size:12px; font-weight:bold; margin-bottom:6px;">10 Dernières Opérations</div>
            <table style="width:100%; border-collapse:collapse; font-size:10px;">
                <thead><tr style="border-bottom:1px solid var(--border); color:var(--text-secondary);"><th style="text-align:left; padding:4px;">Heure</th><th style="text-align:left; padding:4px;">Détail</th><th style="text-align:left; padding:4px;">Montant</th></tr></thead>
                <tbody>${salesHtml}</tbody>
            </table>
            <hr style="border-color:var(--border); margin:10px 0;">
            <div style="font-size:13px; font-weight:bold;">Solde Final Liquide : ${formatCurrency(cash)}</div>
        </div>
    `;
    document.getElementById('specimen-modal').classList.remove('hidden');
});

document.getElementById('close-modal').addEventListener('click', () => document.getElementById('specimen-modal').classList.add('hidden'));
document.getElementById('close-specimen').addEventListener('click', () => document.getElementById('specimen-modal').classList.add('hidden'));

document.getElementById('print-specimen').addEventListener('click', () => {
    window.print();
});

document.getElementById('download-image').addEventListener('click', () => {
    const chartImage = canvas.toDataURL('image/png');

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = 600;
    tempCanvas.height = 700;

    const isWhiteTheme = state.theme === 'white';
    const bgColor = isWhiteTheme ? '#ffffff' : (state.theme === 'black' ? '#080808' : '#1e222d');
    const textColor = isWhiteTheme ? '#111111' : '#d1d4dc';
    const subTextColor = isWhiteTheme ? '#555555' : '#787b86';

    tempCtx.fillStyle = bgColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.fillStyle = textColor;
    tempCtx.font = 'bold 16px monospace';
    tempCtx.fillText('STARZ // RAPPORT FINANCIER', 20, 35);

    tempCtx.fillStyle = subTextColor;
    tempCtx.font = '11px monospace';
    tempCtx.fillText(`Date : ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`, 20, 55);

    tempCtx.strokeStyle = isWhiteTheme ? '#d1d5db' : '#2a2e39';
    tempCtx.lineWidth = 1;
    tempCtx.beginPath();
    tempCtx.moveTo(20, 70);
    tempCtx.lineTo(580, 70);
    tempCtx.stroke();

    let cash = parseFloat(state.realCash) || 0;
    let spent = 0, earned = 0;
    state.realLedger.forEach(t => {
        if (t.type === 'ACHAT') { cash -= t.amount; spent += t.amount; }
        if (t.type === 'VENTE') { cash += t.amount; earned += t.amount; }
    });

    tempCtx.fillStyle = textColor;
    tempCtx.font = '12px monospace';
    tempCtx.fillText(`Trésorerie Initiale : ${formatCurrency(state.realCash)}`, 20, 95);
    tempCtx.fillText(`Total Investissements : ${formatCurrency(spent)}`, 20, 115);
    tempCtx.fillText(`Total Recettes : ${formatCurrency(earned)}`, 300, 95);
    
    tempCtx.fillStyle = earned - spent >= 0 ? '#089981' : '#f23645';
    tempCtx.fillText(`Profit Net : ${formatCurrency(earned - spent)}`, 300, 115);

    tempCtx.fillStyle = textColor;
    tempCtx.font = 'bold 13px monospace';
    tempCtx.fillText('Aperçu Graphique', 20, 150);

    const img = new Image();
    img.src = chartImage;
    img.onload = () => {
        tempCtx.drawImage(img, 20, 165, 560, 200);

        tempCtx.fillStyle = textColor;
        tempCtx.font = 'bold 13px monospace';
        tempCtx.fillText('10 Dernières Opérations', 20, 395);

        let yPos = 420;
        const last10 = state.realLedger.slice(-10).reverse();

        if (last10.length === 0) {
            tempCtx.fillStyle = subTextColor;
            tempCtx.font = '11px monospace';
            tempCtx.fillText('Aucune vente récente', 20, yPos);
        } else {
            last10.forEach(op => {
                tempCtx.fillStyle = subTextColor;
                tempCtx.font = '11px monospace';
                tempCtx.fillText(op.time, 20, yPos);
                tempCtx.fillText(op.desc, 100, yPos);

                tempCtx.fillStyle = op.type === 'VENTE' ? '#089981' : '#f23645';
                tempCtx.fillText(formatCurrency(op.amount), 480, yPos);
                yPos += 20;
            });
        }

        tempCtx.strokeStyle = isWhiteTheme ? '#d1d5db' : '#2a2e39';
        tempCtx.beginPath();
        tempCtx.moveTo(20, yPos + 10);
        tempCtx.lineTo(580, yPos + 10);
        tempCtx.stroke();

        tempCtx.fillStyle = textColor;
        tempCtx.font = 'bold 14px monospace';
        tempCtx.fillText(`Solde Final Liquide : ${formatCurrency(cash)}`, 20, yPos + 35);

        const link = document.createElement('a');
        link.download = `starz_bilan_${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    };
});

const settingsModal = document.getElementById('settings-modal');
document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));

document.getElementById('save-settings').addEventListener('click', () => {
    state.theme = document.getElementById('setting-theme').value;
    state.lang = document.getElementById('setting-lang').value;
    state.currency = document.getElementById('setting-currency').value;
    saveState();
    updateTexts();
    updateBuyButtonText();
    recompute();
    settingsModal.classList.add('hidden');
});

document.getElementById('btn-export').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `starz_pro_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
});

loadState();
init();
window.addEventListener('resize', () => {
    recompute();
});