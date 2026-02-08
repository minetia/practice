/* practice/practice-script.js */
const ROOT_URL = "https://minetia.github.io/";
let isRunning = false, currentPrice = 0, totalProfit = 0, logs = [];

window.addEventListener('load', () => {
    // 하단 메뉴만 고정
    fetch(ROOT_URL + 'nav.html').then(r => r.text()).then(h => document.getElementById('nav-placeholder').innerHTML = h);

    const coin = new URLSearchParams(window.location.search).get('coin') || 'BTC';
    if (window.TradingView) {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": `BINANCE:${coin}USDT`, "interval": "1",
            "theme": "dark", "width": "100%", "height": 240, "hide_side_toolbar": true
        });
    }

    const getPrice = () => {
        fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`)
            .then(r => r.json()).then(d => {
                currentPrice = d[0].trade_price;
            }).catch(() => {});
        setTimeout(getPrice, 1000);
    };
    getPrice();
});

// 검색창 수리 (상단 검색창 전용)
window.plusSearch = function() {
    const val = document.getElementById('plus-search').value.toUpperCase();
    if(val) location.href = `index.html?coin=${val}`;
};

window.startAi = function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444';

    const loop = () => {
        if(!isRunning) return;
        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.58;
        const profit = isWin ? Math.floor(bet * 0.006) : -Math.floor(bet * 0.005);
        
        totalProfit += profit;

        const newLog = {
            time: new Date().toLocaleTimeString('ko-KR', {hour12:false}).split(' ')[0],
            type: isWin ? "롱" : "숏",
            profit: profit
        };
        
        // 화면 갱신
        document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString();
        
        // 리스트 상단에 추가 (무한히 내려감)
        const row = `<tr>
            <td style="color:#94a3b8;">${newLog.time}</td>
            <td style="font-weight:bold; color:${newLog.type==='롱'?'#10b981':'#ef4444'}">AI ${newLog.type}</td>
            <td style="text-align:right; font-weight:bold; color:${newLog.profit>0?'#10b981':'#ef4444'}">
                ${newLog.profit>0?'+':''}${newLog.profit.toLocaleString()}
            </td>
        </tr>`;
        document.getElementById('log-list').insertAdjacentHTML('afterbegin', row);
        
        setTimeout(loop, 1500);
    };
    loop();
};

window.stopAi = () => { isRunning = false; location.reload(); };
