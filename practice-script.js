/* 개선된 가격 로딩 로직 */
async function fetchPriceLoop(coin) {
    const priceEl = document.getElementById('current-price');
    
    // 로딩 중 표시를 좀 더 역동적으로 변경
    if (!currentPrice && priceEl) priceEl.innerHTML = '<i class="fas fa-sync fa-spin"></i> 연결 중..';

    try {
        if (window.axios) {
            // 주소 뒤에 랜덤 숫자를 붙여 '캐시' 때문에 느려지는 현상 방지
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}&v=${Date.now()}`);
            
            if (res.data && res.data[0]) {
                currentPrice = res.data[0].trade_price;
                if (priceEl) {
                    priceEl.innerText = currentPrice.toLocaleString();
                    priceEl.style.color = "#fff"; // 로딩 완료 시 색상 복구
                }
            }
        }
    } catch (e) {
        console.log("가격 로딩 재시도...");
    }

    // [개선] 첫 로딩 전에는 0.5초마다 빠르게 시도, 로딩 후에는 1초 간격 유지
    const nextInterval = currentPrice === 0 ? 500 : 1000;
    setTimeout(() => fetchPriceLoop(coin), nextInterval);
}
