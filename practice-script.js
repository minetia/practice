/* practice/practice-script.js (최종: 화면 꺼짐 방지 + 강력 복구) */
const ROOT_URL = "https://minetia.github.io/";

let isRunning = false;
let tradeInterval = null;
let currentPrice = 0;
let feeRate = 0.001; 
let tradeLogs = [];
let totalDataCount = 0; 
let totalProfit = 0;

// 승률 통계
let realTradeCount = 0;
let realWinCount = 0;

// [핵심] 화면 꺼짐 방지용 변수
let wakeLock = null;

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

    // 검색 기능 연결
    const searchInput = document.getElementById('header-search-input');
    if(searchInput) {
        searchInput.onkeyup = function(e) { if(e.key === 'Enter') searchCoin(); };
    }

    // 상태 불러오기
    loadState(); 
    
    // 가격 가져오기 시작
    fetchPriceLoop(coin);

    // [중요] 페이지가 다시 보일 때(탭 전환 후 복귀) 복구 로직 실행
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === 'visible' && isRunning) {
            recoverTimeGap();
            requestWakeLock(); // 화면 유지 다시 요청
        }
    });
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
            
            const priceEl = document.getElementById('current-price');
            if(priceEl) priceEl.innerText = currentPrice.toLocaleString();
        }
    } catch(e) { console.error("가격 조회 실패", e); }
    
    // 가격은 무조건 계속 갱신
    setTimeout(() => fetchPriceLoop(coin), 1000); 
}

// [핵심 1] 화면 꺼짐 방지 (Wake Lock API)
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('화면 꺼짐 방지 활성화됨');
        }
    } catch (err) {
        console.log(`화면 유지 실패: ${err.name}, ${err.message}`);
    }
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
    
    // 화면 유지 요청
    requestWakeLock();
    
    updateUiRunning(true);
    runAutoTrade();
    saveState();
}

window.stopAi = function() {
    isRunning = false;
    clearTimeout(tradeInterval);
    
    // 화면 유지 해제
    if (wakeLock !== null) {
        wakeLock.release().then(() => { wakeLock = null; });
    }

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
    
    // [중요] 가격이 0이면 매매하지 않고 기다림 (체결가 0원 방지)
    if(currentPrice > 0) {
        executeTrade();
        saveState();
    }
    
    // 속도: 0.5초 ~ 1.5초
    const nextTime = Math.random() * 1000 + 500; 
    tradeInterval = setTimeout(runAutoTrade, nextTime);
}

function executeTrade() {
    const input = document.getElementById('bet-amount');
    const betAmount = Number(input.value.replace(/,/g, '')) || 50000000;
    const fee = Math.floor(betAmount * feeRate);
    
    // 승률 조정 (기본 60%)
    const isWin = Math.random() < 0.6; 
    const percent = (Math.random() * 0.008) + 0.005;

    let profit = 0;
    if(isWin) profit = Math.floor(betAmount * percent) - fee;
    else profit = -Math.floor(betAmount * (percent * 0.6)) - fee;

    totalProfit += profit;
    
    // 승률 통계
    realTradeCount++;
    if(profit > 0) realWinCount++;

    // 체결가 생성 (현재가 기준)
    const variation = currentPrice * 0.0005; 
    // 가격이 0원일 때 대비 안전장치
    let tradePrice = currentPrice;
    if(currentPrice > 0) {
        tradePrice = Math.floor(currentPrice + (Math.random() * variation * 2 - variation));
    }

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
    updateWinRate(); 
}

function updateWinRate() {
    const winRateEl = document.getElementById('win-rate');
    if(!winRateEl) return;

    if(realTradeCount === 0) {
        winRateEl.innerText = "0.0%";
        winRateEl.style.color = "#64748b";
    } else {
        const rate = (realWinCount / realTradeCount) * 100;
        winRateEl.innerText = `${rate.toFixed(1)}%`;
        if(rate >= 50) winRateEl.style.color = "#f59e0b"; 
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
        recoverTimeGap(); // 로드 직후 바로 시간 복구 시도
        runAutoTrade();
    }
}

// [핵심 2] 멈췄던 시간만큼 한 번에 처리하는 함수 (좀비 복구)
function recoverTimeGap() {
    const saved = localStorage.getItem('PLUS_AI_STATE');
    if(!saved) return;
    const state = JSON.parse(saved);

    const now = Date.now();
    const diff = now - state.lastTime;
    
    // 2초 이상 차이나면 멈췄던 걸로 간주
    if(diff > 2000 && state.isRunning) {
        const missedTrades = Math.floor(diff / 1000); // 1초당 1회 계산
        const simulateCount = Math.min(missedTrades, 300); // 최대 300건까지만 (렉 방지)

        if (simulateCount > 0 && currentPrice > 0) {
            for(let i=0; i<simulateCount; i++) {
                const jump = Math.floor(Math.random() * 400) + 100;
                totalDataCount += jump;
                realTradeCount++;
                if(Math.random() < 0.6) realWinCount++;
                
                // 마지막 1건만 실제 로그 생성
                if(i === simulateCount - 1) executeTrade();
            }
            console.log(`[AI System] Time Travel: ${simulateCount} trades recovered.`);
        }
        // 시간 갱신
        saveState();
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
