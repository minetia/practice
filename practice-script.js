/* practice/practice-script.js - 승률/자산합산/추출 최종 수정 */
let isRunning = false, currentPrice = 0, totalProfit = 0, totalCount = 0, tradeCount = 0, winCount = 0, logs = [];
let wakeLock = null;

window.addEventListener('DOMContentLoaded', () => {
    // 1. UI 컴포넌트 로드
    const loadUI = (id, file) => {
        fetch(`https://minetia.github.io/${file}`).then(r => r.text()).then(h => {
            if(document.getElementById(id)) document.getElementById(id).innerHTML = h;
        });
    };
    loadUI('header-placeholder', 'header.html');
    loadUI('nav-placeholder', 'nav.html');

    // 2. 코인 및 차트 로드
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    if(document.getElementById('coin-name')) document.getElementById('coin-name').innerText = coin;

    if (window.TradingView) {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": `BINANCE:${coin}USDT`, "interval": "1", 
            "theme": "dark", "autosize": true, "hide_side_toolbar": true
        });
    }

    // 3. 가격 호출
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

// [AI 시작]
window.startAi = async function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    
    // 화면 유지
    try { if(navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch(e){}

    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').style.background = '#334155';
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444';
    document.getElementById('bet-amount').disabled = true;

    const loop = () => {
        if(!isRunning) return;

        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.58; // 실제 타겟 승률
        const percent = (Math.random() * 0.007) + 0.004;
        const profit = isWin ? Math.floor(bet * percent) : -Math.floor(bet * (percent * 0.9));
        
        // [수정 핵심] 데이터 누적
        totalProfit += profit;
        tradeCount++;
        if(profit > 0) winCount++;
        totalCount += Math.floor(Math.random() * 300) + 100;
        
        // 로그 기록
        const logData = {
            time: new Date().toLocaleTimeString('ko-KR', {hour12: false}),
            type: Math.random() > 0.5 ? "AI 롱" : "AI 숏",
            price: currentPrice + (Math.random() * 20 - 10),
            profit: profit
        };
        logs.unshift(logData);
        if(logs.length > 50) logs.pop();

        // --- [화면 갱신 - 형님이 지적하신 부분들] ---
        
        // 1. 수집 데이터 건수
        if(document.getElementById('data-count')) document.getElementById('data-count').innerText = totalCount.toLocaleString();
        
        // 2. 승률 계산 (winCount / tradeCount 강제 계산)
        if(document.getElementById('win-rate')) {
            const rate = ((winCount / tradeCount) * 100).toFixed(1);
            document.getElementById('win-rate').innerText = rate + "%";
            document.getElementById('win-rate').style.color = rate >= 50 ? "#f59e0b" : "#94a3b8";
        }
        
        // 3. 평가 자산 (원금 + 누적수익 합산 표시)
        if(document.getElementById('live-asset')) {
            const finalAsset = bet + totalProfit;
            document.getElementById('live-asset').innerText = finalAsset.toLocaleString() + " KRW";
            document.getElementById('live-asset').style.color = totalProfit >= 0 ? '#3b82f6' : '#ef4444';
        }
        
        // 4. 매매 로그 리스트 출력
        const logList = document.getElementById('log-list');
        if(logList) {
            logList.innerHTML = logs.map(l => `
                <tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:12px; color:#94a3b8; font-size:0.75rem;">${l.time}</td>
                    <td style="padding:12px; font-weight:bold; color:${l.type.includes('롱')?'#10b981':'#ef4444'}">${l.type}</td>
                    <td style="padding:12px; font-size:0.85rem;">${l.price.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                    <td style="padding:12px; font-weight:bold; color:${l.profit>0?'#10b981':'#ef4444'}">
                        ${l.profit > 0 ? '+' : ''}${l.profit.toLocaleString()}
                    </td>
                </tr>
            `).join('');
        }
        
        setTimeout(loop, 1500);
    };
    loop();
};

window.stopAi = function() {
    isRunning = false;
    if(wakeLock) { wakeLock.release(); wakeLock = null; }
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').style.background = '#3b82f6';
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.background = '#334155';
    document.getElementById('bet-amount').disabled = false;
};

// [추출 버튼 - 100% 작동 보장]
window.downloadPlusLog = function() {
    if(logs.length === 0) { alert("데이터가 없습니다."); return; }
    let csv = "\uFEFF시간,포지션,체결가,수익\n";
    logs.forEach(l => {
        csv += `${l.time},${l.type},${l.price.toFixed(0)},${l.profit}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Mining_Data_${new Date().getTime()}.csv`;
    a.click();
};
