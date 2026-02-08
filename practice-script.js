/* practice/practice-script.js - 전체 통합 스크롤 및 리스트 정밀 정렬 */
let isRunning = false, currentPrice = 0, totalProfit = 0, tradeCount = 0, winCount = 0, logs = [];
let wakeLock = null;

window.addEventListener('load', () => {
    // 1. UI 로드
    const renderUI = (id, file) => {
        fetch(`https://minetia.github.io/${file}`).then(r => r.text()).then(h => {
            if(document.getElementById(id)) document.getElementById(id).innerHTML = h;
        });
    };
    renderUI('header-placeholder', 'header.html');
    renderUI('nav-placeholder', 'nav.html');

    // 2. 코인 및 차트 (전체 스크롤을 위해 높이 최적화)
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    if(document.getElementById('coin-name')) document.getElementById('coin-name').innerText = coin;

    if (window.TradingView) {
        new TradingView.widget({
            "container_id": "tv_chart", 
            "symbol": `BINANCE:${coin}USDT`, 
            "interval": "1", 
            "theme": "dark", 
            "width": "100%",
            "height": 400, // 차트 높이 고정하여 전체 스크롤 유도
            "hide_side_toolbar": true
        });
    }

    // 3. 가격 루프
    const getPrice = () => {
        fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`)
            .then(r => r.json())
            .then(d => {
                currentPrice = d[0].trade_price;
                if(document.getElementById('current-price')) 
                    document.getElementById('current-price').innerText = currentPrice.toLocaleString();
            }).catch(() => {});
        setTimeout(getPrice, 1000);
    };
    getPrice();
});

// [AI 시작]
window.startAi = async function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    
    const btnS = document.getElementById('btn-start');
    const btnT = document.getElementById('btn-stop');
    if(btnS) { btnS.disabled = true; btnS.style.background = '#334155'; }
    if(btnT) { btnT.disabled = false; btnT.style.background = '#ef4444'; }
    if(document.getElementById('bet-amount')) document.getElementById('bet-amount').disabled = true;

    try { if(navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch(e){}

    const tradeLoop = () => {
        if(!isRunning) return;

        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.58; 
        const profit = isWin ? Math.floor(bet * 0.006) : -Math.floor(bet * 0.005);
        
        totalProfit += profit;
        tradeCount++;
        if(profit > 0) winCount++;
        
        // [수정] 체결가 데이터를 포함한 로그
        logs.unshift({ 
            time: new Date().toLocaleTimeString('ko-KR', {hour12: false}).split(' ')[0], 
            type: isWin ? "롱" : "숏", 
            price: currentPrice + (Math.random() * 20 - 10),
            profit: profit 
        });
        if(logs.length > 30) logs.pop();

        // 상단 정보 갱신
        if(document.getElementById('win-rate')) 
            document.getElementById('win-rate').innerText = ((winCount/tradeCount)*100).toFixed(1) + "%";
        if(document.getElementById('live-asset')) 
            document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString() + " KRW";

        // [핵심] 리스트 정렬 - 체결가/결과 포함 4칸 구성
        const logList = document.getElementById('log-list');
        if(logList) {
            logList.innerHTML = logs.map(l => `
                <tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:10px; color:#94a3b8; font-size:0.7rem;">${l.time}</td>
                    <td style="padding:10px; font-weight:bold; color:${l.type==='롱'?'#10b981':'#ef4444'}">AI ${l.type}</td>
                    <td style="padding:10px; font-size:0.8rem;">${l.price.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                    <td style="padding:10px; text-align:right; color:${l.profit>0?'#10b981':'#ef4444'}; font-weight:bold;">
                        ${l.profit > 0 ? '+' : ''}${l.profit.toLocaleString()}
                    </td>
                </tr>
            `).join('');
        }
        setTimeout(tradeLoop, 1500);
    };
    tradeLoop();
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

// [추출] 체결가까지 포함해서 묶어 추출
window.downloadPlusLog = function() {
    if(logs.length === 0) return alert("데이터 없음");
    let csv = "\uFEFF시간,포지션,체결가,수익금\n";
    logs.forEach(l => { csv += `${l.time},AI ${l.type},${l.price.toFixed(0)},${l.profit}\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Mining_Final_${new Date().getTime()}.csv`;
    a.click();
};
