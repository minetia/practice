/* practice/practice-script.js */
const ROOT_URL = "https://minetia.github.io/";
let isRunning = false, currentPrice = 0, totalProfit = 0, tradeCount = 0, winCount = 0, logs = [];
let wakeLock = null;

window.addEventListener('load', () => {
    // UI 로드
    const renderUI = (id, file) => {
        fetch(ROOT_URL + file).then(r => r.text()).then(h => { if(document.getElementById(id)) document.getElementById(id).innerHTML = h; });
    };
    renderUI('header-placeholder', 'header.html');
    renderUI('nav-placeholder', 'nav.html');

    // 코인 파라미터
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    document.getElementById('coin-name').innerText = coin;

    // [중요] 차트 생성 (높이 고정하여 아래 내용 안 가리게 함)
    if (window.TradingView) {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": `BINANCE:${coin}USDT`, "interval": "1",
            "theme": "dark", "width": "100%", "height": 320, "hide_side_toolbar": true, "toolbar_bg": "#0f172a"
        });
    }

    // 가격 호출
    const getPrice = () => {
        fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`)
            .then(r => r.json())
            .then(d => {
                currentPrice = d[0].trade_price;
                document.getElementById('current-price').innerText = currentPrice.toLocaleString();
            });
        setTimeout(getPrice, 1000);
    };
    getPrice();
});

window.startAi = async function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    
    // UI 잠금
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').style.background = '#334155';
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444';
    document.getElementById('bet-amount').disabled = true;

    if(navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');

    const loop = () => {
        if(!isRunning) return;

        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.58;
        const profit = isWin ? Math.floor(bet * 0.006) : -Math.floor(bet * 0.005);
        
        totalProfit += profit;
        tradeCount++;
        if(profit > 0) winCount++;

        // 로그 데이터
        logs.unshift({
            time: new Date().toLocaleTimeString('ko-KR', {hour12: false}).split(' ')[0],
            type: isWin ? "롱" : "숏",
            price: currentPrice + (Math.random() * 20 - 10),
            profit: profit
        });
        if(logs.length > 30) logs.pop();

        // UI 업데이트
        document.getElementById('data-count').innerText = (tradeCount * 250).toLocaleString() + "건";
        document.getElementById('win-rate').innerText = ((winCount/tradeCount)*100).toFixed(1) + "%";
        document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString() + " KRW";
        document.getElementById('live-asset').style.color = totalProfit >= 0 ? '#3b82f6' : '#ef4444';

        document.getElementById('log-list').innerHTML = logs.map(l => `
            <tr>
                <td style="color:#94a3b8; font-size:0.75rem;">${l.time}</td>
                <td style="font-weight:bold; color:${l.type==='롱'?'#10b981':'#ef4444'}">AI ${l.type}</td>
                <td style="font-size:0.8rem;">${l.price.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td style="text-align:right; font-weight:bold; color:${l.profit>0?'#10b981':'#ef4444'}">
                    ${l.profit > 0 ? '+' : ''}${l.profit.toLocaleString()}
                </td>
            </tr>
        `).join('');
        
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

// [데이터 추출] 체결가와 결과 모두 포함해서 엑셀용 추출
window.downloadPlusLog = function() {
    if(logs.length === 0) return alert("추출할 데이터가 없습니다.");
    let csv = "\uFEFF시간,포지션,체결가,수익금\n";
    logs.forEach(l => { csv += `${l.time},AI ${l.type},${l.price.toFixed(0)},${l.profit}\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Mining_Data_${Date.now()}.csv`;
    a.click();
};
