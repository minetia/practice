/* practice/practice-script.js */
const ROOT_URL = "https://minetia.github.io/";
let isRunning = false, currentPrice = 0, totalProfit = 0, tradeCount = 0, winCount = 0, logs = [];

window.addEventListener('load', () => {
    fetch(ROOT_URL + 'header.html').then(r => r.text()).then(h => document.getElementById('header-placeholder').innerHTML = h);
    fetch(ROOT_URL + 'nav.html').then(r => r.text()).then(h => document.getElementById('nav-placeholder').innerHTML = h);

    const coin = new URLSearchParams(window.location.search).get('coin') || 'BTC';
    document.getElementById('coin-name').innerText = coin;

    if (window.TradingView) {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": `BINANCE:${coin}USDT`, "interval": "1",
            "theme": "dark", "width": "100%", "height": 260, "hide_side_toolbar": true
        });
    }

    const getPrice = () => {
        fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`)
            .then(r => r.json()).then(d => {
                currentPrice = d[0].trade_price;
                document.getElementById('current-price').innerText = currentPrice.toLocaleString();
            }).catch(() => {});
        setTimeout(getPrice, 1000);
    };
    getPrice();
});

// 플러스 모드 전용 검색 기능
window.plusSearch = function() {
    const val = document.getElementById('plus-coin-search').value.toUpperCase();
    if(val) location.href = `index.html?coin=${val}`;
};

window.startAi = function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444';
    document.getElementById('bet-amount').disabled = true;

    const loop = () => {
        if(!isRunning) return;
        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.58;
        const profit = isWin ? Math.floor(bet * (0.005 + Math.random() * 0.003)) : -Math.floor(bet * 0.005);
        
        totalProfit += profit;
        tradeCount++;
        if(profit > 0) winCount++;

        logs.unshift({
            time: new Date().toLocaleTimeString('ko-KR', {hour12:false}).split(' ')[0],
            type: isWin ? "롱" : "숏",
            profit: profit
        });
        if(logs.length > 20) logs.pop();

        document.getElementById('data-count').innerText = (tradeCount * 412).toLocaleString() + "건";
        document.getElementById('win-rate').innerText = ((winCount/tradeCount)*100).toFixed(1) + "%";
        document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString();
        document.getElementById('live-asset').style.color = totalProfit >= 0 ? '#3b82f6' : '#ef4444';
        
        document.getElementById('log-list').innerHTML = logs.map(l => `
            <tr style="border-bottom:1px solid #1e293b;">
                <td style="padding:12px 10px; color:#94a3b8;">${l.time}</td>
                <td style="padding:12px 10px; font-weight:bold; color:${l.type==='롱'?'#10b981':'#ef4444'}">AI ${l.type}</td>
                <td style="padding:12px 10px; text-align:right; font-weight:bold; color:${l.profit>0?'#10b981':'#ef4444'}">
                    ${l.profit>0?'+':''}${l.profit.toLocaleString()}
                </td>
            </tr>
        `).join('');
        setTimeout(loop, 1200);
    };
    loop();
};

window.stopAi = () => { isRunning = false; location.reload(); };

window.downloadPlusLog = () => {
    let csv = "\uFEFF시간,포지션,수익\n";
    logs.forEach(l => { csv += `${l.time},${l.type},${l.profit}\n`; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = `Mining_Data.csv`;
    a.click();
};
