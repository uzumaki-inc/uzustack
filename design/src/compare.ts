/**
 * design variant の user review 用 HTML comparison board を生成。
 * `$B goto` で headed Chrome で開き、user が favorite を選び、評価し、
 * comment を書き、submit する。agent は hidden DOM element から feedback を読む。
 *
 * Design spec: 単一 column、full-width mockup、APP UI aesthetic。
 */

import fs from "fs";
import path from "path";

export interface CompareOptions {
  images: string[];
  output: string;
}

/**
 * comparison board の HTML page を生成。
 */
export function generateCompareHtml(images: string[]): string {
  const variantLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const variantCards = images.map((imgPath, i) => {
    const label = variantLabels[i] || `${i + 1}`;
    // self-contained HTML 化のため image を base64 data URI で埋め込む
    const imgData = fs.readFileSync(imgPath).toString("base64");
    const ext = path.extname(imgPath).slice(1) || "png";

    return `
    <div class="variant" data-variant="${label}">
      <div class="variant-header">
        <span class="variant-label">案 ${label}</span>
        <span class="variant-desc" id="variant-desc-${label}">方向 ${label}</span>
      </div>
      <img src="data:image/${ext};base64,${imgData}" alt="案 ${label}" />
      <div class="variant-controls">
        <label class="pick-label">
          <input type="radio" name="preferred" value="${label}" />
          <span class="pick-text">選択</span>
          <span class="pick-confirm" style="display:none;">案 ${label} で進めます</span>
        </label>
        <div class="stars" data-variant="${label}">
          ${[1,2,3,4,5].map(n => `<span class="star" data-value="${n}">★</span>`).join("")}
        </div>
        <input type="text" class="feedback-input" data-variant="${label}"
               placeholder="気に入った点・気になる点は？" />
        <button class="more-like-this" data-variant="${label}">これに近いものを生成</button>
      </div>
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Design 探索</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #fff;
    color: #333;
  }

  .header {
    padding: 16px 24px;
    border-bottom: 1px solid #e5e5e5;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header h1 { font-size: 16px; font-weight: 600; }
  .header .meta { font-size: 13px; color: #999; display: flex; align-items: center; gap: 12px; }

  .view-toggle {
    display: flex;
    gap: 2px;
    background: #f0f0f0;
    border-radius: 6px;
    padding: 2px;
  }
  .view-toggle button {
    padding: 4px 10px;
    border: none;
    background: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    color: #666;
    font-weight: 500;
  }
  .view-toggle button.active {
    background: #fff;
    color: #333;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }

  .variants { max-width: 1400px; margin: 0 auto; padding: 20px 24px; }
  .variants.grid-view {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .variants.grid-view .variant {
    border-bottom: none;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 20px;
  }
  .variants.grid-view .variant-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .variants.grid-view .variant-controls .pick-label {
    padding: 8px 0 4px;
  }
  .variants.grid-view .feedback-input { min-width: 0; width: 100%; }
  .variants.grid-view .more-like-this { align-self: flex-start; }
  .variants.grid-view .variant-header { margin-bottom: 12px; }

  .variant-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 12px;
  }
  .variant-label {
    font-size: 15px;
    font-weight: 700;
    color: #111;
    letter-spacing: -0.01em;
  }
  .variant-desc {
    font-size: 13px;
    color: #888;
  }

  .pick-confirm {
    font-size: 13px;
    color: #2a7d2a;
    font-weight: 500;
    margin-left: 4px;
  }

  .variant {
    border-bottom: 1px solid #e5e5e5;
    padding: 24px 0;
  }
  .variant:last-child { border-bottom: none; }

  .variant img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 4px;
  }

  .variant-controls {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 0 0;
    flex-wrap: wrap;
  }

  .pick-label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
  }
  .pick-label input[type="radio"] { accent-color: #000; }

  .stars { display: flex; gap: 2px; }
  .star {
    font-size: 20px;
    color: #ddd;
    cursor: pointer;
    user-select: none;
    transition: color 0.1s;
  }
  .star.filled { color: #000; }
  .star:hover { color: #666; }

  .feedback-input {
    flex: 1;
    min-width: 200px;
    padding: 6px 10px;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
  }
  .feedback-input:focus { border-color: #999; }
  .feedback-input::placeholder { color: #999; }

  .more-like-this {
    padding: 6px 12px;
    background: none;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    color: #666;
  }
  .more-like-this:hover { border-color: #999; color: #333; }

  .bottom-section {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px 24px 32px;
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 24px;
  }

  .submit-column {}
  .submit-column h3 {
    font-size: 15px;
    font-weight: 700;
    color: #111;
    margin-bottom: 4px;
  }
  .submit-column .direction-hint {
    font-size: 13px;
    color: #888;
    margin-bottom: 10px;
    line-height: 1.5;
  }
  .overall-textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    font-size: 13px;
    resize: vertical;
    min-height: 80px;
    outline: none;
    font-family: inherit;
    line-height: 1.5;
  }
  .overall-textarea:focus { border-color: #999; }
  .submit-status {
    font-size: 14px;
    font-weight: 600;
    color: #111;
    margin: 12px 0;
    min-height: 20px;
  }
  .submit-btn {
    padding: 10px 24px;
    background: #000;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
  }
  .submit-btn:hover { background: #333; }
  .submit-btn:disabled { background: #ccc; cursor: not-allowed; }

  .regen-column {
    background: #f7f7f7;
    border-radius: 8px;
    padding: 20px;
  }
  .regen-column h3 {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
  }
  .regen-controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 10px;
  }
  .regen-chiclet {
    padding: 6px 14px;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
  }
  .regen-chiclet:hover { border-color: #999; }
  .regen-chiclet.active { border-color: #000; background: #f0f0f0; }
  .regen-custom {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    font-size: 13px;
    outline: none;
    margin-bottom: 10px;
  }
  .regen-custom:focus { border-color: #999; }
  .regen-btn {
    padding: 8px 16px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
    width: 100%;
  }
  .regen-btn:hover { border-color: #000; }

  .success-msg {
    display: none;
    max-width: 1200px;
    margin: 24px auto;
    padding: 16px 24px;
    background: #f0f9f0;
    border: 1px solid #c3e6c3;
    border-radius: 4px;
    font-size: 14px;
    text-align: center;
  }

  /* agent polling 用の hidden 結果 element */
  #status, #feedback-result { display: none; }

  /* skeleton loading state */
  .skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    height: 400px;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>Design 探索</h1>
  <span class="meta">
    ${images.length} 案
    <span class="view-toggle">
      <button class="active" data-view="list">Large</button>
      <button data-view="grid">Grid</button>
    </span>
  </span>
</div>

<div class="variants">
  ${variantCards}
</div>

<div class="bottom-section">
  <div class="submit-column">
    <h3>全体方針</h3>
    <p class="direction-hint">例：「A の layout に C の fox icon」「もっと minimal に」「問題提起の文を大きく」</p>
    <textarea class="overall-textarea" id="overall-feedback"
              placeholder="element を組合せ、変更を request、または欲しい仕様を記述..."></textarea>
    <div class="submit-status" id="submit-status"></div>
    <button class="submit-btn" id="submit-btn">feedback を反映して進める →</button>
  </div>
  <div class="regen-column">
    <h3>もっと探索する？</h3>
    <div class="regen-controls">
      <button class="regen-chiclet" data-action="different">全く違うもの</button>
      <button class="regen-chiclet" data-action="match">design に合わせる</button>
    </div>
    <input type="text" class="regen-custom" id="regen-custom-input"
           placeholder="変更点を入力..." />
    <button class="regen-btn" id="regen-btn">再生成 →</button>
  </div>
</div>

<div class="success-msg" id="success-msg">
  feedback 送信完了。coding agent に戻る。
</div>

<!-- agent polling 用の hidden element -->
<div id="status"></div>
<div id="feedback-result"></div>

<script>
  // view toggle
  document.querySelectorAll('.view-toggle button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.view-toggle button').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var variants = document.querySelector('.variants');
      if (btn.dataset.view === 'grid') {
        variants.classList.add('grid-view');
      } else {
        variants.classList.remove('grid-view');
      }
    });
  });

  // pick confirmation
  document.querySelectorAll('input[name="preferred"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      // 確認表示を一旦全て非表示
      document.querySelectorAll('.pick-confirm').forEach(function(el) { el.style.display = 'none'; });
      document.querySelectorAll('.pick-text').forEach(function(el) { el.style.display = ''; });
      // 選択中のものに確認を表示
      var label = radio.closest('.pick-label');
      label.querySelector('.pick-text').style.display = 'none';
      label.querySelector('.pick-confirm').style.display = '';
      // submit status を更新
      document.getElementById('submit-status').textContent = "案 " + radio.value + " で進めます";
    });
  });

  // star rating
  document.querySelectorAll('.stars').forEach(starsEl => {
    const stars = starsEl.querySelectorAll('.star');
    let rating = 0;

    stars.forEach(star => {
      star.addEventListener('click', () => {
        rating = parseInt(star.dataset.value);
        stars.forEach(s => {
          s.classList.toggle('filled', parseInt(s.dataset.value) <= rating);
        });
      });
    });
  });

  // regenerate chiclet（active 切替）
  document.querySelectorAll('.regen-chiclet').forEach(chiclet => {
    chiclet.addEventListener('click', () => {
      document.querySelectorAll('.regen-chiclet').forEach(c => c.classList.remove('active'));
      chiclet.classList.add('active');
    });
  });

  // more like this button
  document.querySelectorAll('.more-like-this').forEach(btn => {
    btn.addEventListener('click', () => {
      const variant = btn.dataset.variant;
      // regeneration context を設定
      document.querySelectorAll('.regen-chiclet').forEach(c => c.classList.remove('active'));
      document.getElementById('regen-custom-input').value = '案 ' + variant + ' に近い';
      // regenerate を起動
      submitRegenerate('more_like_' + variant);
    });
  });

  // regenerate button
  document.getElementById('regen-btn').addEventListener('click', () => {
    const activeChiclet = document.querySelector('.regen-chiclet.active');
    const customInput = document.getElementById('regen-custom-input').value;
    const action = activeChiclet ? activeChiclet.dataset.action : 'custom';
    const detail = customInput || action;
    submitRegenerate(detail);
  });

  function postFeedback(feedback) {
    if (!window.__UZUSTACK_SERVER_URL) return Promise.resolve(null);
    return fetch(window.__UZUSTACK_SERVER_URL + '/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    }).then(function(r) { return r.json(); }).catch(function() { return null; });
  }

  function disableAllInputs() {
    document.querySelectorAll('input, button, textarea, .star, .regen-chiclet').forEach(function(el) {
      el.disabled = true;
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.5';
    });
  }

  function showPostSubmitState() {
    disableAllInputs();
    var _regenBar = document.querySelector('.regenerate-bar') || document.querySelector('.regen-column');
    if (_regenBar) _regenBar.style.display = 'none';
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('success-msg').style.display = 'block';
    document.getElementById('success-msg').innerHTML =
      'feedback を受信。coding agent に戻る。' +
      '<br><small style="color:#666;margin-top:8px;display:block;">さらに変更する？ <code>/design-shotgun</code> を再実行。</small>';
  }

  function showRegeneratingState() {
    disableAllInputs();
    document.querySelector('.variants').innerHTML =
      '<div style="text-align:center;padding:80px 24px;color:#666;">' +
      '<div style="font-size:24px;margin-bottom:12px;">新 design を生成中...</div>' +
      '<div class="skeleton" style="width:60px;height:60px;border-radius:50%;margin:0 auto;"></div>' +
      '</div>';
    var _regenBar = document.querySelector('.regenerate-bar') || document.querySelector('.regen-column');
    if (_regenBar) _regenBar.style.display = 'none';
    var _submitBar = document.querySelector('.submit-bar') || document.querySelector('.submit-column');
    if (_submitBar) _submitBar.style.display = 'none';
    var _overallSec = document.querySelector('.overall-section') || document.querySelector('.bottom-section');
    if (_overallSec) _overallSec.style.display = 'none';
    startProgressPolling();
  }

  function startProgressPolling() {
    if (!window.__UZUSTACK_SERVER_URL) return;
    var pollCount = 0;
    var maxPolls = 150; // 2s 間隔で 5 分
    var pollInterval = setInterval(function() {
      pollCount++;
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        document.querySelector('.variants').innerHTML =
          '<div style="text-align:center;padding:80px 24px;color:#666;">' +
          '<div style="font-size:18px;margin-bottom:8px;">問題が発生しました。</div>' +
          '<div>coding agent で <code>/design-shotgun</code> を再実行。</div>' +
          '</div>';
        return;
      }
      fetch(window.__UZUSTACK_SERVER_URL + '/api/progress')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.status === 'serving') {
            clearInterval(pollInterval);
            window.location.reload();
          }
        })
        .catch(function() {
          // server 終了、polling 停止
          clearInterval(pollInterval);
          document.querySelector('.variants').innerHTML =
            '<div style="text-align:center;padding:80px 24px;color:#666;">' +
            '<div style="font-size:18px;margin-bottom:8px;">接続切断。</div>' +
            '<div>coding agent で <code>/design-shotgun</code> を再実行。</div>' +
            '</div>';
        });
    }, 2000);
  }

  function showPostFailure(feedback) {
    disableAllInputs();
    var json = JSON.stringify(feedback, null, 2);
    document.getElementById('success-msg').style.display = 'block';
    document.getElementById('success-msg').innerHTML =
      '<div style="color:#c00;margin-bottom:8px;">接続切断。以下の feedback を copy して coding agent に paste:</div>' +
      '<pre style="text-align:left;background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px;overflow-x:auto;cursor:pointer;" onclick="navigator.clipboard.writeText(this.textContent)">' +
      json.replace(/</g, '&lt;') + '</pre>' +
      '<small style="color:#666;">click で copy</small>';
  }

  function submitRegenerate(detail) {
    var feedback = collectFeedback();
    feedback.regenerated = true;
    feedback.regenerateAction = detail;
    document.getElementById('feedback-result').textContent = JSON.stringify(feedback);
    document.getElementById('status').textContent = 'regenerate';
    postFeedback(feedback).then(function(result) {
      if (result && result.received) {
        showRegeneratingState();
      } else if (window.__UZUSTACK_SERVER_URL) {
        showPostFailure(feedback);
      }
    });
  }

  // submit button
  document.getElementById('submit-btn').addEventListener('click', function() {
    var feedback = collectFeedback();
    feedback.regenerated = false;
    document.getElementById('feedback-result').textContent = JSON.stringify(feedback);
    document.getElementById('status').textContent = 'submitted';
    postFeedback(feedback).then(function(result) {
      if (result && result.received) {
        showPostSubmitState();
      } else if (window.__UZUSTACK_SERVER_URL) {
        showPostFailure(feedback);
      } else {
        // DOM-only mode (legacy / test)
        document.getElementById('submit-btn').disabled = true;
        document.getElementById('success-msg').style.display = 'block';
      }
    });
  });

  function collectFeedback() {
    const preferred = document.querySelector('input[name="preferred"]:checked');
    const ratings = {};
    const comments = {};

    document.querySelectorAll('.variant').forEach(v => {
      const variant = v.dataset.variant;
      const stars = v.querySelectorAll('.star.filled');
      ratings[variant] = stars.length;
      const input = v.querySelector('.feedback-input');
      if (input && input.value) {
        comments[variant] = input.value;
      }
    });

    return {
      preferred: preferred ? preferred.value : null,
      ratings,
      comments,
      overall: document.getElementById('overall-feedback').value || null,
    };
  }
</script>

</body>
</html>`;
}

/**
 * Compare command：image file から comparison board HTML を生成。
 */
export function compare(options: CompareOptions): void {
  const html = generateCompareHtml(options.images);
  const outputDir = path.dirname(options.output);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(options.output, html);
  console.log(JSON.stringify({ outputPath: options.output, variants: options.images.length }));
}
