/* practice/practice-script.js - 승률 & 리스트 강화판 */
let isRunning = false, currentPrice = 0, totalProfit = 0, totalCount = 0, tradeCount = 0, winCount = 0, logs = [];

window.addEventListener('DOMContentLoaded', () => {
    // 1. UI 컴포넌트 로드
    const loadUI = (id, file) => {
        fetch(`https://minetia.github.io/${file}`).then(r => r.text()).then(h => {
            if(document.getElementById(id)) document.getElementById(id).innerHTML = h;
        });
    };
    loadUI('header-placeholder', 'header.html');
    loadUI('nav-placeholder', 'nav.html');

    // 2. 코인 설정
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    if(document.getElementById('coin-name')) document.getElementById('coin-name').innerText = coin;

    // 3. 실시간 가격 (무한 재시도)
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

// 버튼 함수 (window에 등록해야 뻑이 안 남)
window.startAi = function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.backgroundColor = '#ef4444';
    
    const loop = () => {
        if(!isRunning) return;
        
        // --- [매매 시뮬레이션] ---
        const bet = 50000000;
        const isWin = Math.random() < 0.6; // 승률 60% 세팅
        const percent = (Math.random() * 0.008) + 0.005;
        const profit = isWin ? Math.floor(bet * percent) : -Math.floor(bet * 0.004);
        
        // 데이터 업데이트
        totalProfit += profit;
        tradeCount++;
        if(isWin) winCount++;
        totalCount += Math.floor(Math.random() * 300) + 100;
        
        // 로그 추가
        logs.unshift({
            time: new Date().toLocaleTimeString().split(' ')[1],
            type: Math.random() > 0.5 ? "AI 롱" : "AI 숏",
            price: currentPrice,
            profit: profit
        });
        if(logs.length > 30) logs.pop(); // 리스트 30개 유지 (성능 최적화)

        // --- [화면 갱신] ---
        if(document.getElementById('data-count')) document.getElementById('data-count').innerText = totalCount.toLocaleString();
        if(document.getElementById('win-rate')) document.getElementById('win-rate').innerText = ((winCount/tradeCount)*100).toFixed(1) + "%";
        if(document.getElementById('live-asset')) document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString() + " KRW";
        
        const logList = document.getElementById('log-list');
        if(logList) {
            logList.innerHTML = logs.map(l => `
                <tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:12px; color:#94a3b8;">${l.time}</td>
                    <td style="padding:12px; font-weight:bold; color:${l.type.includes('롱')?'#10b981':'#ef4444'}">${l.type}</td>
                    <td style="padding:12px;">${l.price.toLocaleString()}</td>
                    <td style="padding:12px; font-weight:bold; color:${l.profit>0?'#10b981':'#ef4444'}">${l.profit > 0 ? '+' : ''}${l.profit.toLocaleString()}</td>
                </tr>
            `).join('');
        }
        
        setTimeout(loop, 1500);
    };
    loop();
};

window.stopAi = function() {
    isRunning = false;
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.backgroundColor = '#334155';
};
