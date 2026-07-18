/* =========================================================
 * charts.js — 可視化（Canvas / SVG）
 * 五行レーダー・運勢曲線・ライフチャート・命式関係図
 * 外部ライブラリ不使用。
 * ========================================================= */
(function (global) {
  'use strict';
  var Data = global.Data || null;

  var ELEM_COLORS = ['#2e8b57', '#d2544a', '#b8860b', '#8a8a8a', '#3a6ea5']; // 木火土金水

  function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  /* ---------- 五行レーダーチャート ---------- */
  function drawGogyoRadar(canvas, scores) {
    var c = setupCanvas(canvas), ctx = c.ctx;
    var cx = c.w / 2, cy = c.h / 2 + 6, R = Math.min(c.w, c.h) / 2 - 30;
    var max = Math.max(4, Math.max.apply(null, scores));
    ctx.clearRect(0, 0, c.w, c.h);
    var labels = ['木', '火', '土', '金', '水'];

    // グリッド
    ctx.strokeStyle = '#d5c4cf'; ctx.fillStyle = '#faf4f7';
    for (var ring = 4; ring >= 1; ring--) {
      ctx.beginPath();
      for (var i = 0; i <= 5; i++) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / 5;
        var r = R * ring / 4;
        var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      if (ring === 4) ctx.fill();
      ctx.stroke();
    }
    // 軸
    for (var i2 = 0; i2 < 5; i2++) {
      var a2 = -Math.PI / 2 + i2 * 2 * Math.PI / 5;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(a2), cy + R * Math.sin(a2));
      ctx.stroke();
      // ラベル
      ctx.fillStyle = ELEM_COLORS[i2];
      ctx.font = 'bold 14px "Hiragino Mincho ProN","Yu Mincho",serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(labels[i2] + ' ' + scores[i2].toFixed(1),
        cx + (R + 18) * Math.cos(a2), cy + (R + 18) * Math.sin(a2));
    }
    // データ
    ctx.beginPath();
    for (var j = 0; j <= 5; j++) {
      var k = j % 5;
      var a3 = -Math.PI / 2 + k * 2 * Math.PI / 5;
      var r3 = R * Math.min(1, scores[k] / max);
      var x3 = cx + r3 * Math.cos(a3), y3 = cy + r3 * Math.sin(a3);
      if (j === 0) ctx.moveTo(x3, y3); else ctx.lineTo(x3, y3);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(93, 58, 110, 0.22)';
    ctx.strokeStyle = '#5d3a6e'; ctx.lineWidth = 2;
    ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1;
  }

  /* ---------- 運勢曲線（大運・年運） ---------- */
  function drawFortuneCurve(canvas, points, opts) {
    // points: [{label, score}] score -5..+5
    var o = opts || {};
    var c = setupCanvas(canvas), ctx = c.ctx;
    var padL = 34, padR = 12, padT = 14, padB = 34;
    var W = c.w - padL - padR, H = c.h - padT - padB;
    ctx.clearRect(0, 0, c.w, c.h);
    if (!points.length) return;

    function xAt(i) { return padL + W * (points.length === 1 ? 0.5 : i / (points.length - 1)); }
    function yAt(s) { return padT + H * (1 - (s + 5) / 10); }

    // 背景帯（吉/凶）
    ctx.fillStyle = 'rgba(46,139,87,0.07)';
    ctx.fillRect(padL, padT, W, H / 2);
    ctx.fillStyle = 'rgba(210,84,74,0.07)';
    ctx.fillRect(padL, padT + H / 2, W, H / 2);
    // ゼロ線・目盛
    ctx.strokeStyle = '#b8a5b3';
    ctx.beginPath(); ctx.moveTo(padL, yAt(0)); ctx.lineTo(padL + W, yAt(0)); ctx.stroke();
    ctx.fillStyle = '#71627a'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    [-4, -2, 0, 2, 4].forEach(function (s) { ctx.fillText(String(s), padL - 4, yAt(s) + 3); });

    // 折れ線（滑らかに）
    ctx.beginPath();
    for (var i = 0; i < points.length; i++) {
      var x = xAt(i), y = yAt(points[i].score);
      if (i === 0) ctx.moveTo(x, y);
      else {
        var px = xAt(i - 1), py = yAt(points[i - 1].score);
        var mx = (px + x) / 2;
        ctx.bezierCurveTo(mx, py, mx, y, x, y);
      }
    }
    ctx.strokeStyle = '#5d3a6e'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;

    // 点とラベル
    var step = Math.max(1, Math.ceil(points.length / (o.maxLabels || 12)));
    for (var j = 0; j < points.length; j++) {
      var xj = xAt(j), yj = yAt(points[j].score);
      ctx.beginPath(); ctx.arc(xj, yj, 3, 0, Math.PI * 2);
      ctx.fillStyle = points[j].score >= 0 ? '#2e8b57' : '#d2544a';
      ctx.fill();
      if (j % step === 0) {
        ctx.fillStyle = '#403548'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(points[j].label, xj, c.h - padB + 14);
      }
    }
  }

  /* ---------- ライフチャート（0〜100歳） ---------- */
  function drawLifeChart(canvas, lifePoints, currentAge) {
    var pts = lifePoints.filter(function (p, i) { return i % 2 === 0; }) // 2歳刻みで軽量化
      .map(function (p) { return { label: p.age % 10 === 0 ? p.age + '歳' : '', score: p.score }; });
    drawFortuneCurve(canvas, pts, { maxLabels: 11 });
    // 現在年齢マーカー
    if (currentAge != null && currentAge >= 0 && currentAge <= 100) {
      var c = canvas.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.width / dpr;
      var padL = 34, padR = 12;
      var x = padL + (w - padL - padR) * (currentAge / 100);
      c.save();
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.strokeStyle = 'rgba(58,110,165,0.8)';
      c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(x, 8); c.lineTo(x, canvas.height / dpr - 30); c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#3a6ea5'; c.font = '10px sans-serif'; c.textAlign = 'center';
      c.fillText('現在', x, 8);
      c.restore();
    }
  }

  /* ---------- 命式関係図（SVG） ----------
   * 四柱を並べ、干合・支合・冲・刑・害・三合を線で結ぶ */
  function renderRelationSVG(container, m) {
    var keys = ['hour', 'day', 'month', 'year'].filter(function (k) { return m.pillars[k]; });
    var names = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
    var W = 560, colW = W / keys.length;
    var H = 300;
    var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var svg = [];
    svg.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:640px;font-family:\'Hiragino Mincho ProN\',\'Yu Mincho\',serif">');

    var pos = {};
    keys.forEach(function (k, i) {
      var cx = colW * i + colW / 2;
      pos[k] = { stemX: cx, stemY: 84, branchX: cx, branchY: 176 };
      var p = m.pillars[k];
      svg.push('<text x="' + cx + '" y="34" text-anchor="middle" font-size="14" fill="#71627a">' + names[k] + '</text>');
      // 天干
      svg.push('<circle cx="' + cx + '" cy="84" r="26" fill="#fffdfe" stroke="#5d3a6e"/>');
      svg.push('<text x="' + cx + '" y="90" text-anchor="middle" font-size="22" fill="#362b3a">' + Data.STEMS[p.stem] + '</text>');
      // 地支
      svg.push('<circle cx="' + cx + '" cy="176" r="26" fill="#f7ecf2" stroke="#c9748f"/>');
      svg.push('<text x="' + cx + '" y="182" text-anchor="middle" font-size="22" fill="#362b3a">' + Data.BRANCHES[p.branch] + '</text>');
      // 蔵干
      var zk = (m.zokan[k] || []).map(function (z) { return Data.STEMS[z]; }).join('');
      svg.push('<text x="' + cx + '" y="222" text-anchor="middle" font-size="12" fill="#71627a">蔵干 ' + esc(zk) + '</text>');
    });

    var relColor = { '干合': '#3a6ea5', '支合': '#2e8b57', '冲': '#d2544a', '刑': '#c07c2a', '害': '#9a7bb0', '破': '#888' };
    var used = {};
    m.gochu.forEach(function (r) {
      if (!r.a || !r.b || !pos[r.a] || !pos[r.b]) return;
      var isStem = r.type === '干合';
      var y1 = isStem ? pos[r.a].stemY : pos[r.a].branchY;
      var y2 = isStem ? pos[r.b].stemY : pos[r.b].branchY;
      var x1 = pos[r.a].stemX, x2 = pos[r.b].stemX;
      // 弧の高さを重なりで変える
      var key = r.type + Math.min(x1, x2);
      used[key] = (used[key] || 0) + 1;
      var lift = (isStem ? -1 : 1) * (34 + used[key] * 12 + Math.abs(x2 - x1) * 0.06);
      var midX = (x1 + x2) / 2, midY = (isStem ? y1 - 26 : y1 + 26) + lift;
      var col = relColor[r.type] || '#666';
      svg.push('<path d="M ' + x1 + ' ' + (isStem ? y1 - 26 : y1 + 26) + ' Q ' + midX + ' ' + midY + ' ' + x2 + ' ' + (isStem ? y2 - 26 : y2 + 26) + '" fill="none" stroke="' + col + '" stroke-width="1.6"/>');
      svg.push('<text x="' + midX + '" y="' + (midY + (isStem ? 10 : 2)) + '" text-anchor="middle" font-size="11" fill="' + col + '">' + r.type + '</text>');
    });

    // 柱をまたがない関係（三合等）は下部に注記
    var wide = m.gochu.filter(function (r) { return !r.a; });
    wide.forEach(function (r, i) {
      svg.push('<text x="' + (W / 2) + '" y="' + (256 + i * 16) + '" text-anchor="middle" font-size="12" fill="#7d5694">◎ ' + r.type + '：' + esc(r.detail) + '</text>');
    });

    svg.push('</svg>');
    container.innerHTML = svg.join('');
  }

  /* ---------- 日運カレンダー（HTML描画補助） ---------- */
  function renderCalendar(container, days, year, month) {
    var html = ['<table class="cal"><thead><tr>'];
    ['日', '月', '火', '水', '木', '金', '土'].forEach(function (w, i) {
      html.push('<th class="' + (i === 0 ? 'sun' : i === 6 ? 'sat' : '') + '">' + w + '</th>');
    });
    html.push('</tr></thead><tbody><tr>');
    var first = days[0].weekday;
    for (var i = 0; i < first; i++) html.push('<td class="empty"></td>');
    days.forEach(function (d) {
      if (d.weekday === 0 && d.d !== 1) html.push('</tr><tr>');
      var cls = d.score >= 2 ? 'best' : d.score >= 1 ? 'good' : d.score <= -2 ? 'bad' : '';
      html.push('<td class="' + cls + (d.weekday === 0 ? ' sun' : d.weekday === 6 ? ' sat' : '') + '">' +
        '<div class="d">' + d.d + '</div>' +
        '<div class="kanshi">' + d.name + '</div>' +
        '<div class="mark">' + (d.kubo ? '空' : '') + (d.score >= 2 ? '◎' : d.score >= 1 ? '○' : d.score <= -2 ? '▲' : '') + '</div></td>');
    });
    html.push('</tr></tbody></table>');
    container.innerHTML = html.join('');
  }

  global.Charts = {
    drawGogyoRadar: drawGogyoRadar,
    drawFortuneCurve: drawFortuneCurve,
    drawLifeChart: drawLifeChart,
    renderRelationSVG: renderRelationSVG,
    renderCalendar: renderCalendar,
    ELEM_COLORS: ELEM_COLORS
  };
})(typeof window !== 'undefined' ? window : globalThis);
