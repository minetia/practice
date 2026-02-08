const ROOT_URL = "https://minetia.github.io/";
let isRunning = false, currentPrice = 0, totalProfit = 0;

window.addEventListener('load', () => {
    fetch(ROOT_URL + 'nav.html').then(r => r.text()).then(h => document.getElementById('nav-placeholder').innerHTML = h);
    const coin = new URLSearchParams(window.location.search).get('coin') || 'BTC';
    if (window.TradingView) {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": `BINANCE:${coin}USDT`, "interval": "1",
            "theme": "dark", "width": "100%", "height": 260, "hide_side_toolbar": true
        });
    }
    const getPrice = () => {
        fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`)
            .then(r => r.json()).then(d => { currentPrice = d[0].trade_price; }).catch(() => {});
        setTimeout(getPrice, 1000);
    };
    getPrice();
});

window.pSearch = () => {
    const v = document.getElementById('p-search').value.toUpperCase();
    if(v) location.href = `index.html?coin=${v}`;
};

window.startAi = () => {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').style.opacity = "0.5";
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = "#ef4444";

    const loop = () => {
        if(!isRunning) return;
        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.58;
        const profit = isWin ? Math.floor(bet * 0.006) : -Math.floor(bet * 0.005);
        totalProfit += profit;
        
        document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString();
        document.getElementById('live-asset').style.color = totalProfit >= 0 ? '#10b981' : '#ef4444';

        const row = `<tr>
            <td style="color:#94a3b8; font-size:0.75rem;">${new Date().toLocaleTimeString('ko-KR', {hour12:false}).split(' ')[0]}</td>
            <td style="font-weight:bold; color:${isWin?'#10b981':'#ef4444'}">AI ${isWin?'롱':'숏'}</td>
            <td style="text-align:right; font-weight:bold; color:${profit>0?'#10b981':'#ef4444'}">${profit>0?'+':''}${profit.toLocaleString()}</td>
        </tr>`;
        document.getElementById('log-list').insertAdjacentHTML('afterbegin', row);
        setTimeout(loop, 1500);
    };
    loop();
};

window.stopAi = () => { isRunning = false; location.reload(); };
