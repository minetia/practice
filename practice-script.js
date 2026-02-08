/* practice/practice-script.js - 차트 복구 & 버튼 상태 완벽 제어 */
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

    // 2. 코인 설정 및 차트 강제 로드
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    if(document.getElementById('coin-name')) document.getElementById('coin-name').innerText = coin;

    // [차트 복구] TradingView 로딩 확인 후 생성
    const loadChart = () => {
        if (window.TradingView) {
            new TradingView.widget({
                "container_id": "tv_chart",
                "symbol": symbol,
                "interval": "1",
                "theme": "dark",
                "autosize": true,
                "hide_side_toolbar": true,
                "toolbar_bg": "#0f172a"
            });
        } else {
            setTimeout(loadChart, 500); // 로딩 안됐으면 0.5초 후 재시도
        }
    };
    loadChart();

    // 3. 실시간 가격
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

// AI 시작 함수
window.startAi = function() {
    if(isRunning || currentPrice === 0) return;
    
    // [버튼 및 입력창 상태 제어]
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const inputAmount = document.getElementById('bet-amount');

    isRunning = true;
    
    // 버튼 색상 및 상태 즉시 변경
    if(btnStart) {
        btnStart.disabled = true;
        btnStart.style.backgroundColor = '#334155'; // 어두운 색으로 변경
        btnStart.style.opacity = '0.5';
    }
    if(btnStop) {
        btnStop.disabled = false;
        btnStop.style.backgroundColor = '#ef4444'; // 빨간색 활성화
        btnStop.style.opacity = '1';
    }
    if(inputAmount) {
        inputAmount.disabled = true; // 금액 수정 금지
        inputAmount.style.color = '#64748b'; // 입력창 글자색 회색으로
    }

    const loop = () => {
        if(!isRunning) return;
        
        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.6;
        const percent = (Math.random() * 0.008) + 0.005;
        const profit = isWin ? Math.floor(bet * percent) : -Math.floor(bet * 0.004);
        
        totalProfit += profit;
        tradeCount++;
        if(isWin) winCount++;
        totalCount += Math.floor(Math.random() * 300) + 100;
        
        logs.unshift({
            time: new Date().toLocaleTimeString('ko-KR', {hour12: false}).split(' ')[0],
            type: Math.random() > 0.5 ? "AI 롱" : "AI 숏",
            price: currentPrice + Math.floor(Math.random() * 1000 - 500),
            profit: profit
        });
        if(logs.length > 20) logs.pop();

        // 화면 갱신
        if(document.getElementById('data-count')) document.getElementById('data-count').innerText = totalCount.toLocaleString();
        if(document.getElementById('win-rate')) document.getElementById('win-rate').innerText = ((winCount/tradeCount)*100).toFixed(1) + "%";
        if(document.getElementById('live-asset')) document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString() + " KRW";
        
        const logList = document.getElementById('log-list');
        if(logList) {
            logList.innerHTML = logs.map(l => `
                <tr>
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

// AI 중지 함수
window.stopAi = function() {
    isRunning = false;
    
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const inputAmount = document.getElementById('bet-amount');

    if(btnStart) {
        btnStart.disabled = false;
        btnStart.style.backgroundColor = '#3b82f6'; // 원래 파란색으로 복구
        btnStart.style.opacity = '1';
    }
    if(btnStop) {
        btnStop.disabled = true;
        btnStop.style.backgroundColor = '#334155'; // 다시 비활성 색으로
        btnStop.style.opacity = '0.5';
    }
    if(inputAmount) {
        inputAmount.disabled = false; // 금액 수정 허용
        inputAmount.style.color = '#fff'; // 글자색 복구
    }
};
