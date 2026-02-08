/* practice/practice-script.js - 좀비 복구 및 화면 유지 강화판 */
let isRunning = false, currentPrice = 0, totalProfit = 0, totalCount = 0, tradeCount = 0, winCount = 0, logs = [];
let wakeLock = null;
let lastUpdate = Date.now(); // 멈춤 감지용 타임스탬프

window.addEventListener('DOMContentLoaded', () => {
    // 1. UI 로드
    const loadUI = (id, file) => {
        fetch(`https://minetia.github.io/${file}`).then(r => r.text()).then(h => {
            if(document.getElementById(id)) document.getElementById(id).innerHTML = h;
        });
    };
    loadUI('header-placeholder', 'header.html');
    loadUI('nav-placeholder', 'nav.html');

    // 2. 코인 설정 및 차트
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    if(document.getElementById('coin-name')) document.getElementById('coin-name').innerText = coin;

    if (window.TradingView) {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": `BINANCE:${coin}USDT`, "interval": "1", 
            "theme": "dark", "autosize": true, "hide_side_toolbar": true
        });
    }

    // 3. 가격 루프
    const getPrice = async () => {
        try {
            const r = await fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`);
            const d = await r.json();
            currentPrice = d[0].trade_price;
            if(document.getElementById('current-price')) document.getElementById('current-price').innerText = currentPrice.toLocaleString();
        } catch(e) {}
        setTimeout(getPrice, 1000);
    };
    getPrice();

    // [핵심] 다시 돌아왔을 때 멈춘 시간만큼 복구하는 기능
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === 'visible' && isRunning) {
            const now = Date.now();
            const gap = now - lastUpdate;
            if(gap > 5000) { // 5초 이상 멈췄었다면
                const missedTrades = Math.floor(gap / 1500); // 1.5초당 1회 매매로 계산
                for(let i=0; i < Math.min(missedTrades, 50); i++) { // 최대 50건까지 복구
                    executeTrade(true); 
                }
                console.log(`${missedTrades}건의 밀린 데이터 복구 완료`);
            }
            requestWakeLock(); // 화면 유지 다시 요청
        }
    });
});

// 화면 유지 요청 함수
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {}
}

// 매매 실행 로직 (별도 함수로 분리)
function executeTrade(isBackground = false) {
    if(!isRunning || currentPrice === 0) return;

    const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
    const isWin = Math.random() < 0.58;
    const percent = (Math.random() * 0.007) + 0.004;
    const profit = isWin ? Math.floor(bet * percent) : -Math.floor(bet * (percent * 0.8));
    
    totalProfit += profit;
    tradeCount++;
    if(profit > 0) winCount++;
    totalCount += Math.floor(Math.random() * 300) + 100;
    
    const logData = {
        time: new Date().toLocaleTimeString('ko-KR', {hour12: false}),
        type: Math.random() > 0.5 ? "AI 롱" : "AI 숏",
        price: currentPrice + (Math.random() * 20 - 10),
        profit: profit
    };
    logs.unshift(logData);
    if(logs.length > 50) logs.pop();

    if(!isBackground) renderUI(bet); // 백그라운드 복구 중엔 UI 갱신 생략(속도 향상)
    lastUpdate = Date.now();
}

function renderUI(bet) {
    if(document.getElementById('data-count')) document.getElementById('data-count').innerText = totalCount.toLocaleString();
    if(document.getElementById('win-rate')) {
        const rate = ((winCount / tradeCount) * 100).toFixed(1);
        document.getElementById('win-rate').innerText = rate + "%";
    }
    if(document.getElementById('live-asset')) {
        document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString() + " KRW";
    }
    const logList = document.getElementById('log-list');
    if(logList) {
        logList.innerHTML = logs.map(l => `
            <tr style="border-bottom:1px solid #1e293b;">
                <td style="padding:12px; color:#94a3b8; font-size:0.75rem;">${l.time}</td>
                <td style="padding:12px; font-weight:bold; color:${l.type.includes('롱')?'#10b981':'#ef4444'}">${l.type}</td>
                <td style="padding:12px;">${l.price.toLocaleString()}</td>
                <td style="padding:12px; font-weight:bold; color:${l.profit>0?'#10b981':'#ef4444'}">${l.profit>0?'+':''}${l.profit.toLocaleString()}</td>
            </tr>
        `).join('');
    }
}

window.startAi = function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    requestWakeLock();

    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').style.background = '#334155';
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444';
    document.getElementById('bet-amount').disabled = true;

    const loop = () => {
        if(!isRunning) return;
        executeTrade();
        setTimeout(loop, 1500);
    };
    loop();
};

window.stopAi = function() {
    isRunning = false;
    if(wakeLock) wakeLock.release();
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').style.background = '#3b82f6';
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.background = '#334155';
    document.getElementById('bet-amount').disabled = false;
};

// [추출] 버튼 로직 유지
window.downloadPlusLog = function() {
    if(logs.length === 0) return alert("데이터 없음");
    let csv = "\uFEFF시간,포지션,체결가,수익\n";
    logs.forEach(l => { csv += `${l.time},${l.type},${l.price},${l.profit}\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Mining_${Date.now()}.csv`;
    a.click();
};
