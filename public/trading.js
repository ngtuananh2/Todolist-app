// ==================== TRADING.JS ====================
(function () {
  'use strict';

  const API = '/api/trading';
  let allTrades = [];
  let stats = null;
  let currentRating = 0;
  let deleteTradeId = null;
  let currentScreenshot = ''; // base64 screenshot data

  // ===== DOM Ready =====
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setupTheme();
    setupDate();
    setupTabs();
    setupModals();
    setupFilters();
    setupRating();
    setupRiskCalc();
    setupEquityCurve();
    await Promise.all([loadTrades(), loadStats()]);
    renderDashboard();
    renderTradesTable();
    checkTradeAlerts();
  }

  // ===== TRADE ALERTS =====
  function checkTradeAlerts() {
    const alertsEl = document.getElementById('trade-alerts');
    if (!alertsEl) return;

    const alerts = [];
    const now = new Date();
    const openTrades = allTrades.filter(t => t.status === 'open');

    openTrades.forEach(t => {
      // Alert: trade open for more than 7 days
      if (t.entryDate) {
        const entryDate = new Date(t.entryDate);
        const daysOpen = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
        if (daysOpen >= 7) {
          alerts.push({ type: 'warning', icon: '⏰', text: `<strong>${escapeHtml(t.symbol)}</strong> đã mở ${daysOpen} ngày — Xem xét đóng lệnh?`, tradeId: t.id });
        }
      }

      // Alert: no stop loss set
      if (!t.stopLoss) {
        alerts.push({ type: 'danger', icon: '🚨', text: `<strong>${escapeHtml(t.symbol)}</strong> chưa đặt Stop Loss!`, tradeId: t.id });
      }

      // Alert: no take profit set
      if (!t.takeProfit) {
        alerts.push({ type: 'info', icon: '💡', text: `<strong>${escapeHtml(t.symbol)}</strong> chưa đặt Take Profit`, tradeId: t.id });
      }

      // Alert: large position (leverage > 10x)
      if (t.leverage && t.leverage > 10) {
        alerts.push({ type: 'danger', icon: '⚠️', text: `<strong>${escapeHtml(t.symbol)}</strong> sử dụng đòn bẩy cao (${t.leverage}x) — Quản lý rủi ro cẩn thận!`, tradeId: t.id });
      }
    });

    // Alert: losing streak (3+ consecutive losses)
    const closedRecent = allTrades.filter(t => t.status === 'closed').slice(0, 5);
    let loseStreak = 0;
    for (const t of closedRecent) {
      if (t.pnl < 0) loseStreak++;
      else break;
    }
    if (loseStreak >= 3) {
      alerts.push({ type: 'danger', icon: '🔴', text: `Chuỗi thua: ${loseStreak} lệnh liên tiếp — Nên tạm dừng và xem lại chiến lược!` });
    }

    // Alert: winning streak (5+)
    let winStreak = 0;
    for (const t of closedRecent) {
      if (t.pnl > 0) winStreak++;
      else break;
    }
    if (winStreak >= 5) {
      alerts.push({ type: 'success', icon: '🔥', text: `Chuỗi thắng: ${winStreak} lệnh! Giữ kỷ luật, đừng quá tự tin.` });
    }

    if (alerts.length === 0) {
      alertsEl.style.display = 'none';
      return;
    }

    alertsEl.style.display = '';
    alertsEl.innerHTML = `
      <div class="ta-header">
        <span>🔔 Cảnh báo giao dịch (${alerts.length})</span>
        <button class="ta-dismiss" onclick="this.parentElement.parentElement.style.display='none'" title="Ẩn">✕</button>
      </div>
      ${alerts.map(a => `
        <div class="ta-item ta-${a.type}">
          <span class="ta-icon">${a.icon}</span>
          <span class="ta-text">${a.text}</span>
          ${a.tradeId ? `<button class="ta-action" onclick="document.querySelector('[data-tab=trades]').click();setTimeout(()=>document.getElementById('trade-${a.tradeId}')?.scrollIntoView({behavior:'smooth'}),200)">Xem →</button>` : ''}
        </div>
      `).join('')}
    `;

  // Theme is handled by global-utils.js
  function setupTheme() { /* handled by global-utils.js */ }

  // ===== Date =====
  function setupDate() {
    const el = document.getElementById('nav-date');
    if (el) {
      const d = new Date();
      el.textContent = d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
    }
  }

  // ===== Tabs =====
  function setupTabs() {
    document.querySelectorAll('.trading-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.trading-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        document.getElementById(`tab-${target}`)?.classList.add('active');
        if (target === 'journal') renderJournal();
        if (target === 'analytics') renderAnalytics();
        if (target === 'tools') renderEquityCurve();
      });
    });
  }

  // ===== Modals =====
  function setupModals() {
    // New trade buttons
    document.getElementById('btn-new-trade')?.addEventListener('click', () => openTradeModal());
    document.getElementById('btn-new-trade-empty')?.addEventListener('click', () => openTradeModal());

    // Trade form
    document.getElementById('trade-form')?.addEventListener('submit', handleTradeSubmit);
    document.getElementById('btn-cancel-trade')?.addEventListener('click', closeTradeModal);
    document.getElementById('modal-close')?.addEventListener('click', closeTradeModal);

    // Close trade form
    document.getElementById('close-form')?.addEventListener('submit', handleCloseTrade);
    document.getElementById('btn-cancel-close')?.addEventListener('click', () => hideModal('close-modal'));
    document.getElementById('close-modal-close')?.addEventListener('click', () => hideModal('close-modal'));

    // Delete confirm
    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => hideModal('delete-modal'));
    document.getElementById('delete-modal-close')?.addEventListener('click', () => hideModal('delete-modal'));
    document.getElementById('btn-confirm-delete')?.addEventListener('click', handleDeleteTrade);

    // Click overlay to close
    ['trade-modal', 'close-modal', 'delete-modal'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        if (e.target === e.currentTarget) hideModal(id);
      });
    });

    // Screenshot upload
    document.getElementById('btn-upload-screenshot')?.addEventListener('click', () => {
      document.getElementById('trade-screenshot-input')?.click();
    });
    document.getElementById('trade-screenshot-input')?.addEventListener('change', handleScreenshotUpload);
    document.getElementById('btn-remove-screenshot')?.addEventListener('click', removeScreenshot);
  }

  // ===== Filters =====
  function setupFilters() {
    const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    document.getElementById('filter-search')?.addEventListener('input', debounce(() => loadTrades()));
    ['filter-status', 'filter-market', 'filter-strategy', 'filter-start-date', 'filter-end-date'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => loadTrades());
    });
    document.getElementById('btn-journal-refresh')?.addEventListener('click', renderJournal);
  }

  // ===== Rating =====
  function setupRating() {
    document.querySelectorAll('#trade-rating .star').forEach(star => {
      star.addEventListener('click', () => {
        currentRating = parseInt(star.dataset.val);
        updateRatingDisplay();
      });
    });
  }

  function updateRatingDisplay() {
    document.querySelectorAll('#trade-rating .star').forEach(star => {
      star.classList.toggle('active', parseInt(star.dataset.val) <= currentRating);
    });
  }

  // ===== API =====
  async function loadTrades() {
    const params = new URLSearchParams();
    const search = document.getElementById('filter-search')?.value;
    const status = document.getElementById('filter-status')?.value;
    const market = document.getElementById('filter-market')?.value;
    const strategy = document.getElementById('filter-strategy')?.value;
    const startDate = document.getElementById('filter-start-date')?.value;
    const endDate = document.getElementById('filter-end-date')?.value;

    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (market) params.set('market', market);
    if (strategy) params.set('strategy', strategy);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    try {
      const res = await fetch(`${API}?${params}`);
      allTrades = await res.json();
      renderTradesTable();
    } catch (e) {
      toast('Lỗi tải dữ liệu giao dịch', 'error');
    }
  }
  window.loadTrades = loadTrades;

  async function loadStats() {
    try {
      const res = await fetch(`${API}/stats`);
      stats = await res.json();
      renderDashboard();
      loadStrategyFilter();
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  }
  window.loadStats = loadStats;

  function loadStrategyFilter() {
    const sel = document.getElementById('filter-strategy');
    if (!sel || !stats) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Tất cả chiến lược</option>';
    Object.keys(stats.byStrategy || {}).forEach(name => {
      sel.innerHTML += `<option value="${escapeHtml(name)}" ${name === current ? 'selected' : ''}>${escapeHtml(name)}</option>`;
    });

    // Also populate strategy datalist
    const dl = document.getElementById('strategy-list');
    if (dl) {
      dl.innerHTML = '';
      Object.keys(stats.byStrategy || {}).forEach(name => {
        dl.innerHTML += `<option value="${escapeHtml(name)}">`;
      });
    }
  }

  // ===== Dashboard =====
  function renderDashboard() {
    if (!stats) return;
    const o = stats.overview;

    setText('kpi-total', o.total);
    setText('kpi-pnl', formatMoney(o.totalPnl), o.totalPnl >= 0 ? 'positive' : 'negative');
    setText('kpi-winrate', `${o.winRate}%`);
    setText('kpi-pf', o.profitFactor === Infinity ? '∞' : o.profitFactor);
    setText('kpi-open', o.open);
    setText('kpi-dd', formatMoney(-o.maxDrawdown), 'negative');

    renderDailyPnlChart();
    renderWinLossChart();
    renderOpenPositions();
    renderRecentTrades();
  }

  function renderDailyPnlChart() {
    const container = document.getElementById('chart-daily-pnl');
    if (!container || !stats) return;

    const daily = stats.dailyPnl || {};
    const entries = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);

    if (entries.length === 0) {
      container.innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
      return;
    }

    const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)), 1);
    let html = '<div class="bar-chart">';
    entries.forEach(([day, pnl]) => {
      const pct = Math.abs(pnl) / maxAbs * 100;
      const cls = pnl >= 0 ? 'positive' : 'negative';
      html += `<div class="bar-chart-bar ${cls}" style="height: ${Math.max(pct, 3)}%">
        <span class="bar-tooltip">${day.slice(5)}: ${formatMoney(pnl)}</span>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function renderWinLossChart() {
    const container = document.getElementById('chart-winloss');
    if (!container || !stats) return;
    const o = stats.overview;

    if (o.closed === 0) {
      container.innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
      return;
    }

    const winPct = o.closed > 0 ? (o.wins / o.closed * 100) : 0;
    const lossPct = o.closed > 0 ? (o.losses / o.closed * 100) : 0;
    const bePct = 100 - winPct - lossPct;

    container.innerHTML = `
      <div class="donut-chart" style="background: conic-gradient(var(--green) 0% ${winPct}%, var(--red) ${winPct}% ${winPct + lossPct}%, var(--text-muted) ${winPct + lossPct}% 100%)">
        <div class="donut-center">${Math.round(winPct)}%</div>
      </div>
      <div class="donut-legend">
        <div class="donut-legend-item"><span class="donut-legend-dot" style="background:var(--green)"></span> Win: ${o.wins}</div>
        <div class="donut-legend-item"><span class="donut-legend-dot" style="background:var(--red)"></span> Loss: ${o.losses}</div>
        <div class="donut-legend-item"><span class="donut-legend-dot" style="background:var(--text-muted)"></span> BE: ${o.breakeven}</div>
      </div>`;
  }

  function renderOpenPositions() {
    const container = document.getElementById('open-positions');
    if (!container) return;

    const open = allTrades.filter(t => t.status === 'open');
    if (open.length === 0) {
      container.innerHTML = '<p class="empty-text">Không có vị thế nào đang mở</p>';
      return;
    }

    container.innerHTML = open.map(t => `
      <div class="position-item">
        <span class="position-symbol">${escapeHtml(t.symbol)}</span>
        <span class="position-type ${t.type}">${t.type.toUpperCase()}</span>
        <span class="position-detail">Entry: ${formatNum(t.entryPrice)} | Qty: ${formatNum(t.quantity)}${t.leverage > 1 ? ` | ${t.leverage}x` : ''}</span>
        <span class="position-detail">SL: ${t.stopLoss ? formatNum(t.stopLoss) : '—'} | TP: ${t.takeProfit ? formatNum(t.takeProfit) : '—'}</span>
        <div class="position-actions">
          <button class="btn btn-sm btn-primary" onclick="openCloseModal('${t.id}')">Đóng lệnh</button>
          <button class="btn-icon" onclick="openTradeModal('${t.id}')" title="Sửa">✏️</button>
        </div>
      </div>
    `).join('');
  }

  function renderRecentTrades() {
    const container = document.getElementById('recent-trades');
    if (!container) return;

    const closed = allTrades.filter(t => t.status === 'closed').slice(0, 8);
    if (closed.length === 0) {
      container.innerHTML = '<p class="empty-text">Chưa có giao dịch đã đóng</p>';
      return;
    }

    container.innerHTML = closed.map(t => `
      <div class="trade-mini-item">
        <span class="trade-type-badge ${t.type}">${t.type.toUpperCase()}</span>
        <strong>${escapeHtml(t.symbol)}</strong>
        <span style="color:var(--text-secondary);font-size:0.78rem">${formatDate(t.exitDate || t.entryDate)}</span>
        <span class="trade-pnl ${t.pnl >= 0 ? 'positive' : 'negative'}">${formatMoney(t.pnl)} (${t.pnlPercent > 0 ? '+' : ''}${t.pnlPercent}%)</span>
      </div>
    `).join('');
  }

  // ===== Trades Table =====
  function renderTradesTable() {
    const tbody = document.getElementById('trades-tbody');
    const empty = document.getElementById('trades-empty');
    const tableWrap = document.querySelector('.trades-table-wrap');
    if (!tbody) return;

    if (allTrades.length === 0) {
      if (tableWrap) tableWrap.style.display = 'none';
      if (empty) empty.style.display = '';
      return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = allTrades.map(t => `
      <tr>
        <td>${formatDate(t.entryDate)}</td>
        <td><strong>${escapeHtml(t.symbol)}</strong></td>
        <td><span class="trade-type-badge ${t.type}">${t.type.toUpperCase()}</span></td>
        <td>${formatNum(t.entryPrice)}</td>
        <td>${t.exitPrice ? formatNum(t.exitPrice) : '—'}</td>
        <td>
          <span style="color:var(--red);font-size:0.78rem">${t.stopLoss ? formatNum(t.stopLoss) : '—'}</span> /
          <span style="color:var(--green);font-size:0.78rem">${t.takeProfit ? formatNum(t.takeProfit) : '—'}</span>
        </td>
        <td>${formatNum(t.quantity)}${t.leverage > 1 ? ` <small>(${t.leverage}x)</small>` : ''}</td>
        <td class="trade-pnl ${t.pnl > 0 ? 'positive' : t.pnl < 0 ? 'negative' : ''}">${t.status === 'closed' ? formatMoney(t.pnl) : '—'}</td>
        <td class="trade-pnl ${t.pnlPercent > 0 ? 'positive' : t.pnlPercent < 0 ? 'negative' : ''}">${t.status === 'closed' ? `${t.pnlPercent > 0 ? '+' : ''}${t.pnlPercent}%` : '—'}</td>
        <td><span class="trade-status-badge ${t.status}">${statusLabel(t.status)}</span></td>
        <td>
          <div style="display:flex;gap:4px">
            ${t.status === 'open' ? `<button class="btn btn-sm btn-primary" onclick="openCloseModal('${t.id}')">Đóng</button>` : ''}
            <button class="btn-icon" onclick="openTradeModal('${t.id}')" title="Sửa">✏️</button>
            <button class="btn-icon" onclick="confirmDelete('${t.id}','${escapeHtml(t.symbol)}')" title="Xóa">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ===== Analytics =====
  function renderAnalytics() {
    if (!stats) return;
    renderPerfGrid();
    renderMonthlyPnl();
    renderAnalyticsList('analytics-by-symbol', stats.bySymbol);
    renderAnalyticsList('analytics-by-strategy', stats.byStrategy);
    renderAnalyticsList('analytics-by-market', stats.byMarket);
    renderEmotionAnalytics();
  }

  function renderPerfGrid() {
    const container = document.getElementById('perf-grid');
    if (!container || !stats) return;
    const o = stats.overview;

    const items = [
      { label: 'Tổng lệnh', value: o.total },
      { label: 'Lệnh thắng', value: o.wins, cls: 'positive' },
      { label: 'Lệnh thua', value: o.losses, cls: 'negative' },
      { label: 'Win Rate', value: `${o.winRate}%` },
      { label: 'Tổng P&L', value: formatMoney(o.totalPnl), cls: o.totalPnl >= 0 ? 'positive' : 'negative' },
      { label: 'P&L ròng', value: formatMoney(o.netPnl), cls: o.netPnl >= 0 ? 'positive' : 'negative' },
      { label: 'Tổng phí', value: formatMoney(o.totalFees), cls: 'negative' },
      { label: 'Profit Factor', value: o.profitFactor === Infinity ? '∞' : o.profitFactor },
      { label: 'Expectancy', value: formatMoney(o.expectancy), cls: o.expectancy >= 0 ? 'positive' : 'negative' },
      { label: 'Avg Win', value: formatMoney(o.avgWin), cls: 'positive' },
      { label: 'Avg Loss', value: formatMoney(o.avgLoss), cls: 'negative' },
      { label: 'Largest Win', value: formatMoney(o.largestWin), cls: 'positive' },
      { label: 'Largest Loss', value: formatMoney(o.largestLoss), cls: 'negative' },
      { label: 'Max Win Streak', value: o.maxWinStreak },
      { label: 'Max Loss Streak', value: o.maxLossStreak },
      { label: 'Max Drawdown', value: formatMoney(-o.maxDrawdown), cls: 'negative' },
      { label: 'Avg Hold Time', value: formatDuration(o.avgHoldTimeMs) },
      { label: 'Open Value', value: formatMoney(o.openPositionsValue) },
    ];

    container.innerHTML = items.map(i => `
      <div class="perf-item">
        <div class="perf-item-label">${i.label}</div>
        <div class="perf-item-value ${i.cls || ''}">${i.value}</div>
      </div>
    `).join('');
  }

  function renderMonthlyPnl() {
    const container = document.getElementById('monthly-pnl');
    if (!container || !stats) return;

    const monthly = stats.monthlyPnl || {};
    const months = Object.keys(monthly).sort().reverse();

    if (months.length === 0) {
      container.innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
      return;
    }

    let html = `<table class="monthly-pnl-table">
      <thead><tr><th>Tháng</th><th>P&L</th><th>Lệnh</th><th>Win Rate</th></tr></thead><tbody>`;
    months.forEach(m => {
      const d = monthly[m];
      const wr = d.trades > 0 ? Math.round(d.wins / d.trades * 100) : 0;
      html += `<tr>
        <td>${m}</td>
        <td class="${d.pnl >= 0 ? 'positive' : 'negative'}">${formatMoney(d.pnl)}</td>
        <td>${d.trades}</td>
        <td>${wr}%</td>
      </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderAnalyticsList(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container || !data) return;

    const entries = Object.entries(data).sort((a, b) => b[1].pnl - a[1].pnl);
    if (entries.length === 0) {
      container.innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
      return;
    }

    container.innerHTML = entries.map(([name, d]) => {
      const wr = d.total > 0 ? Math.round((d.wins || 0) / d.total * 100) : 0;
      return `<div class="analytics-row">
        <span class="analytics-row-name">${escapeHtml(name)}</span>
        <div class="analytics-row-stats">
          <span class="analytics-row-stat">${d.total} lệnh</span>
          <span class="analytics-row-stat">WR: ${wr}%</span>
          <span class="analytics-row-pnl ${d.pnl >= 0 ? 'positive' : 'negative'}">${formatMoney(d.pnl)}</span>
        </div>
      </div>`;
    }).join('');
  }

  function renderEmotionAnalytics() {
    const container = document.getElementById('analytics-by-emotion');
    if (!container || !stats) return;

    const emotionLabels = {
      confident: '😎 Tự tin', neutral: '😐 Bình thường', fearful: '😰 Sợ hãi',
      greedy: '🤑 Tham lam', fomo: '😤 FOMO', revenge: '😡 Trả thù'
    };

    const entries = Object.entries(stats.byEmotion || {});
    if (entries.length === 0) {
      container.innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
      return;
    }

    container.innerHTML = entries.map(([emotion, d]) => {
      const wr = d.total > 0 ? Math.round(d.wins / d.total * 100) : 0;
      return `<div class="analytics-row">
        <span class="analytics-row-name">${emotionLabels[emotion] || emotion}</span>
        <div class="analytics-row-stats">
          <span class="analytics-row-stat">${d.total} lệnh</span>
          <span class="analytics-row-stat">WR: ${wr}%</span>
          <span class="analytics-row-pnl ${d.pnl >= 0 ? 'positive' : 'negative'}">${formatMoney(d.pnl)}</span>
        </div>
      </div>`;
    }).join('');
  }

  // ===== Journal =====
  function renderJournal() {
    const container = document.getElementById('journal-grid');
    const empty = document.getElementById('journal-empty');
    if (!container) return;

    const monthInput = document.getElementById('journal-month');
    let filterMonth = monthInput?.value || '';

    const closed = allTrades.filter(t => t.status === 'closed' && t.exitDate);
    const grouped = {};

    closed.forEach(t => {
      const day = t.exitDate.substring(0, 10);
      if (filterMonth && !day.startsWith(filterMonth)) return;
      if (!grouped[day]) grouped[day] = { trades: [], pnl: 0 };
      grouped[day].trades.push(t);
      grouped[day].pnl += t.pnl;
    });

    const days = Object.keys(grouped).sort().reverse();

    if (days.length === 0) {
      container.innerHTML = '';
      if (empty) empty.style.display = '';
      return;
    }

    if (empty) empty.style.display = 'none';

    container.innerHTML = days.map(day => {
      const d = grouped[day];
      return `<div class="journal-day">
        <div class="journal-day-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
          <span>📅 ${day} (${d.trades.length} lệnh)</span>
          <span class="journal-day-pnl ${d.pnl >= 0 ? 'positive' : 'negative'}">${formatMoney(d.pnl)}</span>
        </div>
        <div class="journal-day-trades">
          ${d.trades.map(t => `
            <div class="journal-trade-row">
              <span class="trade-type-badge ${t.type}">${t.type.toUpperCase()}</span>
              <strong>${escapeHtml(t.symbol)}</strong>
              <span style="color:var(--text-secondary)">${formatNum(t.entryPrice)} → ${formatNum(t.exitPrice)}</span>
              ${t.strategy ? `<span style="color:var(--text-muted);font-size:0.78rem">📋 ${escapeHtml(t.strategy)}</span>` : ''}
              ${t.screenshot ? `<span class="journal-screenshot-btn" onclick="event.stopPropagation();showScreenshot('${t.id}')" title="Xem screenshot">📷</span>` : ''}
              <span class="trade-pnl ${t.pnl >= 0 ? 'positive' : 'negative'}" style="margin-left:auto">${formatMoney(t.pnl)}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
    }).join('');
  }

  // ===== Trade Modal =====
  function openTradeModal(id) {
    const modal = document.getElementById('trade-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('trade-form');
    if (!modal) return;

    form.reset();
    currentRating = 0;
    updateRatingDisplay();
    removeScreenshot();

    if (id) {
      // Edit mode
      const trade = allTrades.find(t => t.id === id);
      if (!trade) return;

      title.textContent = 'Sửa lệnh giao dịch';
      document.getElementById('trade-id').value = trade.id;
      document.getElementById('trade-symbol').value = trade.symbol;
      document.getElementById('trade-market').value = trade.market;
      document.getElementById('trade-type').value = trade.type;
      document.getElementById('trade-entry-price').value = trade.entryPrice;
      document.getElementById('trade-exit-price').value = trade.exitPrice || '';
      document.getElementById('trade-quantity').value = trade.quantity;
      document.getElementById('trade-sl').value = trade.stopLoss || '';
      document.getElementById('trade-tp').value = trade.takeProfit || '';
      document.getElementById('trade-leverage').value = trade.leverage || 1;
      document.getElementById('trade-fees').value = trade.fees || 0;
      document.getElementById('trade-exchange').value = trade.exchange || '';
      document.getElementById('trade-timeframe').value = trade.timeframe || '';
      document.getElementById('trade-entry-date').value = toLocalDatetime(trade.entryDate);
      document.getElementById('trade-exit-date').value = trade.exitDate ? toLocalDatetime(trade.exitDate) : '';
      document.getElementById('trade-status').value = trade.status;
      document.getElementById('trade-strategy').value = trade.strategy || '';
      document.getElementById('trade-emotion').value = trade.emotion || 'neutral';
      document.getElementById('trade-setup').value = trade.setup || '';
      document.getElementById('trade-notes').value = trade.notes || '';
      document.getElementById('trade-tags').value = (trade.tags || []).join(', ');
      currentRating = trade.rating || 0;

      // Restore screenshot if exists
      if (trade.screenshot) {
        currentScreenshot = trade.screenshot;
        document.getElementById('screenshot-name').textContent = 'Ảnh hiện tại';
        const preview = document.getElementById('screenshot-preview');
        const img = document.getElementById('screenshot-img');
        if (preview && img) {
          img.src = trade.screenshot;
          preview.style.display = 'block';
        }
      }
      updateRatingDisplay();
    } else {
      title.textContent = 'Thêm lệnh giao dịch';
      document.getElementById('trade-id').value = '';
      document.getElementById('trade-entry-date').value = toLocalDatetime(new Date().toISOString());
    }

    modal.style.display = 'flex';
  }
  window.openTradeModal = openTradeModal;

  // ===== Screenshot Upload =====
  function handleScreenshotUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast('Chỉ hỗ trợ file ảnh!', 'error');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast('Ảnh tối đa 3MB!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      currentScreenshot = reader.result;
      document.getElementById('screenshot-name').textContent = file.name;
      const preview = document.getElementById('screenshot-preview');
      const img = document.getElementById('screenshot-img');
      if (preview && img) {
        img.src = currentScreenshot;
   

  function showScreenshot(tradeId) {
    const trade = allTrades.find(t => t.id === tradeId);
    if (!trade || !trade.screenshot) return;

    const overlay = document.createElement('div');
    overlay.className = 'screenshot-overlay';
    overlay.innerHTML = `
      <div class="screenshot-modal">
        <div class="screenshot-modal-header">
          <span>📷 ${escapeHtml(trade.symbol)} — ${trade.entryDate?.substring(0, 10) || ''}</span>
          <button class="screenshot-modal-close">&times;</button>
        </div>
        <div class="screenshot-modal-body">
          <img src="${trade.screenshot}" alt="Screenshot" style="max-width:100%;max-height:80vh;border-radius:8px">
        </div>
      </div>
    `;
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.classList.contains('screenshot-modal-close')) {
        overlay.remove();
      }
    });
    document.body.appendChild(overlay);
  }
  window.showScreenshot = showScreenshot;     preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }

  function removeScreenshot() {
    currentScreenshot = '';
    document.getElementById('screenshot-name').textContent = '';
    const preview = document.getElementById('screenshot-preview');
    if (preview) preview.style.display = 'none';
    const img = document.getElementById('screenshot-img');
    if (img) img.src = '';
  }

  function closeTradeModal() {
    hideModal('trade-modal');
    removeScreenshot();
  }

  async function handleTradeSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('trade-id').value;
    const data = {
      symbol: document.getElementById('trade-symbol').value,
      market: document.getElementById('trade-market').value,
      type: document.getElementById('trade-type').value,
      entryPrice: parseFloat(document.getElementById('trade-entry-price').value),
      exitPrice: parseFloat(document.getElementById('trade-exit-price').value) || null,
      quantity: parseFloat(document.getElementById('trade-quantity').value),
      stopLoss: parseFloat(document.getElementById('trade-sl').value) || null,
      takeProfit: parseFloat(document.getElementById('trade-tp').value) || null,
      leverage: parseInt(document.getElementById('trade-leverage').value) || 1,
      fees: parseFloat(document.getElementById('trade-fees').value) || 0,
      exchange: document.getElementById('trade-exchange').value,
      timeframe: document.getElementById('trade-timeframe').value,
      entryDate: document.getElementById('trade-entry-date').value ? new Date(document.getElementById('trade-entry-date').value).toISOString() : new Date().toISOString(),
      exitDate: document.getElementById('trade-exit-date').value ? new Date(document.getElementById('trade-exit-date').value).toISOString() : null,
      status: document.getElementById('trade-status').value,
      strategy: document.getElementById('trade-strategy').value,
      emotion: document.getElementById('trade-emotion').value,
      rating: currentRating,
      setup: document.getElementById('trade-setup').value,
      notes: document.getElementById('trade-notes').value,
      tags: document.getElementById('trade-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      screenshot: currentScreenshot || ''
    };

    try {
      const url = id ? `${API}/${id}` : API;
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || 'Lỗi lưu lệnh', 'error');
        return;
      }

      closeTradeModal();
      toast(id ? '✅ Đã cập nhật lệnh!' : '✅ Đã thêm lệnh mới!', 'success');
      await Promise.all([loadTrades(), loadStats()]);
    } catch (e) {
      toast('Lỗi kết nối server', 'error');
    }
  }

  // ===== Close Trade Modal =====
  function openCloseModal(id) {
    const trade = allTrades.find(t => t.id === id);
    if (!trade) return;

    document.getElementById('close-trade-id').value = id;
    document.getElementById('close-trade-info').innerHTML = `
      <p><strong>${escapeHtml(trade.symbol)}</strong> — <span class="trade-type-badge ${trade.type}">${trade.type.toUpperCase()}</span></p>
      <p>Entry: <strong>${formatNum(trade.entryPrice)}</strong> | Qty: <strong>${formatNum(trade.quantity)}</strong>${trade.leverage > 1 ? ` | ${trade.leverage}x` : ''}</p>
    `;
    document.getElementById('close-exit-price').value = '';
    document.getElementById('close-exit-date').value = toLocalDatetime(new Date().toISOString());
    showModal('close-modal');
  }
  window.openCloseModal = openCloseModal;

  async function handleCloseTrade(e) {
    e.preventDefault();
    const id = document.getElementById('close-trade-id').value;
    const exitPrice = parseFloat(document.getElementById('close-exit-price').value);
    const exitDateVal = document.getElementById('close-exit-date').value;
    const exitDate = exitDateVal ? new Date(exitDateVal).toISOString() : new Date().toISOString();

    if (!exitPrice || exitPrice <= 0) {
      toast('Giá đóng lệnh không hợp lệ', 'error');
      return;
    }

    try {
      const res = await fetch(`${API}/${id}/close`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exitPrice, exitDate })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || 'Lỗi đóng lệnh', 'error');
        return;
      }

      hideModal('close-modal');
      toast('🔒 Đã đóng lệnh thành công!', 'success');
      await Promise.all([loadTrades(), loadStats()]);
    } catch (e) {
      toast('Lỗi kết nối server', 'error');
    }
  }

  // ===== Delete Trade =====
  function confirmDelete(id, symbol) {
    deleteTradeId = id;
    document.getElementById('delete-msg').textContent = `Bạn có chắc muốn xóa lệnh ${symbol}?`;
    showModal('delete-modal');
  }
  window.confirmDelete = confirmDelete;

  async function handleDeleteTrade() {
    if (!deleteTradeId) return;

    try {
      const res = await fetch(`${API}/${deleteTradeId}`, { method: 'DELETE' });
      if (!res.ok) {
        toast('Lỗi xóa lệnh', 'error');
        return;
      }
      hideModal('delete-modal');
      toast('🗑️ Đã xóa lệnh!', 'success');
      deleteTradeId = null;
      await Promise.all([loadTrades(), loadStats()]);
    } catch (e) {
      toast('Lỗi kết nối server', 'error');
    }
  }

  // ===== Helpers =====
  function showModal(id) { document.getElementById(id).style.display = 'flex'; }
  function hideModal(id) { document.getElementById(id).style.display = 'none'; }

  function setText(id, text, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'kpi-value' + (cls ? ` ${cls}` : '');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMoney(v) {
    if (v === null || v === undefined) return '$0';
    const sign = v >= 0 ? '+' : '';
    return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatNum(v) {
    if (v === null || v === undefined) return '—';
    return Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 });
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatDuration(ms) {
    if (!ms) return '—';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ ${mins % 60} phút`;
    const days = Math.floor(hrs / 24);
    return `${days} ngày ${hrs % 24}h`;
  }

  function toLocalDatetime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function statusLabel(s) {
    return { open: '🟢 Mở', closed: '🔴 Đóng', cancelled: '⚪ Hủy' }[s] || s;
  }

  function toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
  }

  // ===== Risk Calculator =====
  function setupRiskCalc() {
    document.getElementById('btn-rc-calc')?.addEventListener('click', calculateRisk);
    // Auto-calculate on Enter key
    ['rc-balance', 'rc-risk-pct', 'rc-entry', 'rc-sl', 'rc-tp', 'rc-leverage'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') calculateRisk(); });
    });
  }

  function calculateRisk() {
    const balance = parseFloat(document.getElementById('rc-balance')?.value) || 0;
    const riskPct = parseFloat(document.getElementById('rc-risk-pct')?.value) || 0;
    const entry = parseFloat(document.getElementById('rc-entry')?.value) || 0;
    const sl = parseFloat(document.getElementById('rc-sl')?.value) || 0;
    const tp = parseFloat(document.getElementById('rc-tp')?.value) || 0;
    const leverage = parseInt(document.getElementById('rc-leverage')?.value) || 1;

    if (!balance || !riskPct || !entry || !sl) {
      toast('Vui lòng nhập đầy đủ: Số dư, Risk %, Entry, Stop Loss', 'error');
      return;
    }
    if (entry === sl) {
      toast('Giá Entry và Stop Loss không thể bằng nhau', 'error');
      return;
    }

    const riskAmount = balance * (riskPct / 100);
    const slDistance = Math.abs(entry - sl);
    const slPct = (slDistance / entry) * 100;
    const quantity = riskAmount / slDistance;
    const positionValue = quantity * entry;
    const marginRequired = positionValue / leverage;

    let rrRatio = '—';
    let potentialProfit = '—';
    if (tp && tp !== entry) {
      const tpDistance = Math.abs(tp - entry);
      const rr = tpDistance / slDistance;
      rrRatio = `1:${rr.toFixed(2)}`;
      potentialProfit = formatMoney(tpDistance * quantity);
    }

    document.getElementById('rc-res-risk-amt').textContent = formatMoney(riskAmount).replace('+', '');
    document.getElementById('rc-res-sl-dist').textContent = `${formatNum(slDistance)} (${slPct.toFixed(2)}%)`;
    document.getElementById('rc-res-qty').textContent = formatNum(quantity);
    document.getElementById('rc-res-pos-value').textContent = formatMoney(positionValue).replace('+', '') + (leverage > 1 ? ` (margin: ${formatMoney(marginRequired).replace('+', '')})` : '');
    document.getElementById('rc-res-rr').textContent = rrRatio;
    document.getElementById('rc-res-profit').textContent = potentialProfit;
    document.getElementById('rc-results').style.display = '';
  }

  // ===== Equity Curve =====
  function setupEquityCurve() {
    document.getElementById('btn-ec-refresh')?.addEventListener('click', renderEquityCurve);
  }

  function renderEquityCurve() {
    const wrap = document.getElementById('ec-chart-wrap');
    const statsEl = document.getElementById('ec-stats');
    if (!wrap) return;

    const initial = parseFloat(document.getElementById('ec-initial')?.value) || 10000;
    const closed = allTrades
      .filter(t => t.status === 'closed' && t.exitDate)
      .sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate));

    if (closed.length < 2) {
      wrap.innerHTML = '<p class="empty-text">Cần ít nhất 2 lệnh đã đóng để vẽ biểu đồ</p>';
      if (statsEl) statsEl.style.display = 'none';
      return;
    }

    // Build equity data
    const points = [{ date: closed[0].exitDate.substring(0, 10), equity: initial }];
    let cumPnl = 0;
    closed.forEach(t => {
      cumPnl += t.pnl;
      points.push({ date: t.exitDate.substring(0, 10), equity: initial + cumPnl });
    });

    const minEq = Math.min(...points.map(p => p.equity));
    const maxEq = Math.max(...points.map(p => p.equity));
    const range = maxEq - minEq || 1;
    const finalEquity = points[points.length - 1].equity;
    const totalPnl = finalEquity - initial;
    const roi = ((totalPnl / initial) * 100);

    // Max drawdown
    let peak = initial, mdd = 0;
    points.forEach(p => {
      if (p.equity > peak) peak = p.equity;
      const dd = peak - p.equity;
      if (dd > mdd) mdd = dd;
    });

    // Draw SVG
    const W = 600, H = 220, padL = 60, padR = 20, padT = 15, padB = 30;
    const chartW = W - padL - padR, chartH = H - padT - padB;

    const toX = (i) => padL + (i / (points.length - 1)) * chartW;
    const toY = (eq) => padT + (1 - (eq - minEq) / range) * chartH;

    // Build path
    let pathD = '';
    let areaD = '';
    points.forEach((p, i) => {
      const x = toX(i), y = toY(p.equity);
      pathD += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
      areaD += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });
    areaD += ` L${toX(points.length - 1)},${padT + chartH} L${padL},${padT + chartH} Z`;

    const lineColor = totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
    const fillColor = totalPnl >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)';

    // Y axis labels (5 ticks)
    let yLabels = '';
    for (let i = 0; i <= 4; i++) {
      const val = minEq + (range * i / 4);
      const y = toY(val);
      yLabels += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-muted)" font-size="10">$${Math.round(val).toLocaleString()}</text>`;
      yLabels += `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--border)" stroke-dasharray="3,3"/>`;
    }

    // X axis labels (max 6)
    let xLabels = '';
    const step = Math.max(1, Math.floor(points.length / 6));
    for (let i = 0; i < points.length; i += step) {
      const x = toX(i);
      xLabels += `<text x="${x}" y="${H - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="9">${points[i].date.slice(5)}</text>`;
    }

    // Dots for first and last
    const dotFirst = `<circle cx="${toX(0)}" cy="${toY(points[0].equity)}" r="3.5" fill="${lineColor}" stroke="var(--bg-card)" stroke-width="1.5"/>`;
    const dotLast = `<circle cx="${toX(points.length - 1)}" cy="${toY(finalEquity)}" r="4" fill="${lineColor}" stroke="var(--bg-card)" stroke-width="2"/>`;

    wrap.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="ec-svg" preserveAspectRatio="xMidYMid meet">
        ${yLabels}
        ${xLabels}
        <path d="${areaD}" fill="${fillColor}"/>
        <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${dotFirst}
        ${dotLast}
      </svg>
    `;

    // Stats
    if (statsEl) {
      statsEl.style.display = '';
      const clsFinal = totalPnl >= 0 ? 'positive' : 'negative';
      document.getElementById('ec-final').textContent = `$${Math.round(finalEquity).toLocaleString()}`;
      document.getElementById('ec-final').className = `ec-stat-value ${clsFinal}`;
      document.getElementById('ec-total-pnl').textContent = formatMoney(totalPnl);
      document.getElementById('ec-total-pnl').className = `ec-stat-value ${clsFinal}`;
      document.getElementById('ec-roi').textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`;
      document.getElementById('ec-roi').className = `ec-stat-value ${clsFinal}`;
      document.getElementById('ec-mdd').textContent = formatMoney(-mdd).replace('+', '-');
      document.getElementById('ec-mdd').className = 'ec-stat-value negative';
    }
  }

})();
