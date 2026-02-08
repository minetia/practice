<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AI QUANT PLUS</title>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Pretendard', sans-serif; }
        body { background-color: #020617; color: #fff; padding-top: 60px; padding-bottom: 80px; overflow-x: hidden; }
        
        /* 헤더 고정 */
        #header-placeholder { position: fixed; top: 0; width: 100%; height: 60px; z-index: 1000; background: #0f172a; border-bottom: 1px solid #334155; }
        
        /* [중요] 일체형 스크롤 컨테이너 */
        .main-container { display: flex; flex-direction: column; width: 100%; }

        /* 차트 영역: 가려지지 않게 위치 확보 */
        #tv_chart { width: 100%; height: 320px; background: #000; margin-bottom: 10px; z-index: 1; }

        /* 정보 박스 */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #1e293b; margin: 10px; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b; }
        .info-item { background: #0f172a; padding: 15px; text-align: center; }
        .info-label { font-size: 0.75rem; color: #64748b; margin-bottom: 5px; }
        .info-val { font-size: 1.1rem; font-weight: bold; }

        /* 자산 정보 */
        .asset-box { background: #0f172a; margin: 0 10px 10px; padding: 15px; border-radius: 12px; border: 1px solid #1e293b; }
        .asset-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }

        /* 버튼 */
        .btn-group { display: flex; gap: 10px; padding: 0 10px 15px; }
        .btn { flex: 1; padding: 15px; border-radius: 8px; border: none; font-weight: bold; font-size: 1rem; color: #fff; }

        /* 리스트 */
        .log-container { padding: 0 10px; }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 10px; font-size: 0.75rem; color: #64748b; border-bottom: 1px solid #334155; text-align: left; }
        td { padding: 12px 10px; font-size: 0.85rem; border-bottom: 1px solid #1e293b; }

        /* 네비게이션 고정 */
        #nav-placeholder { position: fixed; bottom: 0; width: 100%; height: 70px; z-index: 1000; background: #0f172a; border-top: 1px solid #334155; }
    </style>
</head>
<body>
    <div id="header-placeholder"></div>

    <div class="main-container">
        <div id="tv_chart"></div>

        <div class="info-grid">
            <div class="info-item"><div class="info-label">현재 코인</div><div class="info-val" id="coin-name">BTC</div></div>
            <div class="info-item"><div class="info-label">현재 가격</div><div class="info-val" id="current-price">로딩 중..</div></div>
            <div class="info-item"><div class="info-label">수집 데이터</div><div class="info-val" id="data-count" style="color:#3b82f6;">0건</div></div>
            <div class="info-item"><div class="info-label">AI 승률</div><div class="info-val" id="win-rate" style="color:#f59e0b;">0.0%</div></div>
        </div>

        <div class="asset-box">
            <div class="asset-row"><span>운용 자금</span><input type="text" id="bet-amount" value="50,000,000" style="background:transparent; border:none; color:#fff; text-align:right; font-weight:bold; width:120px; outline:none;"></div>
            <div style="height:1px; background:#1e293b; margin:10px 0;"></div>
            <div class="asset-row"><span>평가 자산</span><span id="live-asset" style="color:#3b82f6; font-weight:bold;">50,000,000 KRW</span></div>
        </div>

        <div class="btn-group">
            <button onclick="startAi()" id="btn-start" class="btn" style="background:#3b82f6;">AI 시작</button>
            <button onclick="stopAi()" id="btn-stop" class="btn" style="background:#334155;" disabled>중지</button>
        </div>

        <div class="log-container">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="font-size:0.9rem; font-weight:bold;">매매 로그</span>
                <button onclick="downloadPlusLog()" style="background:none; border:none; color:#64748b; font-size:0.75rem;">[데이터 추출]</button>
            </div>
            <table>
                <thead><tr><th>시간</th><th>포지션</th><th>체결가</th><th style="text-align:right;">결과</th></tr></thead>
                <tbody id="log-list"></tbody>
            </table>
        </div>
    </div>

    <div id="nav-placeholder"></div>
    <script src="practice-script.js"></script>
</body>
</html>
