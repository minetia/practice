/* practice/practice-script.js (플러스 페이지용) */
let isRunning = false, currentPrice = 0, totalProfit = 0, totalDataCount = 0, realTradeCount = 0, realWinCount = 0, tradeLogs = [];

window.addEventListener('load', async () => {
    // 1. [중요] 상단/하단 메뉴바 절대 경로로 불러오기 (이래야 보입니다)
    const renderMenu = (id, file) => {
        fetch(`https://minetia.github.io/${file}`)
            .then(res => res.text())
            .then(html => { document.getElementById(id).innerHTML = html; })
            .catch(e => console.log(file + " 로드 실패"));
    };
    renderMenu('header-placeholder', 'header.html');
    renderMenu('nav-placeholder', 'nav.html');

    // 2. 코인 설정 및 차트 로드
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    document.getElementById('coin-name').innerText = coin;
    
    if (window.TradingView) {
        new TradingView.widget({ "container_id": "tv_chart", "symbol": symbol, "interval": "1", "theme": "dark", "autosize": true, "hide_side_toolbar": true });
    }

    // 3. 가격 로딩 (로딩 중.. 글자를 실시간 숫자로 교체)
    const fetchPlusPrice = async () => {
        try {
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`);
            currentPrice = res.data[0].trade_price;
            document.getElementById('current-price').innerText = currentPrice.toLocaleString();
        } catch (e) { console.log("가격 로딩 실패"); }
        setTimeout(fetchPlusPrice, 1000);
    };
    fetchPlusPrice();
});

// [AI 시작 버튼 함수]
window.startAi = () => {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444';
    
    const loop = () => {
        if(!isRunning) return;
        // 매매 로직
        const bet = 50000000;
        const isWin = Math.random() < 0.6;
        const profit = isWin ? Math.floor(bet * 0.005) : -Math.floor(bet * 0.003);
        
        totalProfit += profit;
        realTradeCount++;
        if(isWin) realWinCount++;
        totalDataCount += Math.floor(Math.random() * 300) + 100;
        
        // 로그 기록
        tradeLogs.unshift({ time: new Date().toLocaleTimeString(), type: Math.random() > 0.5 ? "AI 롱" : "AI 숏", price: currentPrice, profit });
        if(tradeLogs.length > 20) tradeLogs.pop();
        
        // 화면 갱신
        document.getElementById('data-count').innerText = totalDataCount.toLocaleString();
        document.getElementById('win-rate').innerText = (realWinCount/realTradeCount*100).toFixed(1) + "%";
        document.getElementById('live-asset').innerText = (50000000 + totalProfit).toLocaleString() + " KRW";
        document.getElementById('log-list').innerHTML = tradeLogs.map(l => `<tr><td>${l.time}</td><td>${l.type}</td><td>${l.price.toLocaleString()}</td><td style="color:${l.profit>0?'#10b981':'#ef4444'}">${l.profit.toLocaleString()}</td></tr>`).join('');
        
        setTimeout(loop, 1500);
    };
    loop();
};

window.stopAi = () => {
    isRunning = false;
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.background = '#334155';
};
