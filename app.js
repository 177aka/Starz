const defaultState = {
    fuelPrice: 1.65,
    consumption: 8.5,
    baseFare: 3.75,
    perKm: 1.85,
    waitRate: 0.55,
    stopSpeedThreshold: 5,
    theme: 'basic',
    history: []
};

let state = { ...defaultState };

function loadState() {
    const saved = localStorage.getItem('taximan_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...defaultState, ...parsed };
        } catch(e) { state = { ...defaultState }; }
    }
}

function saveState() {
    localStorage.setItem('taximan_state', JSON.stringify(state));
}

// Variables Moteur Taximètre
let isRunning = false;
let isPaused = false;
let watchId = null;
let timerInterval = null;

let startTime = 0;
let totalElapsedSeconds = 0;
let totalWaitSeconds = 0;
let totalDistanceKm = 0;
let currentSpeedKmh = 0;
let lastLat = null;
let lastLon = null;

let speedHistory = [];

// Éléments DOM
const tkCost = document.getElementById('tk-cost');
const tkDist = document.getElementById('tk-dist');
const tkSpeed = document.getElementById('tk-speed');
const tkTime = document.getElementById('tk-time');
const meterAmountLarge = document.getElementById('meter-amount-large');
const rateTypeDisplay = document.getElementById('rate-type-display');
const lblFuelSpent = document.getElementById('lbl-fuel-spent');
const lblWaitTime = document.getElementById('lbl-wait-time');
const statusBadge = document.getElementById('status-badge');
const gpsAccuracyLabel = document.getElementById('gps-accuracy-label');

const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnStop = document.getElementById('btn-stop');

const cfgFuelPrice = document.getElementById('cfg-fuel-price');
const cfgConsumption = document.getElementById('cfg-consumption');
const cfgBaseFare = document.getElementById('cfg-base-fare');
const cfgPerKm = document.getElementById('cfg-per-km');
const cfgWaitRate = document.getElementById('cfg-wait-rate');
const cfgStopSpeed = document.getElementById('cfg-stop-speed');

const historyTbody = document.getElementById('history-tbody');
const canvas = document.getElementById('speedChart');
const ctx = canvas.getContext('2d');

function init() {
    loadState();
    cfgFuelPrice.value = state.fuelPrice;
    cfgConsumption.value = state.consumption;
    cfgBaseFare.value = state.baseFare;
    cfgPerKm.value = state.perKm;
    cfgWaitRate.value = state.waitRate;
    cfgStopSpeed.value = state.stopSpeedThreshold;
    document.getElementById('setting-theme').value = state.theme;

    document.documentElement.setAttribute('data-theme', state.theme);
    renderHistory();
    renderChart();
    updateDisplay();
}

function formatCAD(amount) {
    return `${amount.toFixed(2)} $`;
}

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Formule de Haversine pour le calcul de distance GPS exacte en km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function updateDisplay() {
    const baseFare = parseFloat(cfgBaseFare.value) || 0;
    const perKm = parseFloat(cfgPerKm.value) || 0;
    const waitRate = parseFloat(cfgWaitRate.value) || 0;
    const fuelPrice = parseFloat(cfgFuelPrice.value) || 0;
    const consumption = parseFloat(cfgConsumption.value) || 0;

    // Calculs financiers
    const distanceCost = totalDistanceKm * perKm;
    const waitCost = (totalWaitSeconds / 60) * waitRate;
    const totalFare = baseFare + distanceCost + waitCost;

    // Calcul essence consommée
    const litersUsed = (totalDistanceKm * consumption) / 100;
    const fuelCost = litersUsed * fuelPrice;

    tkCost.textContent = formatCAD(totalFare);
    meterAmountLarge.textContent = formatCAD(totalFare);
    tkDist.textContent = `${totalDistanceKm.toFixed(2)} km`;
    tkSpeed.textContent = `${Math.round(currentSpeedKmh)} km/h`;
    tkTime.textContent = formatTime(totalElapsedSeconds);

    lblFuelSpent.textContent = formatCAD(fuelCost);
    lblWaitTime.textContent = formatTime(totalWaitSeconds);

    if (isRunning) {
        const threshold = parseFloat(cfgStopSpeed.value) || 5;
        if (currentSpeedKmh <= threshold) {
            rateTypeDisplay.textContent = 'TARIF D\'ATTENTE (STOP / FEU)';
            rateTypeDisplay.style.color = 'var(--yellow)';
        } else {
            rateTypeDisplay.textContent = 'TARIF EN COURSE (EN ROUTE)';
            rateTypeDisplay.style.color = 'var(--green)';
        }
    } else {
        rateTypeDisplay.textContent = 'PRISE EN CHARGE';
        rateTypeDisplay.style.color = 'var(--text-secondary)';
    }

    renderChart();
}

function startTrip() {
    if (isRunning) return;

    // Demande d'activation du GPS
    if (!navigator.geolocation) {
        alert('La géolocalisation GPS n\'est pas supportée par votre navigateur.');
        return;
    }

    isRunning = true;
    isPaused = false;
    totalElapsedSeconds = 0;
    totalWaitSeconds = 0;
    totalDistanceKm = 0;
    currentSpeedKmh = 0;
    lastLat = null;
    lastLon = null;
    speedHistory = [0];

    statusBadge.textContent = 'EN COURSE';
    statusBadge.className = 'badge running';

    btnStart.disabled = true;
    btnPause.disabled = false;
    btnStop.disabled = false;

    // Timer de la durée
    timerInterval = setInterval(() => {
        if (!isPaused) {
            totalElapsedSeconds++;
            const threshold = parseFloat(cfgStopSpeed.value) || 5;
            if (currentSpeedKmh <= threshold) {
                totalWaitSeconds++;
            }
            updateDisplay();
        }
    }, 1000);

    // Suivi GPS
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const coords = position.coords;
            gpsAccuracyLabel.textContent = `GPS: ±${Math.round(coords.accuracy)}m`;

            if (coords.speed !== null && coords.speed !== undefined && !isNaN(coords.speed)) {
                currentSpeedKmh = coords.speed * 3.6; // Convertit m/s en km/h
            }

            if (lastLat !== null && lastLon !== null && !isPaused) {
                const dist = calculateDistance(lastLat, lastLon, coords.latitude, coords.longitude);
                // Filtre anti-saut d'erreur GPS (< 200m entre 2 updates)
                if (dist < 0.2) {
                    totalDistanceKm += dist;
                }
            }

            lastLat = coords.latitude;
            lastLon = coords.longitude;
            speedHistory.push(currentSpeedKmh);
            updateDisplay();
        },
        (error) => {
            gpsAccuracyLabel.textContent = 'GPS: ERREUR / PERDU';
        },
        {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 5000
        }
    );
}

function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;
    if (isPaused) {
        btnPause.textContent = '► REPRENDRE';
        statusBadge.textContent = 'EN PAUSE';
        statusBadge.className = 'badge paused';
    } else {
        btnPause.textContent = '❚❚ PAUSE';
        statusBadge.textContent = 'EN COURSE';
        statusBadge.className = 'badge running';
    }
}

function stopTrip() {
    if (!isRunning) return;

    isRunning = false;
    isPaused = false;
    clearInterval(timerInterval);
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);

    btnStart.disabled = false;
    btnPause.disabled = true;
    btnStop.disabled = true;
    btnPause.textContent = '❚❚ PAUSE';

    statusBadge.textContent = 'PRÊT';
    statusBadge.className = 'badge';

    const baseFare = parseFloat(cfgBaseFare.value) || 0;
    const perKm = parseFloat(cfgPerKm.value) || 0;
    const waitRate = parseFloat(cfgWaitRate.value) || 0;
    const totalFare = baseFare + (totalDistanceKm * perKm) + ((totalWaitSeconds / 60) * waitRate);

    // Sauvegarde dans l'historique
    state.history.push({
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        date: new Date().toLocaleDateString(),
        distance: totalDistanceKm,
        duration: totalElapsedSeconds,
        waitTime: totalWaitSeconds,
        total: totalFare
    });

    saveState();
    renderHistory();
    openBilanModal();
}

function renderHistory() {
    historyTbody.innerHTML = '';
    if (state.history.length === 0) {
        historyTbody.innerHTML = `<tr><td colspan="4" class="empty">AUCUNE COURSE ENREGISTRÉE</td></tr>`;
        return;
    }

    state.history.slice().reverse().forEach(item => {
        historyTbody.innerHTML += `
            <tr>
                <td>${item.time}</td>
                <td>${item.distance.toFixed(2)} km</td>
                <td>${formatTime(item.duration)}</td>
                <td style="color:var(--green); font-weight:700">${formatCAD(item.total)}</td>
            </tr>`;
    });
}

function renderChart() {
    const rect = canvas.parentNode.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (speedHistory.length < 2) return;

    const padding = 20;
    const maxSpeed = Math.max(...speedHistory, 50);

    const getX = (i) => (i / (speedHistory.length - 1)) * canvas.width;
    const getY = (val) => canvas.height - padding - (val / maxSpeed) * (canvas.height - 2 * padding);

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(speedHistory[0]));
    for (let i = 1; i < speedHistory.length; i++) {
        ctx.lineTo(getX(i), getY(speedHistory[i]));
    }

    ctx.strokeStyle = '#089981';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function openBilanModal() {
    const baseFare = parseFloat(cfgBaseFare.value) || 0;
    const perKm = parseFloat(cfgPerKm.value) || 0;
    const waitRate = parseFloat(cfgWaitRate.value) || 0;
    const fuelPrice = parseFloat(cfgFuelPrice.value) || 0;
    const consumption = parseFloat(cfgConsumption.value) || 0;

    const distanceCost = totalDistanceKm * perKm;
    const waitCost = (totalWaitSeconds / 60) * waitRate;
    const totalFare = baseFare + distanceCost + waitCost;

    const litersUsed = (totalDistanceKm * consumption) / 100;
    const fuelCost = litersUsed * fuelPrice;
    const profitNet = totalFare - fuelCost;

    document.getElementById('bilan-content').innerHTML = `
        <div id="bilan-printable" style="background:var(--bg-side); color:var(--text-primary); padding:12px; border-radius:4px;">
            <div style="font-size:16px; font-weight:bold; margin-bottom:4px;">TAXIMAN // REÇU DE COURSE</div>
            <div style="font-size:10px; color:var(--text-secondary); margin-bottom:12px;">Date : ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}</div>
            <hr style="border-color:var(--border); margin-bottom:12px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; font-size:11px;">
                <div>Distance Parcourue : <strong>${totalDistanceKm.toFixed(2)} km</strong></div>
                <div>Durée Totale : <strong>${formatTime(totalElapsedSeconds)}</strong></div>
                <div>Temps d'Attente / Stop : <strong>${formatTime(totalWaitSeconds)}</strong></div>
                <div>Consommation Essence : <strong>${litersUsed.toFixed(2)} L</strong></div>
            </div>
            <hr style="border-color:var(--border); margin-bottom:12px;">
            <div style="display:flex; flex-direction:column; gap:4px; font-size:11px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between;"><span>Prise en charge fixe :</span><span>${formatCAD(baseFare)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Distance (${totalDistanceKm.toFixed(2)} km à ${perKm}$/km) :</span><span>${formatCAD(distanceCost)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Attente (${formatTime(totalWaitSeconds)} à ${waitRate}$/min) :</span><span>${formatCAD(waitCost)}</span></div>
                <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-secondary);"><span>Coût Carburant Estimé :</span><span>-${formatCAD(fuelCost)}</span></div>
            </div>
            <hr style="border-color:var(--border); margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:bold; color:var(--green);">
                <span>TOTAL À PAYER :</span>
                <span>${formatCAD(totalFare)}</span>
            </div>
            <div style="font-size:10px; color:var(--text-secondary); margin-top:4px;">Bénéfice Net Chauffeur : ${formatCAD(profitNet)}</div>
        </div>
    `;

    document.getElementById('bilan-modal').classList.remove('hidden');
}

// Event Listeners
btnStart.addEventListener('click', startTrip);
btnPause.addEventListener('click', togglePause);
btnStop.addEventListener('click', stopTrip);

document.getElementById('btn-bilan').addEventListener('click', () => {
    openBilanModal();
});

document.getElementById('close-bilan').addEventListener('click', () => document.getElementById('bilan-modal').classList.add('hidden'));
document.getElementById('close-bilan-btn').addEventListener('click', () => document.getElementById('bilan-modal').classList.add('hidden'));
document.getElementById('btn-print').addEventListener('click', () => window.print());

document.getElementById('btn-clear-history').addEventListener('click', () => {
    if (confirm('Vider l\'historique des courses ?')) {
        state.history = [];
        saveState();
        renderHistory();
    }
});

// Écouteurs de modification des paramètres
[cfgFuelPrice, cfgConsumption, cfgBaseFare, cfgPerKm, cfgWaitRate, cfgStopSpeed].forEach(input => {
    input.addEventListener('input', () => {
        state.fuelPrice = parseFloat(cfgFuelPrice.value) || 0;
        state.consumption = parseFloat(cfgConsumption.value) || 0;
        state.baseFare = parseFloat(cfgBaseFare.value) || 0;
        state.perKm = parseFloat(cfgPerKm.value) || 0;
        state.waitRate = parseFloat(cfgWaitRate.value) || 0;
        state.stopSpeedThreshold = parseFloat(cfgStopSpeed.value) || 0;
        saveState();
        updateDisplay();
    });
});

// Modale Paramètres Visuels
const settingsModal = document.getElementById('settings-modal');
document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));

document.getElementById('save-settings').addEventListener('click', () => {
    state.theme = document.getElementById('setting-theme').value;
    saveState();
    document.documentElement.setAttribute('data-theme', state.theme);
    settingsModal.classList.add('hidden');
});

document.getElementById('btn-export').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `taximan_data_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
});

init();
window.addEventListener('resize', renderChart);