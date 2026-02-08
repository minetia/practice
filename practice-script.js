/* practice/practice-script.js (플러스 페이지용) */
let isRunning = false, currentPrice = 0, totalProfit = 0, totalDataCount = 0, realTradeCount = 0, realWinCount = 0, tradeLogs = [];

window.addEventListener('load', () => {
    // 1. 메뉴바 로드
    const renderPart = (id, file) => {
        fetch(`https://minetia.github.io/${file}`).then(r => r.text()).then(h => { document.getElementById(id).innerHTML = h; });
    };
    renderPart('header-placeholder', 'header.html');
    renderPart('nav-placeholder', 'nav.html');

    // 2. 코인 및 차트
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    document.getElementById('coin-name').innerText = coin;
    
    // 3. 가격 로딩 (기본 fetch 사용)
    const getPrice = () => {
        fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`)
            .then(r => r.json())
            .then(data => {
                currentPrice = data[0].trade_price;
                document.getElementById('current-price').innerText = currentPrice.toLocaleString();
            });
        setTimeout(getPrice, 1000);
    };
    getPrice();
});

// 버튼 함수를 전역으로 강제 등록 (그래야 버튼이 눌림)
window.startAi = function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.backgroundColor = '#ef4444';
    
    function loop() {
        if(!isRunning) return;
        const bet = 50000000;
        const isWin = Math.random() < 0.6;
        const profit = isWin ? Math.floor(bet * 0.005) : -Math.floor(bet * 0.003);
        
        totalProfit += profit;
        realTradeCount++;
        if(isWin) realWinCount++;
        totalDataCount += Math.floor(Math.random() * 300) + 100;
        
        tradeLogs.unshift({ time: new Date().toLocaleTimeString(), type: Math.random() > 0.5 ? "AI 롱" : "AI 숏", price: currentPrice, profit });
        if(tradeLogs.length > 20) tradeLogs.pop();
        
        document.getElementById('data-count').innerText = totalDataCount.toLocaleString();
        document.getElementById('win-rate').innerText = (realWinCount/realTradeCount*100).toFixed(1) + "%";
        document.getElementById('live-asset').innerText = (50000000 + totalProfit).toLocaleString() + " KRW";
        document.getElementById('log-list').innerHTML = tradeLogs.map(l => `<tr><td>${l.time}</td><td>${l.type}</td><td>${l.price.toLocaleString()}</td><td style="color:${l.profit>0?'#10b981':'#ef4444'}">${l.profit.toLocaleString()}</td></tr>`).join('');
        
        setTimeout(loop, 1500);
    }
    loop();
};

window.stopAi = function() {
    isRunning = false;
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.backgroundColor = '#334155';
};
