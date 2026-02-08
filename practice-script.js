/* practice/practice-script.js - 일반 모드 스타일 통합 및 추출 강화 */
let isRunning = false, currentPrice = 0, totalProfit = 0, tradeCount = 0, winCount = 0, logs = [];
let wakeLock = null;

// [1] 페이지 로드 시 초기화
window.addEventListener('load', () => {
    // 헤더, 네비 로드 (절대 경로)
    const renderUI = (id, file) => {
        fetch(`https://minetia.github.io/${file}`).then(r => r.text()).then(h => {
            if(document.getElementById(id)) document.getElementById(id).innerHTML = h;
        });
    };
    renderUI('header-placeholder', 'header.html');
    renderUI('nav-placeholder', 'nav.html');

    // 코인 설정
    const params = new URLSearchParams(window.location.search);
    const coin = params.get('coin') || 'BTC';
    if(document.getElementById('coin-name')) document.getElementById('coin-name').innerText = coin;

    // 가격 호출
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

// [2] AI 시작 (일반 모드처럼 깔끔하게 묶음)
window.startAi = async function() {
    if(isRunning || currentPrice === 0) return;
    isRunning = true;
    
    // 버튼 상태 및 입력창 즉시 잠금
    const btnS = document.getElementById('btn-start');
    const btnT = document.getElementById('btn-stop');
    if(btnS) { btnS.disabled = true; btnS.style.background = '#334155'; btnS.style.opacity = '0.5'; }
    if(btnT) { btnT.disabled = false; btnT.style.background = '#ef4444'; btnT.style.opacity = '1'; }
    if(document.getElementById('bet-amount')) document.getElementById('bet-amount').disabled = true;

    // 화면 꺼짐 방지
    try { if(navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch(e){}

    const tradeLoop = () => {
        if(!isRunning) return;

        // 수익 계산
        const bet = Number(document.getElementById('bet-amount').value.replace(/,/g, '')) || 50000000;
        const isWin = Math.random() < 0.58; 
        const profit = isWin ? Math.floor(bet * 0.006) : -Math.floor(bet * 0.005);
        
        totalProfit += profit;
        tradeCount++;
        if(profit > 0) winCount++;
        
        // 로그 데이터 (간결하게 묶음)
        logs.unshift({ 
            time: new Date().toLocaleTimeString('ko-KR', {hour12: false}), 
            type: isWin ? "롱" : "숏", 
            profit: profit 
        });
        if(logs.length > 20) logs.pop();

        // UI 갱신 (승률 및 자산)
        if(document.getElementById('win-rate')) 
            document.getElementById('win-rate').innerText = ((winCount/tradeCount)*100).toFixed(1) + "%";
        
        if(document.getElementById('live-asset')) 
            document.getElementById('live-asset').innerText = (bet + totalProfit).toLocaleString() + " KRW";

        // 매매일지 출력 (디자인 뻑나지 않게 3칸으로 고정)
        const logList = document.getElementById('log-list');
        if(logList) {
            logList.innerHTML = logs.map(l => `
                <tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:12px; color:#94a3b8; font-size:0.8rem; width:30%;">${l.time}</td>
                    <td style="padding:12px; font-weight:bold; width:30%;">AI ${l.type}</td>
                    <td style="padding:12px; text-align:right; color:${l.profit>0?'#10b981':'#ef4444'}; font-weight:bold; width:40%;">
                        ${l.profit > 0 ? '+' : ''}${l.profit.toLocaleString()}
                    </td>
                </tr>
            `).join('');
        }
        setTimeout(tradeLoop, 1500);
    };
    tradeLoop();
};

// [3] AI 중지
window.stopAi = function() {
    isRunning = false;
    if(wakeLock) { wakeLock.release(); wakeLock = null; }
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').style.background = '#3b82f6';
    document.getElementById('btn-start').style.opacity = '1';
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.background = '#334155';
    document.getElementById('btn-stop').style.opacity = '0.5';
    document.getElementById('bet-amount').disabled = false;
};

// [4] 추출 (엑셀 형식으로 간결하게 묶어 다운로드)
window.downloadPlusLog = function() {
    if(logs.length === 0) return alert("데이터가 없습니다.");
    let csv = "\uFEFF시간,포지션,수익금\n";
    logs.forEach(l => { csv += `${l.time},AI ${l.type},${l.profit}\n`; });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Mining_Log_${new Date().getTime()}.csv`;
    a.click();
};
