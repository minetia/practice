/* practice/practice-script.js (모바일 다운로드 오류 수정 완료) */
const ROOT_URL = "https://minetia.github.io/";

let isRunning = false;
let tradeInterval = null;
let currentPrice = 0;
let feeRate = 0.001; 
let tradeLogs = [];

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

    // 시간 여행(백그라운드 복귀) 기능 포함
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

// ==========================================
// [중요] 버튼 연결을 위한 글로벌 함수 설정
// ==========================================
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

// [핵심] 모바일 전용 다운로드 함수 (수정됨)
window.downloadPlusLog = function() {
    // 1. 데이터 확인
    if(!tradeLogs || tradeLogs.length === 0) {
        alert("수집된 데이터가 없습니다.\nAI를 먼저 가동해주세요!");
        return;
    }

    // 2. CSV 내용 만들기 (한글 깨짐 방지 BOM 추가 \uFEFF)
    let csvContent = "\uFEFFTime,Type,Profit,Fee\n";
    tradeLogs.forEach(row => {
        csvContent += `${row.time},${row.type},${row.profit},${row.fee}\n`;
    });

    // 3. 모바일 호환성 높은 Blob 방식으로 변환
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 4. 가짜 링크 만들어서 클릭
    const link = document.createElement("a");
    link.href = url;
    
    // 파일명 설정 (예: Plus_Data_20240521.csv)
    const today = new Date().toISOString().slice(0,10).replace(/-/g,"");
    link.setAttribute("download", `Plus_Data_${today}.csv`);
    
    document.body.appendChild(link);
    link.click();
    
    // 5. 뒷정리
    setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 100);
}

function updateUiRunning(active) {
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const input = document.getElementById('bet-amount');

    if(active) {
        btnStart.disabled = true;
        btnStart.style.background = '#334155';
        btnStart.style.color = '#94a3b8';
        btnStop.disabled = false;
        btnStop.style.background = '#ef4444';
        btnStop.style.color = '#fff';
        input.disabled = true;
    } else {
        btnStart.disabled = false;
        btnStart.style.background = '#3b82f6';
        btnStart.style.color = '#fff';
        btnStop.disabled = true;
        btnStop.style.background = '#334155';
        btnStop.style.color = '#94a3b8';
        input.disabled = false;
    }
}

function runAutoTrade() {
    if(!isRunning) return;
    executeTrade();
    saveState();
    const nextTime = Math.random() * 1000 + 1000; 
    tradeInterval = setTimeout(runAutoTrade, nextTime);
}

function executeTrade() {
    const input = document.getElementById('bet-amount');
    const betAmount = Number(input.value.replace(/,/g, '')) || 50000000;
    const fee = Math.floor(betAmount * feeRate);
    const isWin = Math.random() < 0.6; 
    const percent = (Math.random() * 0.008) + 0.005;

    let profit = 0;
    if(isWin) profit = Math.floor(betAmount * percent) - fee;
    else profit = -Math.floor(betAmount * (percent * 0.6)) - fee;

    const logData = {
        time: new Date().toTimeString().split(' ')[0],
        type: Math.random() > 0.5 ? "AI 롱" : "AI 숏",
        profit: profit,
        fee: fee
    };

    tradeLogs.unshift(logData);
    if(tradeLogs.length > 100) tradeLogs = tradeLogs.slice(0, 100);
    renderLogs(); 
}

function saveState() {
    const input = document.getElementById('bet-amount');
    const state = {
        isRunning: isRunning,
        lastTime: Date.now(),
        amount: input.value,
        logs: tradeLogs
    };
    localStorage.setItem('PLUS_AI_STATE', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('PLUS_AI_STATE');
    if(!saved) return;

    const state = JSON.parse(saved);
    tradeLogs = state.logs || [];
    renderLogs();

    const input = document.getElementById('bet-amount');
    if(input) input.value = state.amount;

    if (state.isRunning) {
        const now = Date.now();
        const diff = now - state.lastTime;
        const missedTrades = Math.floor(diff / 1500);
        const simulateCount = Math.min(missedTrades, 100); 

        if (simulateCount > 0) {
            for(let i=0; i<simulateCount; i++) executeTrade(); 
            alert(`AI가 부재중에 ${simulateCount}건의 데이터를 추가 수집했습니다!`);
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
    
    if(countEl) countEl.innerText = tradeLogs.length;

    if(tradeLogs.length > 0) {
        if(emptyMsg) emptyMsg.style.display = 'none';
        tbody.innerHTML = ''; 
        
        tradeLogs.forEach(log => {
            const row = document.createElement('tr');
            const color = log.profit >= 0 ? '#10b981' : '#ef4444';
            const sign = log.profit >= 0 ? '+' : '';
            
            row.innerHTML = `
                <td style="color:#94a3b8;">${log.time}</td>
                <td style="font-weight:bold;">${log.type}</td>
                <td style="color:${color}; font-weight:bold;">${sign}${log.profit.toLocaleString()}</td>
                <td style="color:#64748b; font-size:0.75rem;">-${log.fee.toLocaleString()}</td>
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
}
