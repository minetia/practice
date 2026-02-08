/* practice/practice-script.js (작동 에러 수정 + 좀비 복구 + 화면유지) */
const ROOT_URL = "https://minetia.github.io/";

let isRunning = false;
let tradeInterval = null;
let currentPrice = 0;
let feeRate = 0.001; 
let tradeLogs = [];
let totalDataCount = 0; 
let totalProfit = 0;
let realTradeCount = 0;
let realWinCount = 0;
let wakeLock = null;

// [수정] 윈도우 로드 시 실행 보장
window.addEventListener('load', async () => {
    try {
        // 1. 헤더/네비 불러오기
        await includeResources([
            { id: 'header-placeholder', file: 'header.html' },
            { id: 'nav-placeholder', file: 'nav.html' }
        ]);

        const params = new URLSearchParams(window.location.search);
        const coin = params.get('coin') || 'BTC';
        const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
        
        document.getElementById('coin-name').innerText = coin;
        if(symbol.includes('USDT')) feeRate = 0.002;

        // 2. 차트 로딩 확인 후 생성
        if (typeof TradingView !== 'undefined') {
            new TradingView.widget({ "container_id": "tv_chart", "symbol": symbol, "interval": "1", "theme": "dark", "autosize": true, "toolbar_bg": "#0f172a", "hide_side_toolbar": true, "save_image": false });
        }

        // 3. 검색창 엔터키 강제 연결
        setTimeout(() => {
            const searchInput = document.getElementById('header-search-input');
            if(searchInput) {
                searchInput.addEventListener('keyup', (e) => { if(e.key === 'Enter') window.searchCoin(); });
            }
        }, 1000);

        loadState(); 
        fetchPriceLoop(coin);

        // 탭 복귀 시 복구
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === 'visible' && isRunning) {
                recoverTimeGap();
                requestWakeLock();
            }
        });
    } catch (err) {
        console.error("초기화 에러:", err);
    }
});

async function includeResources(targets) {
    const promises = targets.map(t => fetch(`${ROOT_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html })));
    const results = await Promise.all(promises);
    results.forEach(res => { const el = document.getElementById(res.id); if(el) el.innerHTML = res.html; });
}

async function fetchPriceLoop(coin) {
    try {
        // [수정] axios 로딩 대기
        if (typeof axios !== 'undefined') {
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`);
            if(res.data && res.data.length > 0) {
                currentPrice = res.data[0].trade_price;
                const priceEl = document.getElementById('current-price');
                if(priceEl) priceEl.innerText = currentPrice.toLocaleString();
            }
        }
    } catch(e) {}
    setTimeout(() => fetchPriceLoop(coin), 1000); 
}

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {}
}

// [수정] 모든 버튼 함수를 window에 강제 등록 (HTML에서 못 찾는 에러 방지)
window.searchCoin = function() {
    const input = document.getElementById('header-search-input');
    if (!input) return;
    let symbol = input.value.toUpperCase().trim();
    if (!symbol) return;
    location.href = `?symbol=BINANCE:${symbol}USDT&coin=${symbol}`;
}

window.startAi = function() {
    if(isRunning) return;
    if(currentPrice === 0) { alert("가격을 불러오는 중입니다. 잠시만 기다려주세요."); return; }
    isRunning = true;
    requestWakeLock();
    updateUiRunning(true);
    runAutoTrade();
    saveState();
}

window.stopAi = function() {
    isRunning = false;
    clearTimeout(tradeInterval);
    if (wakeLock !== null) { wakeLock.release().then(() => { wakeLock = null; }); }
    updateUiRunning(false);
    saveState();
}

window.downloadPlusLog = function() {
    if(tradeLogs.length === 0) { alert("수집된 데이터가 없습니다."); return; }
    let csvContent = "\uFEFFTime,Type,Price,Profit,Fee\n";
    tradeLogs.forEach(row => { csvContent += `${row.time},${row.type},${row.price},${row.profit},${row.fee}\n`; });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const today = new Date().toISOString().slice(0,10).replace(/-/g,"");
    link.setAttribute("download", `Plus_Data_${totalDataCount}건_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
}

function updateUiRunning(active) {
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const input = document.getElementById('bet-amount');
    if(!btnStart || !btnStop) return;
    if(active) {
        btnStart.disabled = true; btnStart.style.background = '#334155';
        btnStop.disabled = false; btnStop.style.background = '#ef4444';
        if(input) input.disabled = true;
    } else {
        btnStart.disabled = false; btnStart.style.background = '#3b82f6';
        btnStop.disabled = true; btnStop.style.background = '#334155';
        if(input) input.disabled = false;
    }
}

function runAutoTrade() {
    if(!isRunning) return;
    if(currentPrice > 0) {
        executeTrade();
        saveState();
    }
    tradeInterval = setTimeout(runAutoTrade, Math.random() * 1000 + 500);
}

function executeTrade() {
    const input = document.getElementById('bet-amount');
    const betAmount = Number(input.value.replace(/,/g, '')) || 50000000;
    const fee = Math.floor(betAmount * feeRate);
    const isWin = Math.random() < 0.6; 
    const percent = (Math.random() * 0.008) + 0.005;

    let profit = isWin ? Math.floor(betAmount * percent) - fee : -Math.floor(betAmount * (percent * 0.6)) - fee;
    totalProfit += profit;
    realTradeCount++;
    if(profit > 0) realWinCount++;

    const logData = {
        time: new Date().toTimeString().split(' ')[0],
        type: Math.random() > 0.5 ? "AI 롱" : "AI 숏",
        price: currentPrice > 0 ? Math.floor(currentPrice + (Math.random() * 10 - 5)) : 0, 
        profit: profit,
        fee: fee,
        percent: isWin ? percent : -percent
    };

    totalDataCount += Math.floor(Math.random() * 400) + 100;
    tradeLogs.unshift(logData);
    if(tradeLogs.length > 100) tradeLogs = tradeLogs.slice(0, 100);
    
    renderLogs(); 
    updateAssetDisplay(); 
    updateWinRate(); 
}

function updateWinRate() {
    const el = document.getElementById('win-rate');
    if(el && realTradeCount > 0) {
        const rate = (realWinCount / realTradeCount) * 100;
        el.innerText = rate.toFixed(1) + "%";
        el.style.color = rate >= 50 ? "#f59e0b" : "#94a3b8";
    }
}

function updateAssetDisplay() {
    const input = document.getElementById('bet-amount');
    const principal = Number(input.value.replace(/,/g, '')) || 50000000;
    const el = document.getElementById('live-asset');
    if(el) {
        const total = principal + totalProfit;
        el.innerText = total.toLocaleString() + " KRW";
        el.style.color = totalProfit >= 0 ? '#3b82f6' : '#ef4444';
    }
}

function saveState() {
    const input = document.getElementById('bet-amount');
    const state = { isRunning, lastTime: Date.now(), amount: input ? input.value : "50,000,000", logs: tradeLogs, totalCount: totalDataCount, totalProfit, realTradeCount, realWinCount };
    localStorage.setItem('PLUS_AI_STATE', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('PLUS_AI_STATE');
    if(!saved) return;
    const state = JSON.parse(saved);
    tradeLogs = state.logs || [];
    totalDataCount = state.totalCount || 0;
    totalProfit = state.totalProfit || 0; 
    realTradeCount = state.realTradeCount || 0;
    realWinCount = state.realWinCount || 0;

    renderLogs();
    const input = document.getElementById('bet-amount');
    if(input) input.value = state.amount;
    updateAssetDisplay();
    updateWinRate();

    if (state.isRunning) {
        isRunning = true;
        updateUiRunning(true);
        recoverTimeGap();
        runAutoTrade();
    }
}

function recoverTimeGap() {
    const saved = localStorage.getItem('PLUS_AI_STATE');
    if(!saved) return;
    const state = JSON.parse(saved);
    const diff = Date.now() - state.lastTime;
    if(diff > 2000 && state.isRunning) {
        const simCount = Math.min(Math.floor(diff / 1500), 100);
        if (simCount > 0 && currentPrice > 0) {
            for(let i=0; i<simCount; i++) {
                totalDataCount += 250; realTradeCount++;
                if(Math.random() < 0.6) realWinCount++;
                if(i === simCount - 1) executeTrade();
            }
        }
        saveState();
    }
}

function renderLogs() {
    const tbody = document.getElementById('log-list');
    const countEl = document.getElementById('data-count');
    if(countEl) countEl.innerText = totalDataCount.toLocaleString();
    if(tradeLogs.length > 0) {
        const empty = document.getElementById('empty-msg');
        if(empty) empty.style.display = 'none';
        tbody.innerHTML = tradeLogs.map(log => {
            const color = log.profit >= 0 ? '#10b981' : '#ef4444';
            const sign = log.profit >= 0 ? '+' : '';
            return `<tr>
                <td style="color:#94a3b8; padding:12px;">${log.time}</td>
                <td style="font-weight:bold; color:${log.type.includes('롱')?'#10b981':'#ef4444'}; padding:12px;">${log.type}</td>
                <td style="color:#fff; font-weight:bold; padding:12px;">${log.price.toLocaleString()}</td>
                <td style="color:${color}; font-weight:bold; padding:12px;">
                    <div>${sign}${log.profit.toLocaleString()}</div>
                    <div style="font-size:0.7rem; opacity:0.8;">(${sign}${(Math.abs(log.percent)*100).toFixed(2)}%)</div>
                </td>
            </tr>`;
        }).join('');
    }
}

window.formatInput = function(input) {
    let val = input.value.replace(/[^0-9]/g, '');
    if(!val) return;
    input.value = Number(val).toLocaleString();
    updateAssetDisplay(); 
}
