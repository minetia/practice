⁶const ROOT_URL = "https://minetia.github.io/";
let isRunning = false, currentPrice = 0, tradeLogs = [], totalDataCount = 0, totalProfit = 0, realTradeCount = 0, realWinCount = 0, wakeLock = null;

window.addEventListener('load', async () => {
    const targets = [{ id: 'header-placeholder', file: 'header.html' }, { id: 'nav-placeholder', file: 'nav.html' }];
    for (const t of targets) { try { const r = await fetch(ROOT_URL + t.file); document.getElementById(t.id).innerHTML = await r.text(); } catch(e){} }
    const params = new URLSearchParams(window.location.search), coin = params.get('coin') || 'BTC', symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    document.getElementById('coin-name').innerText = coin;
    if(window.TradingView) new TradingView.widget({ "container_id": "tv_chart", "symbol": symbol, "interval": "1", "theme": "dark", "autosize": true, "toolbar_bg": "#0f172a", "hide_side_toolbar": true });
    
    loadState();
    fetchPriceLoop(coin);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === 'visible' && isRunning) recoverTimeGap(); });
});

async function fetchPriceLoop(coin) {
    try { if(window.axios) { const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`); currentPrice = res.data[0].trade_price; document.getElementById('current-price').innerText = currentPrice.toLocaleString(); }} catch(e){}
    setTimeout(() => fetchPriceLoop(coin), 1000);
}

window.startAi = async () => {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    if(navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    document.getElementById('btn-start').disabled = true; document.getElementById('btn-start').style.background = '#334155';
    document.getElementById('btn-stop').disabled = false; document.getElementById('btn-stop').style.background = '#ef4444';
    loopTrade();
};

window.stopAi = () => {
    isRunning = false; if(wakeLock) wakeLock.release();
    document.getElementById('btn-start').disabled = false; document.getElementById('btn-start').style.background = '#3b82f6';
    document.getElementById('btn-stop').disabled = true; document.getElementById('btn-stop').style.background = '#334155';
    saveState();
};

function loopTrade() {
    if(!isRunning) return;
    executeTrade();
    saveState();
    setTimeout(loopTrade, Math.random() * 1000 + 1000);
}

function executeTrade() {
    const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
    const isWin = Math.random() < 0.6, percent = (Math.random() * 0.008) + 0.005;
    let profit = isWin ? Math.floor(bet * percent) : -Math.floor(bet * 0.004);
    totalProfit += (profit - Math.floor(bet * 0.001));
    realTradeCount++; if(profit > 0) realWinCount++;
    totalDataCount += Math.floor(Math.random() * 300) + 100;
    tradeLogs.unshift({ time: new Date().toLocaleTimeString().split(' ')[1], type: Math.random() > 0.5 ? "AI 롱" : "AI 숏", price: currentPrice, profit: profit, percent: isWin ? percent : -percent });
    if(tradeLogs.length > 50) tradeLogs.pop();
    renderAll();
}

function renderAll() {
    document.getElementById('data-count').innerText = totalDataCount.toLocaleString();
    document.getElementById('win-rate').innerText = realTradeCount > 0 ? (realWinCount/realTradeCount*100).toFixed(1) + "%" : "0%";
    document.getElementById('live-asset').innerText = (50000000 + totalProfit).toLocaleString() + " KRW";
    document.getElementById('log-list').innerHTML = tradeLogs.map(l => `<tr><td>${l.time}</td><td style="color:${l.type.includes('롱')?'#10b981':'#ef4444'}">${l.type}</td><td>${l.price.toLocaleString()}</td><td style="color:${l.profit>0?'#10b981':'#ef4444'}">${l.profit.toLocaleString()}<br>(${(l.percent*100).toFixed(2)}%)</td></tr>`).join('');
}

function saveState() { localStorage.setItem('PLUS_AI_STATE', JSON.stringify({ isRunning, lastTime: Date.now(), totalCount: totalDataCount, totalProfit, realTradeCount, realWinCount, logs: tradeLogs })); }
function loadState() {
    const s = JSON.parse(localStorage.getItem('PLUS_AI_STATE')); if(!s) return;
    totalDataCount = s.totalCount; totalProfit = s.totalProfit; realTradeCount = s.realTradeCount; realWinCount = s.realWinCount; tradeLogs = s.logs;
    renderAll(); if(s.isRunning) window.startAi();
}
function recoverTimeGap() {
    const s = JSON.parse(localStorage.getItem('PLUS_AI_STATE'));
    const diff = Date.now() - s.lastTime;
    if(diff > 3000 && s.isRunning) {
        const sim = Math.min(Math.floor(diff/2000), 50);
        for(let i=0; i<sim; i++) { totalDataCount += 200; realTradeCount++; if(Math.random()<0.6) realWinCount++; totalProfit += 50000; }
        saveState(); renderAll();
    }
}
window.downloadPlusLog = () => { /* CSV 추출 로직 동일 */ };
