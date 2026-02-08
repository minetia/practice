/* practice/practice-script.js */
const ROOT_URL = "https://minetia.github.io/";
let isRunning = false, currentPrice = 0, totalProfit = 0, tradeCount = 0, winCount = 0, logs = [];
let wakeLock = null;

// 초기화
window.addEventListener('load', () => {
    // 1. 공통 메뉴 로드 (절대경로)
    const loadCommon = (id, file) => {
        fetch(ROOT_URL + file).then(r => r.text()).then(html => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = html;
            // 검색 버튼 이벤트 강제 연결
            if(id === 'header-placeholder') {
                const searchBtn = el.querySelector('button');
                if(searchBtn) searchBtn.onclick = window.searchCoin;
            }
        });
    };
    loadCommon('header-placeholder', 'header.html');
    loadCommon('nav-placeholder', 'nav.html');

    // 2. 파라미터 및 차트
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    document.getElementById('coin-name').innerText = coin;

    if (window.TradingView) {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": `BINANCE:${coin}USDT`, "interval": "1",
            "theme": "dark", "width": "100%", "height": 260, "hide_side_toolbar": true
        });
    }

    // 3. 가격 호출 (멈춤 방지)
    const getPrice = () => {
        fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`)
            .then(r => r.json())
            .then(d => {
                currentPrice = d[0].trade_price;
                document.getElementById('current-price').innerText = currentPrice.toLocaleString();
            }).catch(() => {});
        setTimeout(getPrice, 1000);
    };
    getPrice();
});

// 검색 함수
window.searchCoin = function() {
    const input = document.querySelector('input[placeholder*="코인명"]');
    if(!input || !input.value) return;
    location.href = `index.html?coin=${input.value.toUpperCase()}`;
};

// AI 시작 (수치 갱신 로직 포함)
window.startAi = async function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    
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
        const profit = isWin ? Math.floor(bet * 0.007) : -Math.floor(bet * 0.005);
        
        totalProfit += profit;
        tradeCount++;
        if(profit > 0) winCount++;

        // 로그 데이터
        logs.unshift({
            time: new Date().toLocaleTimeString('ko-KR', {hour12: false}).split(' ')[0],
            type: isWin ? "롱" : "숏",
            price: currentPrice + (Math.random() * 40 - 20),
            profit: profit
        });
        if(logs.length > 25) logs.pop();

        // [핵심] 화면 수치 갱신
        document.getElementById('data-count').innerText = (tradeCount * 324).toLocaleString() + "건";
        document.getElementById('win-rate').innerText = ((winCount/tradeCount)*100).toFixed(1) + "%";
        document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString() + " KRW";
        document.getElementById('live-asset').style.color = totalProfit >= 0 ? '#3b82f6' : '#ef4444';

        document.getElementById('log-list').innerHTML = logs.map(l => `
            <tr>
                <td style="color:#94a3b8; font-size:0.7rem;">${l.time}</td>
                <td style="font-weight:bold; color:${l.type==='롱'?'#10b981':'#ef4444'}">AI ${l.type}</td>
                <td style="font-size:0.75rem;">${l.price.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
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

// 추출
window.downloadPlusLog = function() {
    if(logs.length === 0) return alert("데이터 없음");
    let csv = "\uFEFF시간,포지션,체결가,수익\n";
    logs.forEach(l => { csv += `${l.time},AI ${l.type},${l.price.toFixed(0)},${l.profit}\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Mining_Data.csv`;
    a.click();
};
