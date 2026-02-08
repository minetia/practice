/* practice/practice-script.js (최종 완성본) */
const ROOT_URL = "https://minetia.github.io/";

let isRunning = false;
let tradeInterval = null;
let currentPrice = 0;
let feeRate = 0.001; 
let tradeLogs = [];

window.onload = async () => {
    // 헤더, 네비 불러오기
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

    loadLogs(); 
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

function startAi() {
    if(isRunning) return;
    isRunning = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').style.background = '#334155';
    document.getElementById('btn-start').style.color = '#94a3b8';
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444';
    document.getElementById('btn-stop').style.color = '#fff';
    document.getElementById('bet-amount').disabled = true;
    runAutoTrade();
}

function stopAi() {
    isRunning = false;
    clearTimeout(tradeInterval);
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').style.background = '#3b82f6';
    document.getElementById('btn-start').style.color = '#fff';
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.background = '#334155';
    document.getElementById('btn-stop').style.color = '#94a3b8';
    document.getElementById('bet-amount').disabled = false;
}

function runAutoTrade() {
    if(!isRunning) return;
    executeTrade();
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
    saveLogs(); 
    renderLogs(); 
}

function saveLogs() {
    if(tradeLogs.length > 100) tradeLogs = tradeLogs.slice(0, 100);
    localStorage.setItem('PLUS_LOGS', JSON.stringify(tradeLogs));
}

function loadLogs() {
    const saved = localStorage.getItem('PLUS_LOGS');
    if(saved) tradeLogs = JSON.parse(saved);
    renderLogs();
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

// [핵심] 다운로드 기능
function downloadPlusLog() {
    if(tradeLogs.length === 0) {
        alert("수집된 데이터가 없습니다. AI를 가동해주세요.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Time,Type,Profit,Fee\n";
    tradeLogs.forEach(row => {
        csvContent += `${row.time},${row.type},${row.profit},${row.fee}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // 파일명: Plus_Data_날짜.csv
    const today = new Date().toISOString().slice(0,10).replace(/-/g,"");
    link.setAttribute("download", `Plus_Data_${today}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatInput(input) {
    let val = input.value.replace(/[^0-9]/g, '');
    if(!val) return;
    input.value = Number(val).toLocaleString();
}
