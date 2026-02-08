/* practice/practice-script.js (승률 계산 기능 추가됨) */
const ROOT_URL = "https://minetia.github.io/";

let isRunning = false;
let tradeInterval = null;
let currentPrice = 0;
let feeRate = 0.001; 
let tradeLogs = [];
let totalDataCount = 0; 
let totalProfit = 0;

// [NEW] 승률 계산용 변수
let realTradeCount = 0; // 실제 매매 횟수 (데이터 뻥튀기 제외)
let realWinCount = 0;   // 승리 횟수

window.onload = async () => {
    await includeResources([
        { id: 'header-placeholder', file: 'header.html' },
        { id: 'nav-placeholder', file: 'nav.html' }
    ]);
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    
    document.getElementById('coin-name').innerText = coin;
    if(symbol.includes('USDT')) feeRate = 0.002;

    new TradingView.widget({ "container_id": "tv_chart", "symbol": symbol, "interval": "1", "theme": "dark", "autosize": true, "toolbar_bg": "#0f172a", "hide_side_toolbar": true, "save_image": false });

    const searchInput = document.getElementById('header-search-input');
    if(searchInput) {
        searchInput.onkeyup = function(e) { if(e.key === 'Enter') searchCoin(); };
    }

    loadState(); 
    fetchPriceLoop(coin);
};

async function includeResources(targets) {
    const promises = targets.map(t => fetch(`${ROOT_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html })));
    const results = await Promise.all(promises);
    results.forEach(res => { const el = document.getElementById(res.id); if(el) el.innerHTML = res.html; });
}

async function fetchPriceLoop(coin) {
    try {
        const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`);
        if(res.data && res.data.length > 0) {
            currentPrice = res.data[0].trade_price;
            document.getElementById('current-price').innerText = currentPrice.toLocaleString();
        }
    } catch(e) {}
    setTimeout(() => fetchPriceLoop(coin), 1000); 
}

window.searchCoin = function() {
    const input = document.getElementById('header-search-input');
    if (!input) return;
    let symbol = input.value.toUpperCase().trim();
    if (!symbol) { alert("코인명을 입력해주세요."); return; }
    location.href = `?symbol=BINANCE:${symbol}USDT&coin=${symbol}`;
}

window.startAi = function() {
    if(isRunning) return;
    isRunning = true;
    updateUiRunning(true);
    runAutoTrade();
    saveState();
}

window.stopAi = function() {
    isRunning = false;
    clearTimeout(tradeInterval);
    updateUiRunning(false);
    saveState();
}

window.downloadPlusLog = function() {
    if(!tradeLogs || tradeLogs.length === 0) {
        alert("수집된 데이터가 없습니다.\nAI를 먼저 가동해주세요!");
        return;
    }
    let csvContent = "\uFEFFTime,Type,Price,Profit,Fee\n";
    tradeLogs.forEach(row => {
        csvContent += `${row.time},${row.type},${row.price},${row.profit},${row.fee}\n`;
    });
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
    if(active) {
        btnStart.disabled = true; btnStart.style.background = '#334155'; btnStart.style.color = '#94a3b8';
        btnStop.disabled = false; btnStop.style.background = '#ef4444'; btnStop.style.color = '#fff';
        input.disabled = true;
    } else {
        btnStart.disabled = false; btnStart.style.background = '#3b82f6'; btnStart.style.color = '#fff';
        btnStop.disabled = true; btnStop.style.background = '#334155'; btnStop.style.color = '#94a3b8';
        input.disabled = false;
    }
}

function runAutoTrade() {
    if(!isRunning) return;
    executeTrade();
    saveState();
    const nextTime = Math.random() * 1000 + 500; 
    tradeInterval = setTimeout(runAutoTrade, nextTime);
}

function executeTrade() {
    const input = document.getElementById('bet-amount');
    const betAmount = Number(input.value.replace(/,/g, '')) || 50000000;
    const fee = Math.floor(betAmount * feeRate);
    const isWin = Math.random() < 0.6; // 승률 60% 설정
    const percent = (Math.random() * 0.008) + 0.005;

    let profit = 0;
    if(isWin) profit = Math.floor(betAmount * percent) - fee;
    else profit = -Math.floor(betAmount * (percent * 0.6)) - fee;

    totalProfit += profit;
    
    // [핵심] 승률 계산
    realTradeCount++;
    if(profit > 0) realWinCount++;

    const variation = currentPrice * 0.0005; 
    const tradePrice = Math.floor(currentPrice + (Math.random() * variation * 2 - variation));

    const logData = {
        time: new Date().toTimeString().split(' ')[0],
        type: Math.random() > 0.5 ? "AI 롱" : "AI 숏",
        price: tradePrice, 
        profit: profit,
        fee: fee,
        percent: isWin ? percent : -percent
    };

    const jump = Math.floor(Math.random() * 400) + 100;
    totalDataCount += jump;

    tradeLogs.unshift(logData);
    if(tradeLogs.length > 100) tradeLogs = tradeLogs.slice(0, 100);
    
    renderLogs(); 
    updateAssetDisplay(); 
    updateWinRate(); // 승률 UI 업데이트
}

// [NEW] 승률 표시 업데이트 함수
function updateWinRate() {
    const winRateEl = document.getElementById('win-rate');
    if(!winRateEl) return;

    if(realTradeCount === 0) {
        winRateEl.innerText = "0.0%";
        winRateEl.style.color = "#64748b";
    } else {
        const rate = (realWinCount / realTradeCount) * 100;
        winRateEl.innerText = `${rate.toFixed(1)}%`;
        
        // 승률에 따라 색상 변경 (50% 이상이면 금색, 아니면 회색)
        if(rate >= 50) winRateEl.style.color = "#f59e0b"; // Gold/Orange
        else winRateEl.style.color = "#94a3b8";
    }
}

function updateAssetDisplay() {
    const input = document.getElementById('bet-amount');
    const principal = Number(input.value.replace(/,/g, '')) || 50000000;
    const currentAsset = principal + totalProfit;
    const assetEl = document.getElementById('live-asset');
    if(assetEl) {
        assetEl.innerText = `${currentAsset.toLocaleString()} KRW`;
        assetEl.style.color = totalProfit >= 0 ? '#3b82f6' : '#ef4444';
    }
}

function saveState() {
    const input = document.getElementById('bet-amount');
    const state = {
        isRunning: isRunning,
        lastTime: Date.now(),
        amount: input.value,
        logs: tradeLogs,
        totalCount: totalDataCount,
        totalProfit: totalProfit,
        // [핵심] 승률 정보도 저장
        realTradeCount: realTradeCount,
        realWinCount: realWinCount
    };
    localStorage.setItem('PLUS_AI_STATE', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('PLUS_AI_STATE');
    if(!saved) return;
    const state = JSON.parse(saved);
    tradeLogs = state.logs || [];
    totalDataCount = state.totalCount || 0;
    totalProfit = state.totalProfit || 0; 
    
    // 승률 정보 복구
    realTradeCount = state.realTradeCount || 0;
    realWinCount = state.realWinCount || 0;

    renderLogs();
    
    const input = document.getElementById('bet-amount');
    if(input) input.value = state.amount;
    
    updateAssetDisplay();
    updateWinRate(); // 로드 시 승률 표시

    if (state.isRunning) {
        const now = Date.now();
        const diff = now - state.lastTime;
        const missedTrades = Math.floor(diff / 1000);
        const simulateCount = Math.min(missedTrades, 200); 

        if (simulateCount > 0) {
            for(let i=0; i<simulateCount; i++) {
                const jump = Math.floor(Math.random() * 400) + 100;
                totalDataCount += jump;

                // [중요] 부재중 매매도 승률에 반영 (가상 시뮬레이션)
                realTradeCount++;
                // 60% 확률로 승리 가정
                if(Math.random() < 0.6) realWinCount++;
                
                if(i === simulateCount - 1) executeTrade(); 
            }
            alert(`AI가 부재중에 ${simulateCount}번 매매하여\n약 ${(simulateCount * 250).toLocaleString()}건의 데이터를 채굴했습니다!`);
        }
        isRunning = true;
        updateUiRunning(true);
        runAutoTrade();
    }
}

function renderLogs() {
    const tbody = document.getElementById('log-list');
    const countEl = document.getElementById('data-count');
    const emptyMsg = document.getElementById('empty-msg');
    
    if(countEl) countEl.innerText = totalDataCount.toLocaleString();

    if(tradeLogs.length > 0) {
        if(emptyMsg) emptyMsg.style.display = 'none';
        tbody.innerHTML = ''; 
        
        tradeLogs.forEach(log => {
            const row = document.createElement('tr');
            const color = log.profit >= 0 ? '#10b981' : '#ef4444';
            const sign = log.profit >= 0 ? '+' : '';
            
            const resultHTML = `
                <div>${sign}${log.profit.toLocaleString()}</div>
                <div style="font-size:0.7rem; opacity:0.8; font-weight:normal;">(${sign}${(Math.abs(log.percent)*100).toFixed(2)}%)</div>
                <div style="font-size:0.6rem; color:#64748b; margin-top:2px;">수수료: -${log.fee.toLocaleString()}</div>
            `;

            row.innerHTML = `
                <td style="color:#94a3b8; text-align:center; padding:12px;">${log.time}</td>
                <td style="font-weight:bold; color:${log.type.includes('롱')?'#10b981':'#ef4444'}; text-align:center; padding:12px;">${log.type}</td>
                <td style="color:#fff; font-weight:bold; text-align:center; padding:12px;">${log.price.toLocaleString()}</td>
                <td style="color:${color}; font-weight:bold; text-align:center; padding:12px;">${resultHTML}</td>
            `;
            tbody.appendChild(row);
        });
    } else {
        if(emptyMsg) emptyMsg.style.display = 'block';
    }
}

window.formatInput = function(input) {
    let val = input.value.replace(/[^0-9]/g, '');
    if(!val) return;
    input.value = Number(val).toLocaleString();
    updateAssetDisplay(); 
}
