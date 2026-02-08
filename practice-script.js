/* practice/practice-script.js - 승률/결과/추출 완벽 복구판 */
let isRunning = false, currentPrice = 0, totalProfit = 0, totalCount = 0, tradeCount = 0, winCount = 0, logs = [];
let wakeLock = null;

window.addEventListener('DOMContentLoaded', () => {
    // 1. UI 컴포넌트 로드 (절대 경로 고정)
    const loadUI = (id, file) => {
        fetch(`https://minetia.github.io/${file}`).then(r => r.text()).then(h => {
            if(document.getElementById(id)) document.getElementById(id).innerHTML = h;
        });
    };
    loadUI('header-placeholder', 'header.html');
    loadUI('nav-placeholder', 'nav.html');

    // 2. 코인 설정 및 차트 로드
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    if(document.getElementById('coin-name')) document.getElementById('coin-name').innerText = coin;

    if (window.TradingView) {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": symbol, "interval": "1", 
            "theme": "dark", "autosize": true, "hide_side_toolbar": true, "toolbar_bg": "#0f172a"
        });
    }

    // 3. 실시간 가격 루프 (초고속 로딩)
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
});

// [AI 시작] 버튼 상태와 입력창까지 완벽 제어
window.startAi = async function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;

    // 화면 꺼짐 방지
    try { if(navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch(e){}

    const btnS = document.getElementById('btn-start');
    const btnT = document.getElementById('btn-stop');
    const input = document.getElementById('bet-amount');

    if(btnS) { btnS.disabled = true; btnS.style.background = '#334155'; btnS.style.opacity = '0.5'; }
    if(btnT) { btnT.disabled = false; btnT.style.background = '#ef4444'; btnT.style.opacity = '1'; }
    if(input) { input.disabled = true; input.style.color = '#64748b'; }

    const loop = () => {
        if(!isRunning) return;

        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.58; // 실제 승률 타겟
        const percent = (Math.random() * 0.007) + 0.004;
        const profit = isWin ? Math.floor(bet * percent) : -Math.floor(bet * (percent * 0.8));
        
        // 데이터 누적 (여기가 승률 핵심!)
        totalProfit += profit;
        tradeCount++;
        if(profit > 0) winCount++;
        totalCount += Math.floor(Math.random() * 300) + 100;
        
        // 로그 데이터 생성 (체결가 소수점까지 디테일하게)
        const logData = {
            time: new Date().toLocaleTimeString('ko-KR', {hour12: false}),
            type: Math.random() > 0.5 ? "AI 롱" : "AI 숏",
            price: currentPrice + (Math.random() * 10 - 5),
            profit: profit,
            percent: (profit / bet * 100).toFixed(2)
        };
        logs.unshift(logData);
        if(logs.length > 50) logs.pop();

        // --- [화면 업데이트] ---
        if(document.getElementById('data-count')) document.getElementById('data-count').innerText = totalCount.toLocaleString();
        
        // 승률 업데이트 (winCount 기반 실시간 계산)
        if(document.getElementById('win-rate')) {
            const rate = ((winCount / tradeCount) * 100).toFixed(1);
            document.getElementById('win-rate').innerText = rate + "%";
            document.getElementById('win-rate').style.color = rate >= 50 ? "#f59e0b" : "#94a3b8";
        }
        
        if(document.getElementById('live-asset')) {
            const asset = bet + totalProfit;
            document.getElementById('live-asset').innerText = asset.toLocaleString() + " KRW";
            document.getElementById('live-asset').style.color = totalProfit >= 0 ? '#3b82f6' : '#ef4444';
        }
        
        const logList = document.getElementById('log-list');
        if(logList) {
            logList.innerHTML = logs.map(l => `
                <tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:12px; color:#94a3b8; font-size:0.75rem;">${l.time}</td>
                    <td style="padding:12px; font-weight:bold; color:${l.type.includes('롱')?'#10b981':'#ef4444'}">${l.type}</td>
                    <td style="padding:12px; font-size:0.85rem;">${l.price.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                    <td style="padding:12px; font-weight:bold; color:${l.profit > 0 ? '#10b981' : '#ef4444'}">
                        <div>${l.profit > 0 ? '+' : ''}${l.profit.toLocaleString()}</div>
                        <div style="font-size:0.65rem; opacity:0.7;">(${l.percent}%)</div>
                    </td>
                </tr>
            `).join('');
        }
        
        setTimeout(loop, 1500);
    };
    loop();
};

// [AI 중지]
window.stopAi = function() {
    isRunning = false;
    if(wakeLock) { wakeLock.release(); wakeLock = null; }
    
    const btnS = document.getElementById('btn-start');
    const btnT = document.getElementById('btn-stop');
    const input = document.getElementById('bet-amount');

    if(btnS) { btnS.disabled = false; btnS.style.background = '#3b82f6'; btnS.style.opacity = '1'; }
    if(btnT) { btnT.disabled = true; btnT.style.background = '#334155'; btnT.style.opacity = '0.5'; }
    if(input) { input.disabled = false; input.style.color = '#fff'; }
};

// [데이터 추출 - Blob 방식 완벽 수정]
window.downloadPlusLog = function() {
    if(logs.length === 0) { alert("추출할 데이터가 없습니다."); return; }
    let csv = "\uFEFF시간,포지션,체결가,수익,수익률\n";
    logs.forEach(l => {
        csv += `${l.time},${l.type},${l.price.toFixed(2)},${l.profit},${l.percent}%\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `Mining_Log_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};
