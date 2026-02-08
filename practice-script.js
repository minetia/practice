/* practice/practice-script.js - 일반 모드 스타일로 간결화 */
let isRunning = false, currentPrice = 0, totalProfit = 0, tradeCount = 0, winCount = 0, logs = [];
let wakeLock = null;

window.addEventListener('load', () => {
    // 1. 헤더/네비 로드
    const renderUI = (id, file) => {
        fetch(`https://minetia.github.io/${file}`).then(r => r.text()).then(h => {
            if(document.getElementById(id)) document.getElementById(id).innerHTML = h;
        });
    };
    renderUI('header-placeholder', 'header.html');
    renderUI('nav-placeholder', 'nav.html');

    // 2. 코인 설정
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    if(document.getElementById('coin-name')) document.getElementById('coin-name').innerText = coin;

    // 3. 초간결 가격 호출
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

// [AI 시작/중지] - 일반 모드처럼 직관적으로 묶음
window.startAi = async function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    
    // 버튼 상태 즉시 고정
    const btnS = document.getElementById('btn-start');
    const btnT = document.getElementById('btn-stop');
    if(btnS) { btnS.disabled = true; btnS.style.background = '#334155'; }
    if(btnT) { btnT.disabled = false; btnT.style.background = '#ef4444'; }
    if(document.getElementById('bet-amount')) document.getElementById('bet-amount').disabled = true;

    try { if(navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch(e){}

    const tradeLoop = () => {
        if(!isRunning) return;

        // 베팅 계산
        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.58; 
        const profit = isWin ? Math.floor(bet * 0.006) : -Math.floor(bet * 0.004);
        
        totalProfit += profit;
        tradeCount++;
        if(profit > 0) winCount++;
        
        // 로그 기록 (추출용 최소 데이터)
        logs.unshift({ time: new Date().toLocaleTimeString().split(' ')[1], type: isWin ? "롱" : "숏", profit });
        if(logs.length > 20) logs.pop();

        // 화면 갱신 (일반 모드처럼 깔끔하게)
        if(document.getElementById('win-rate')) 
            document.getElementById('win-rate').innerText = ((winCount/tradeCount)*100).toFixed(1) + "%";
        
        if(document.getElementById('live-asset')) 
            document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString() + " KRW";

        // 매매일지 - 일반 모드 스타일로 간결하게 출력
        const logList = document.getElementById('log-list');
        if(logList) {
            logList.innerHTML = logs.map(l => `
                <tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:10px; color:#94a3b8;">${l.time}</td>
                    <td style="padding:10px; font-weight:bold;">AI ${l.type}</td>
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

// [데이터 추출] - 필요한 정보만 딱 묶어서 다운로드
window.downloadPlusLog = function() {
    if(logs.length === 0) return alert("추출할 데이터가 없습니다.");
    let csv = "\uFEFF시간,포지션,수익\n";
    logs.forEach(l => { csv += `${l.time},${l.type},${l.profit}\n`; });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AI_Log_${new Date().getTime()}.csv`;
    a.click();
};
