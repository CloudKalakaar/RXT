// ==========================================================================
// RXT PRODUCTIONS - APPLICATION CORE CONTROLLER
// ==========================================================================

(function() {
  'use strict';

  const STORAGE_KEY = 'rxt_productions_data_v1';

  // Seed default demonstration clients if initial launch
  const SEED_CLIENTS = [
    {
      id: 'cli_101',
      name: 'Aditya & Priya',
      phone: '9876543210',
      date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days from now
      status: 'confirmed',
      address: 'ITC Gardenia, Bangalore',
      requirements: [
        { id: 'cat_trad_01', name: 'Traditional Photo & Video (Full Package)', category: 'Traditional', price: 35000, qty: 1 },
        { id: 'cat_candid_01', name: 'Candid Photography & Cinematic Film', category: 'Candid', price: 45000, qty: 1 },
        { id: 'cat_album_01', name: 'Premium Leatherette Photobook Album', category: 'Printing', price: 12000, qty: 1 }
      ],
      discountPercent: 10,
      advancePaid: 25000,
      notes: 'Pre-wedding candid shoot scheduled in morning. Cinematic drones allowed at venue.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'cli_102',
      name: 'Vikram & Ananya',
      phone: '9845012345',
      date: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0], // 12 days from now
      status: 'tentative',
      address: 'The Leela Palace, Bangalore',
      requirements: [
        { id: 'cat_candid_02', name: 'Candid Photography (Stills Only)', category: 'Candid', price: 25000, qty: 1 },
        { id: 'cat_drone_01', name: '4K Drone Aerial Coverage', category: 'Cinematic', price: 15000, qty: 1 }
      ],
      discountPercent: 5,
      advancePaid: 15000,
      notes: 'Evening reception coverage from 6 PM.',
      createdAt: new Date().toISOString()
    }
  ];

  // --------------------------------------------------------------------------
  // 1. DATA STORE
  // --------------------------------------------------------------------------
  const Store = {
    data: {
      clients: [],
      catalogue: [],
      settings: {
        currency: '₹',
        gdrive: { isConnected: false, userEmail: '', lastSyncedAt: '', autoSync: true }
      }
    },

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.data = {
            clients: Array.isArray(parsed.clients) ? parsed.clients : [],
            catalogue: Array.isArray(parsed.catalogue) && parsed.catalogue.length > 0 ? parsed.catalogue : JSON.parse(JSON.stringify(window.DEFAULT_CATALOGUE || [])),
            settings: { ...this.data.settings, ...(parsed.settings || {}) }
          };
        } else {
          // Fresh launch starts with clean slate
          this.data.clients = [];
          this.data.catalogue = JSON.parse(JSON.stringify(window.DEFAULT_CATALOGUE || []));
          this.save(false);
        }
      } catch (e) {
        console.error('[Store] Failed to load local storage:', e);
      }
    },

    clearAllClients() {
      this.data.clients = [];
      this.save(true);
      return true;
    },

    loadSeedClients() {
      this.data.clients = JSON.parse(JSON.stringify(SEED_CLIENTS));
      this.save(true);
      return true;
    },

    save(triggerSync = true) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        if (triggerSync && window.GDriveSync && typeof window.GDriveSync.triggerAutoSync === 'function') {
          window.GDriveSync.triggerAutoSync();
        }
      } catch (e) {
        console.error('[Store] Save error:', e);
      }
    },

    getClients() {
      return this.data.clients || [];
    },

    getClientById(id) {
      return this.data.clients.find(c => c.id === id);
    },

    saveClient(clientData) {
      const existingIdx = this.data.clients.findIndex(c => c.id === clientData.id);
      if (existingIdx !== -1) {
        this.data.clients[existingIdx] = { 
          ...this.data.clients[existingIdx], 
          ...clientData, 
          status: clientData.status || this.data.clients[existingIdx].status || 'tentative',
          updatedAt: new Date().toISOString() 
        };
      } else {
        const newClient = {
          ...clientData,
          status: clientData.status || 'tentative',
          id: 'cli_' + Date.now(),
          createdAt: new Date().toISOString()
        };
        this.data.clients.unshift(newClient);
      }
      this.save(true);
    },

    deleteClient(id) {
      const idx = this.data.clients.findIndex(c => c.id === id);
      if (idx !== -1) {
        this.data.clients.splice(idx, 1);
        this.save(true);
        return true;
      }
      return false;
    },

    getCatalogue() {
      return this.data.catalogue || [];
    },

    setCatalogue(items) {
      this.data.catalogue = items;
      this.save(true);
    },

    getSettings() {
      return this.data.settings || {};
    },

    updateSettings(newSettings) {
      this.data.settings = { ...this.data.settings, ...newSettings };
      this.save(false);
    },

    exportFullData() {
      return {
        exportedAt: new Date().toISOString(),
        clients: this.data.clients,
        catalogue: this.data.catalogue,
        settings: this.data.settings
      };
    },

    importFullData(imported) {
      if (!imported || !Array.isArray(imported.clients)) return false;
      this.data.clients = imported.clients;
      if (Array.isArray(imported.catalogue) && imported.catalogue.length > 0) {
        this.data.catalogue = imported.catalogue;
      }
      if (imported.settings) {
        this.data.settings = { ...this.data.settings, ...imported.settings };
      }
      this.save(false);
      return true;
    }
  };

  // --------------------------------------------------------------------------
  // 2. STATE & MANAGERS
  // --------------------------------------------------------------------------
  let catalogueMgr = null;
  let invoiceEngine = null;

  let currentTab = 'tab-dashboard';
  let calState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0 to 11
    selectedDate: new Date().toISOString().split('T')[0]
  };

  let activeInvoiceClient = null;

  // --------------------------------------------------------------------------
  // 3. TOAST NOTIFICATION UTILITY
  // --------------------------------------------------------------------------
  window.showToast = function(msg, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${msg}</span><span style="opacity:0.6; cursor:pointer; font-size:1rem;" onclick="this.parentElement.remove()">&times;</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, duration);
  };

  // --------------------------------------------------------------------------
  // 4. TAB NAVIGATION ROUTING
  // --------------------------------------------------------------------------
  function initTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    renderCurrentTab();
  }

  window.renderCurrentTab = function() {
    if (currentTab === 'tab-dashboard') {
      renderDashboard();
    } else if (currentTab === 'tab-clients') {
      renderClientsList();
    } else if (currentTab === 'tab-admin') {
      renderAdminTab();
    }
  };

  // --------------------------------------------------------------------------
  // 5. DASHBOARD & CALENDAR ENGINE
  // --------------------------------------------------------------------------
  const MONTH_NAMES = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  function initCalendarNavigation() {
    const prevBtn = document.getElementById('cal-prev-btn');
    const nextBtn = document.getElementById('cal-next-btn');
    const jumpBtn = document.getElementById('cal-today-jump');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        calState.month--;
        if (calState.month < 0) {
          calState.month = 11;
          calState.year--;
        }
        renderDashboard();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        calState.month++;
        if (calState.month > 11) {
          calState.month = 0;
          calState.year++;
        }
        renderDashboard();
      });
    }

    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        const today = new Date();
        calState.year = today.getFullYear();
        calState.month = today.getMonth();
        calState.selectedDate = today.toISOString().split('T')[0];
        renderDashboard();
      });
    }
  }

  function renderDashboard() {
    const monthTitle = document.getElementById('cal-month-title');
    if (monthTitle) {
      monthTitle.textContent = `${MONTH_NAMES[calState.month]} ${calState.year}`;
    }

    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDayIndex = new Date(calState.year, calState.month, 1).getDay(); // 0 for Sun
    const totalDaysInMonth = new Date(calState.year, calState.month + 1, 0).getDate();
    const prevMonthDays = new Date(calState.year, calState.month, 0).getDate();

    const todayStr = new Date().toISOString().split('T')[0];
    const clients = Store.getClients();

    // Map bookings by date string YYYY-MM-DD
    const bookingsByDate = {};
    clients.forEach(c => {
      if (c.date) {
        if (!bookingsByDate[c.date]) bookingsByDate[c.date] = [];
        bookingsByDate[c.date].push(c);
      }
    });

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const dayEl = document.createElement('div');
      dayEl.className = 'cal-day other-month';
      dayEl.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
      grid.appendChild(dayEl);
    }

    // 2. Current month days
    let monthConfirmedDaysCount = 0;
    let monthTentativeCount = 0;
    let monthPipelineTotal = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const monthPadded = String(calState.month + 1).padStart(2, '0');
      const dayPadded = String(day).padStart(2, '0');
      const dateStr = `${calState.year}-${monthPadded}-${dayPadded}`;

      const dayBookings = bookingsByDate[dateStr] || [];
      const confirmedBookings = dayBookings.filter(b => b.status === 'confirmed');
      const tentativeBookings = dayBookings.filter(b => b.status !== 'confirmed');

      const hasConfirmed = confirmedBookings.length > 0;
      const hasTentative = tentativeBookings.length > 0;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === calState.selectedDate;

      if (hasConfirmed) monthConfirmedDaysCount++;
      monthTentativeCount += tentativeBookings.length;

      dayBookings.forEach(b => {
        const calc = invoiceEngine.calculate(b.requirements, b.discountPercent, b.advancePaid);
        monthPipelineTotal += calc.grandTotal;
      });

      let dayClass = 'cal-day';
      if (hasConfirmed && hasTentative) dayClass += ' mixed booked';
      else if (hasConfirmed) dayClass += ' booked';
      else if (hasTentative) dayClass += ' tentative';

      if (isToday) dayClass += ' today';
      if (isSelected) dayClass += ' selected';

      let statusBadgeHtml = '';
      if (hasConfirmed && hasTentative) {
        statusBadgeHtml = `<span class="status-badge-mixed">${dayBookings.length} SHOOTS</span>`;
      } else if (hasConfirmed) {
        statusBadgeHtml = `<span class="status-badge-booked">${confirmedBookings.length > 1 ? confirmedBookings.length + ' SHOOTS' : 'REC'}</span>`;
      } else if (hasTentative) {
        statusBadgeHtml = `<span class="status-badge-tentative">${tentativeBookings.length > 1 ? tentativeBookings.length + ' TNT' : 'TNT'}</span>`;
      } else {
        statusBadgeHtml = `<span class="status-dot-free"></span>`;
      }

      const dayEl = document.createElement('div');
      dayEl.className = dayClass;
      dayEl.setAttribute('data-date', dateStr);

      dayEl.innerHTML = `
        <span class="cal-day-num">${day}</span>
        <div class="cal-day-status">
          ${statusBadgeHtml}
        </div>
      `;

      dayEl.addEventListener('click', () => {
        calState.selectedDate = dateStr;
        document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
        dayEl.classList.add('selected');
        renderDayDetailPanel(dateStr, dayBookings);
      });

      grid.appendChild(dayEl);
    }

    // 3. Next month leading days to complete grid rows
    const totalRendered = firstDayIndex + totalDaysInMonth;
    const remainingCells = (7 - (totalRendered % 7)) % 7;
    for (let j = 1; j <= remainingCells; j++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'cal-day other-month';
      dayEl.innerHTML = `<span class="cal-day-num">${j}</span>`;
      grid.appendChild(dayEl);
    }

    // Update KPI Counters
    const freeDaysCount = Math.max(0, totalDaysInMonth - monthConfirmedDaysCount);
    const bookedCountEl = document.getElementById('stat-booked-count');
    const tentativeCountEl = document.getElementById('stat-tentative-count');
    const freeCountEl = document.getElementById('stat-free-count');
    const pipelineEl = document.getElementById('stat-pipeline-amount');

    if (bookedCountEl) bookedCountEl.textContent = monthConfirmedDaysCount;
    if (tentativeCountEl) tentativeCountEl.textContent = monthTentativeCount;
    if (freeCountEl) freeCountEl.textContent = freeDaysCount;
    if (pipelineEl) pipelineEl.textContent = '₹' + monthPipelineTotal.toLocaleString('en-IN');

    // Render detail panel for selected date
    const selectedBookings = bookingsByDate[calState.selectedDate] || [];
    renderDayDetailPanel(calState.selectedDate, selectedBookings);
  }

  function renderDayDetailPanel(dateStr, bookings) {
    const labelEl = document.getElementById('selected-day-label');
    const statusEl = document.getElementById('selected-day-status');
    const container = document.getElementById('day-events-container');

    if (!container) return;

    const formattedDate = new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    if (labelEl) labelEl.textContent = formattedDate;

    if (bookings.length > 0) {
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      const tentativeBookings = bookings.filter(b => b.status !== 'confirmed');

      if (statusEl) {
        if (confirmedBookings.length > 0 && tentativeBookings.length > 0) {
          statusEl.className = 'day-badge-status is-mixed';
          statusEl.textContent = `${confirmedBookings.length} CONF • ${tentativeBookings.length} TNT`;
        } else if (confirmedBookings.length > 0) {
          statusEl.className = 'day-badge-status is-booked';
          statusEl.textContent = `${confirmedBookings.length} CONFIRMED`;
        } else {
          statusEl.className = 'day-badge-status is-tentative';
          statusEl.textContent = `${tentativeBookings.length} TENTATIVE`;
        }
      }

      const bookingCardsHtml = bookings.map(b => {
        const calc = invoiceEngine.calculate(b.requirements, b.discountPercent, b.advancePaid);
        const reqSummary = (b.requirements || []).map(r => r.name).join(' • ') || 'Custom Photography';
        const isConfirmed = b.status === 'confirmed';

        return `
          <div class="day-booking-card ${isConfirmed ? '' : 'tentative-card'}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="day-booking-name">${escapeHtml(b.name)}</div>
                  <span class="client-status-badge ${isConfirmed ? 'is-confirmed' : 'is-tentative'}">
                    ${isConfirmed ? '🎬 Confirmed' : '⏳ Tentative'}
                  </span>
                </div>
                <div class="day-booking-req">${escapeHtml(reqSummary)}</div>
                ${b.address ? `<div style="font-size:0.75rem; color:var(--text-dim); margin-top:3px;">📍 ${escapeHtml(b.address)}</div>` : ''}
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--font-pixel-heading); font-size:0.92rem; color:var(--gold-primary);">${invoiceEngine.formatCurrency(calc.grandTotal)}</div>
                <div style="font-size:0.65rem; color:var(--text-muted);">${b.discountPercent ? `(${b.discountPercent}% off)` : 'Standard'}</div>
              </div>
            </div>

            <div class="day-booking-actions">
              ${!isConfirmed ? `
                <button class="btn-confirm-sm" onclick="window.toggleClientStatus('${b.id}', 'confirmed')" title="Confirm Booking">✓ CONFIRM</button>
              ` : `
                <button class="btn btn-secondary" style="height:32px; font-size:0.65rem; padding:0 8px;" onclick="window.toggleClientStatus('${b.id}', 'tentative')" title="Mark as Tentative">⏳ TENTATIVE</button>
              `}
              <a href="tel:${encodeURIComponent(b.phone)}" class="btn btn-call btn-icon-sm" title="Call Client" style="width:32px; height:32px;">📞</a>
              <button class="btn btn-whatsapp btn-icon-sm" onclick="window.openWhatsappForClient('${b.id}')" title="WhatsApp" style="width:32px; height:32px;">💬</button>
              <button class="btn btn-primary" style="height:32px; font-size:0.65rem; padding:0 8px;" onclick="window.openQuotationForClient('${b.id}')" title="16-Slide Wedding Quotation Deck">🎬 QUOTE</button>
              <button class="btn btn-secondary" style="height:32px; font-size:0.65rem; padding:0 8px;" onclick="window.openInvoiceForClient('${b.id}')" title="Billing Receipt & Invoice">🧾 BILL</button>
              <button class="btn btn-secondary" style="height:32px; font-size:0.65rem; padding:0 8px;" onclick="window.openEditClientModal('${b.id}')">✏️ EDIT</button>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = `
        ${bookingCardsHtml}
        <div style="margin-top:14px; text-align:center;">
          <button class="btn btn-secondary" style="width:100%; height:38px; font-size:0.75rem;" onclick="window.openAddClientForDate('${dateStr}')">
            + ADD ANOTHER SHOOT ON THIS DATE
          </button>
        </div>
      `;
    } else {
      if (statusEl) {
        statusEl.className = 'day-badge-status is-free';
        statusEl.textContent = 'AVAILABLE';
      }

      container.innerHTML = `
        <div style="padding:10px 0; text-align:center;">
          <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:10px;">✨ Open for Booking! No photography shoots scheduled on this date.</p>
          <button class="btn btn-primary" style="height:36px;" onclick="window.openAddClientForDate('${dateStr}')">
            + BOOK SHOOT ON THIS DATE
          </button>
        </div>
      `;
    }
  }

  window.toggleClientStatus = function(clientId, explicitStatus) {
    const client = Store.getClientById(clientId);
    if (!client) return;
    const current = client.status || 'tentative';
    const nextStatus = explicitStatus || (current === 'confirmed' ? 'tentative' : 'confirmed');
    client.status = nextStatus;
    Store.saveClient(client);
    if (nextStatus === 'confirmed') {
      showToast(`Booking for "${client.name}" confirmed! 🎬`, 'success');
    } else {
      showToast(`Booking for "${client.name}" marked as tentative hold. ⏳`, 'info');
    }
    renderCurrentTab();
  };

  // --------------------------------------------------------------------------
  // 6. CLIENTS CRM & SEARCH
  // --------------------------------------------------------------------------
  function initClientsTab() {
    const searchInput = document.getElementById('client-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderClientsList(searchInput.value.trim().toLowerCase());
      });
    }

    const addBtn = document.getElementById('btn-open-add-client');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        window.openAddClientForDate(calState.selectedDate);
      });
    }

    const clearSampleBtn = document.getElementById('btn-clear-sample-clients');
    if (clearSampleBtn) {
      clearSampleBtn.addEventListener('click', () => {
        if (confirm('Wipe all clients and reset database to a clean slate (0 clients)?')) {
          Store.clearAllClients();
          showToast('Cleared all clients! Database reset to 0.', 'info');
          renderCurrentTab();
        }
      });
    }

    const loadDemoBtn = document.getElementById('btn-load-demo-clients');
    if (loadDemoBtn) {
      loadDemoBtn.addEventListener('click', () => {
        Store.loadSeedClients();
        showToast('Sample clients loaded!', 'success');
        renderCurrentTab();
      });
    }
  }

  function renderClientsList(query = '') {
    const container = document.getElementById('clients-list-container');
    if (!container) return;

    const allClients = Store.getClients();
    
    // Update toolbar count badge & toggle buttons
    const countText = document.getElementById('clients-count-text');
    const clearBtn = document.getElementById('btn-clear-sample-clients');
    const demoBtn = document.getElementById('btn-load-demo-clients');
    if (countText) {
      countText.textContent = `${allClients.length} Client${allClients.length === 1 ? '' : 's'}`;
    }
    if (clearBtn) clearBtn.style.display = allClients.length > 0 ? 'inline-block' : 'none';
    if (demoBtn) demoBtn.style.display = allClients.length === 0 ? 'inline-block' : 'none';

    let clients = allClients;
    if (query) {
      clients = clients.filter(c => 
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query)) ||
        (c.address && c.address.toLowerCase().includes(query)) ||
        (c.date && c.date.includes(query))
      );
    }

    if (clients.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📸</div>
          <div class="empty-state-title">NO CLIENTS FOUND</div>
          <div class="empty-state-sub">Tap "+ ADD CLIENT" to create a new shoot booking, or "Load Demo" to preview.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = clients.map(client => {
      const calc = invoiceEngine.calculate(client.requirements, client.discountPercent, client.advancePaid);
      const formattedDate = client.date ? new Date(client.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) : 'Unscheduled';

      const reqTags = (client.requirements || []).map(r => `
        <span class="req-tag">${escapeHtml(r.name)} (${invoiceEngine.formatCurrency(r.price * (r.qty || 1))})</span>
      `).join('');

      return `
        <div class="client-card vf-card">
          <div class="client-header">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="client-name">${escapeHtml(client.name)}</div>
                <span class="client-status-badge ${client.status === 'confirmed' ? 'is-confirmed' : 'is-tentative'}">
                  ${client.status === 'confirmed' ? '🎬 Confirmed' : '⏳ Tentative'}
                </span>
              </div>
              <div class="client-detail-row" style="margin-top:2px;">
                <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--info-cyan);">📞 ${escapeHtml(client.phone)}</span>
              </div>
            </div>
            <span class="client-date-badge">📅 ${formattedDate}</span>
          </div>

          ${client.address ? `
            <div class="client-detail-row" style="font-size:0.78rem; color:var(--text-muted); margin-bottom:6px;">
              <span>📍 ${escapeHtml(client.address)}</span>
            </div>
          ` : ''}

          <div class="client-requirements-tags">
            ${reqTags || '<span style="font-size:0.75rem; color:var(--text-dim);">No requirements chosen</span>'}
          </div>

          <div class="client-card-footer">
            <div class="client-footer-top-row">
              <div class="bill-amount-wrap">
                <span class="bill-label">Grand Total ${client.discountPercent ? `(${client.discountPercent}% Off)` : ''}</span>
                <span class="bill-amount">${invoiceEngine.formatCurrency(calc.grandTotal)}</span>
              </div>

              <div class="client-icon-actions">
                ${client.status !== 'confirmed' ? `
                  <button class="btn-confirm-sm" onclick="window.toggleClientStatus('${client.id}', 'confirmed')" title="Confirm Booking">✓ CONFIRM</button>
                ` : `
                  <button class="btn btn-secondary btn-icon-sm" onclick="window.toggleClientStatus('${client.id}', 'tentative')" title="Mark as Tentative" style="font-size:0.65rem;">⏳</button>
                `}
                <a href="tel:${encodeURIComponent(client.phone)}" class="btn btn-call btn-icon-sm" title="Call Client">📞</a>
                <button class="btn btn-whatsapp btn-icon-sm" onclick="window.openWhatsappForClient('${client.id}')" title="WhatsApp">💬</button>
                <button class="btn btn-secondary btn-icon-sm" onclick="window.openEditClientModal('${client.id}')" title="Edit">✏️</button>
                <button class="btn btn-danger btn-icon-sm" onclick="window.confirmDeleteClient('${client.id}')" title="Delete">🗑️</button>
              </div>
            </div>

            <div class="client-doc-buttons-strip">
              <button class="btn btn-primary client-doc-btn" onclick="window.openQuotationForClient('${client.id}')" title="16-Slide Luxury Wedding Quotation Deck">
                <span>🎬 QUOTATION</span>
              </button>
              <button class="btn btn-secondary client-doc-btn" onclick="window.openInvoiceForClient('${client.id}')" title="Billing Tax Invoice & Receipt">
                <span>🧾 BILL</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --------------------------------------------------------------------------
  // 7. CLIENT ADD / EDIT MODAL & LIVE REQUIREMENT CALCULATOR
  // --------------------------------------------------------------------------
  let modalReqSelectedState = [];

  window.openAddClientForDate = function(dateStr) {
    document.getElementById('modal-client-title').textContent = 'ADD CLIENT';
    document.getElementById('client-id-field').value = '';
    document.getElementById('client-name').value = '';
    document.getElementById('client-phone').value = '';
    document.getElementById('client-date').value = dateStr || new Date().toISOString().split('T')[0];
    document.getElementById('client-address').value = '';
    document.getElementById('client-discount').value = 0;
    document.getElementById('client-advance').value = 0;
    document.getElementById('client-notes').value = '';

    // Default status: Tentative
    const tentRadio = document.getElementById('client-status-tentative');
    if (tentRadio) tentRadio.checked = true;

    modalReqSelectedState = [];
    renderModalReqSelection();
    updateModalLiveCalculations();
    openModal('modal-client');
  };

  window.openEditClientModal = function(clientId) {
    const client = Store.getClientById(clientId);
    if (!client) return;

    document.getElementById('modal-client-title').textContent = 'EDIT CLIENT';
    document.getElementById('client-id-field').value = client.id;
    document.getElementById('client-name').value = client.name || '';
    document.getElementById('client-phone').value = client.phone || '';
    document.getElementById('client-date').value = client.date || '';
    document.getElementById('client-address').value = client.address || '';
    document.getElementById('client-discount').value = client.discountPercent || 0;
    document.getElementById('client-advance').value = client.advancePaid || 0;
    document.getElementById('client-notes').value = client.notes || '';

    // Populate status
    const isConfirmed = client.status === 'confirmed';
    const confRadio = document.getElementById('client-status-confirmed');
    const tentRadio = document.getElementById('client-status-tentative');
    if (isConfirmed && confRadio) confRadio.checked = true;
    else if (tentRadio) tentRadio.checked = true;

    // Clone selected requirements
    modalReqSelectedState = JSON.parse(JSON.stringify(client.requirements || []));
    renderModalReqSelection();
    updateModalLiveCalculations();
    openModal('modal-client');
  };

  function renderModalReqSelection() {
    const container = document.getElementById('modal-req-selection-list');
    if (!container) return;

    const catalogueItems = catalogueMgr.getAll();
    container.innerHTML = catalogueItems.map(item => {
      const isSelected = modalReqSelectedState.some(r => r.id === item.id);
      return `
        <div class="req-select-item ${isSelected ? 'selected' : ''}" data-item-id="${item.id}">
          <div class="req-item-left">
            <input type="checkbox" class="req-item-checkbox" ${isSelected ? 'checked' : ''} data-item-id="${item.id}">
            <div>
              <div class="req-item-name">${escapeHtml(item.name)}</div>
              <div style="font-size:0.68rem; color:var(--text-muted);">${escapeHtml(item.category)}</div>
            </div>
          </div>
          <div class="req-item-price">${invoiceEngine.formatCurrency(item.price)}</div>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.req-select-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          const chk = el.querySelector('input[type="checkbox"]');
          if (chk) chk.checked = !chk.checked;
        }
        const itemId = el.getAttribute('data-item-id');
        const chk = el.querySelector('input[type="checkbox"]');
        handleModalReqToggle(itemId, chk.checked);
      });
    });

    container.querySelectorAll('.req-item-checkbox').forEach(chk => {
      chk.addEventListener('change', () => {
        const itemId = chk.getAttribute('data-item-id');
        handleModalReqToggle(itemId, chk.checked);
      });
    });
  }

  function handleModalReqToggle(itemId, isChecked) {
    const catItem = catalogueMgr.getById(itemId);
    if (!catItem) return;

    if (isChecked) {
      if (!modalReqSelectedState.some(r => r.id === itemId)) {
        modalReqSelectedState.push({
          id: catItem.id,
          name: catItem.name,
          category: catItem.category,
          price: catItem.price,
          qty: 1
        });
      }
    } else {
      modalReqSelectedState = modalReqSelectedState.filter(r => r.id !== itemId);
    }

    // Refresh active style
    document.querySelectorAll('#modal-req-selection-list .req-select-item').forEach(el => {
      const id = el.getAttribute('data-item-id');
      const checked = modalReqSelectedState.some(r => r.id === id);
      el.classList.toggle('selected', checked);
      const chk = el.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = checked;
    });

    updateModalLiveCalculations();
  }

  function updateModalLiveCalculations() {
    const discountVal = Number(document.getElementById('client-discount').value) || 0;
    const advanceVal = Number(document.getElementById('client-advance').value) || 0;

    const calc = invoiceEngine.calculate(modalReqSelectedState, discountVal, advanceVal);

    const subtotalEl = document.getElementById('modal-calc-subtotal');
    const discountEl = document.getElementById('modal-calc-discount');
    const grandTotalEl = document.getElementById('modal-calc-grand-total');

    if (subtotalEl) subtotalEl.textContent = invoiceEngine.formatCurrency(calc.subtotal);
    if (discountEl) discountEl.textContent = `- ${invoiceEngine.formatCurrency(calc.discountAmount)} (${calc.discountPercent}%)`;
    if (grandTotalEl) grandTotalEl.textContent = invoiceEngine.formatCurrency(calc.grandTotal);
  }

  function initClientFormEvents() {
    const discountInput = document.getElementById('client-discount');
    const advanceInput = document.getElementById('client-advance');

    if (discountInput) discountInput.addEventListener('input', updateModalLiveCalculations);
    if (advanceInput) advanceInput.addEventListener('input', updateModalLiveCalculations);

    const saveBtn = document.getElementById('btn-save-client');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const name = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        const date = document.getElementById('client-date').value;
        const address = document.getElementById('client-address').value.trim();
        const discountPercent = Number(document.getElementById('client-discount').value) || 0;
        const advancePaid = Number(document.getElementById('client-advance').value) || 0;
        const notes = document.getElementById('client-notes').value.trim();
        const existingId = document.getElementById('client-id-field').value;

        if (!name) {
          showToast('Please enter client name.', 'error');
          return;
        }
        if (!phone) {
          showToast('Please enter phone number.', 'error');
          return;
        }
        if (!date) {
          showToast('Please select event date.', 'error');
          return;
        }

        const statusRadio = document.querySelector('input[name="client-status"]:checked');
        const status = statusRadio ? statusRadio.value : 'tentative';

        const clientData = {
          id: existingId || undefined,
          name,
          phone,
          date,
          status,
          address,
          requirements: modalReqSelectedState,
          discountPercent,
          advancePaid,
          notes
        };

        Store.saveClient(clientData);
        closeModal('modal-client');
        const isConf = status === 'confirmed';
        showToast(existingId ? 'Client updated successfully! ✨' : (isConf ? 'New shoot confirmed & booked! 🎉' : 'Tentative hold recorded! ⏳'), 'success');

        renderCurrentTab();
      });
    }
  }

  window.confirmDeleteClient = function(clientId) {
    const client = Store.getClientById(clientId);
    if (!client) return;

    if (confirm(`Are you sure you want to delete client "${client.name}"?\nThis cannot be undone.`)) {
      Store.deleteClient(clientId);
      showToast('Client deleted.', 'info');
      renderCurrentTab();
    }
  };

  // --------------------------------------------------------------------------
  // 8. LIVE DYNAMIC INVOICE MODAL & ACTIONS
  // --------------------------------------------------------------------------
  window.openInvoiceForClient = function(clientId) {
    const client = Store.getClientById(clientId);
    if (!client) return;

    activeInvoiceClient = client;

    // Set quick discount control
    const quickDiscount = document.getElementById('invoice-quick-discount');
    if (quickDiscount) {
      quickDiscount.value = client.discountPercent || 0;
    }

    renderLiveInvoiceSheet();
    openModal('modal-invoice');
  };

  function renderLiveInvoiceSheet() {
    if (!activeInvoiceClient) return;

    const previewContainer = document.getElementById('invoice-preview-container');
    if (!previewContainer) return;

    const calc = invoiceEngine.calculate(
      activeInvoiceClient.requirements,
      activeInvoiceClient.discountPercent,
      activeInvoiceClient.advancePaid
    );

    previewContainer.innerHTML = invoiceEngine.generateHtmlPreview(activeInvoiceClient, calc);
  }

  function initInvoiceModalEvents() {
    const quickDiscount = document.getElementById('invoice-quick-discount');
    if (quickDiscount) {
      quickDiscount.addEventListener('input', () => {
        if (!activeInvoiceClient) return;
        const newDiscount = Math.min(100, Math.max(0, Number(quickDiscount.value) || 0));
        activeInvoiceClient.discountPercent = newDiscount;

        // Persist update
        Store.saveClient(activeInvoiceClient);

        // Instantly regenerate invoice
        renderLiveInvoiceSheet();
      });
    }

    const editReqsBtn = document.getElementById('btn-invoice-edit-reqs');
    if (editReqsBtn) {
      editReqsBtn.addEventListener('click', () => {
        if (!activeInvoiceClient) return;
        closeModal('modal-invoice');
        window.openEditClientModal(activeInvoiceClient.id);
      });
    }

    const downloadPdfBtn = document.getElementById('btn-download-pdf');
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener('click', async () => {
        if (!activeInvoiceClient) return;
        try {
          showToast('Generating high-res PDF invoice...', 'info', 1500);
          const calc = invoiceEngine.calculate(
            activeInvoiceClient.requirements,
            activeInvoiceClient.discountPercent,
            activeInvoiceClient.advancePaid
          );
          const filename = await invoiceEngine.downloadPdf(activeInvoiceClient, calc);
          showToast(`PDF downloaded: ${filename}`, 'success');
        } catch (err) {
          showToast(err.message || 'Error generating PDF', 'error');
        }
      });
    }

    const shareWhatsappBtn = document.getElementById('btn-share-whatsapp');
    if (shareWhatsappBtn) {
      shareWhatsappBtn.addEventListener('click', async () => {
        if (!activeInvoiceClient) return;
        try {
          const calc = invoiceEngine.calculate(
            activeInvoiceClient.requirements,
            activeInvoiceClient.discountPercent,
            activeInvoiceClient.advancePaid
          );
          await invoiceEngine.shareOnWhatsapp(activeInvoiceClient, calc);
        } catch (err) {
          showToast(err.message || 'Error sharing quotation', 'error');
        }
      });
    }
  }

  window.openWhatsappForClient = function(clientId) {
    const client = Store.getClientById(clientId);
    if (!client) return;

    const calc = invoiceEngine.calculate(client.requirements, client.discountPercent, client.advancePaid);
    invoiceEngine.shareOnWhatsapp(client, calc);
  };

  // --------------------------------------------------------------------------
  // 8B. LUXURY WEDDING QUOTATION PRESENTATION ENGINE (16 SLIDES)
  // --------------------------------------------------------------------------
  let quotationEngine = null;
  let activeQuotationClient = null;
  let activeQuotationSlideIndex = 1;

  const SLIDE_TITLES = [
    '1. Cover Presentation - RXT Productions',
    '2. Welcome to RXT Productions',
    '3. About Us - Ramachandra & Rakshith (Father-Son Duo)',
    '4. Your Details & Shoot Enquiries',
    '5. A Premium Wedding Photography Company (100+ Stories)',
    '6. Event Flow & Timeline Infographic',
    '7. Haladi / Pre-Wedding Coverage & Team',
    '8. Wedding & Reception Coverage & Team',
    '9. Deliverables (Color Graded Stills, Film & Albums)',
    '10. Total Package Pricing & Exclusive Discount',
    '11. Wedding Highlights & Portraits Showcase',
    '12. Recent Client Review & Testimonial',
    '13. Terms & Conditions',
    '14. Extra Charges & Studio Add-Ons',
    '15. Contact Us - Rakshith R (Bengaluru)',
    '16. Thank You - RXT Productions'
  ];

  window.openQuotationForClient = function(clientId) {
    const client = Store.getClientById(clientId);
    if (!client) return;

    activeQuotationClient = client;
    activeQuotationSlideIndex = 1;

    const quickDiscount = document.getElementById('quotation-quick-discount');
    if (quickDiscount) {
      quickDiscount.value = client.discountPercent || 0;
    }

    renderQuotationCurrentSlide();
    openModal('modal-quotation');
  };

  async function renderQuotationCurrentSlide() {
    if (!activeQuotationClient || !quotationEngine) return;

    const canvas = document.getElementById('quotation-slide-canvas');
    const indicator = document.getElementById('quotation-slide-indicator');
    const titleEl = document.getElementById('quotation-slide-title');

    if (indicator) {
      indicator.textContent = `Slide ${activeQuotationSlideIndex} / 16`;
    }

    if (titleEl) {
      titleEl.textContent = SLIDE_TITLES[activeQuotationSlideIndex - 1] || `Slide ${activeQuotationSlideIndex}`;
    }

    // Update active jump pill
    document.querySelectorAll('.quote-jump-btn').forEach(btn => {
      const slide = Number(btn.getAttribute('data-slide'));
      btn.classList.toggle('active', slide === activeQuotationSlideIndex);
    });

    const calc = invoiceEngine.calculate(
      activeQuotationClient.requirements,
      activeQuotationClient.discountPercent,
      activeQuotationClient.advancePaid
    );

    await quotationEngine.renderSlideToCanvas(activeQuotationSlideIndex, activeQuotationClient, calc, canvas);
  }

  function initQuotationModalEvents() {
    const prevBtn = document.getElementById('btn-quote-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        activeQuotationSlideIndex--;
        if (activeQuotationSlideIndex < 1) activeQuotationSlideIndex = 16;
        renderQuotationCurrentSlide();
      });
    }

    const nextBtn = document.getElementById('btn-quote-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        activeQuotationSlideIndex++;
        if (activeQuotationSlideIndex > 16) activeQuotationSlideIndex = 1;
        renderQuotationCurrentSlide();
      });
    }

    // Jump buttons
    document.querySelectorAll('.quote-jump-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSlide = Number(btn.getAttribute('data-slide'));
        if (targetSlide >= 1 && targetSlide <= 16) {
          activeQuotationSlideIndex = targetSlide;
          renderQuotationCurrentSlide();
        }
      });
    });

    // Quick discount input in quotation modal
    const quickDiscount = document.getElementById('quotation-quick-discount');
    if (quickDiscount) {
      quickDiscount.addEventListener('input', () => {
        if (!activeQuotationClient) return;
        const newDiscount = Math.min(100, Math.max(0, Number(quickDiscount.value) || 0));
        activeQuotationClient.discountPercent = newDiscount;

        // Persist update
        Store.saveClient(activeQuotationClient);

        // Re-render current slide (especially if on slide 10 Pricing)
        renderQuotationCurrentSlide();
      });
    }

    // Download 16-Slide PDF
    const downloadPdfBtn = document.getElementById('btn-download-quotation-pdf');
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener('click', async () => {
        if (!activeQuotationClient || !quotationEngine) return;
        try {
          showToast('Generating 16-slide Wedding Quotation PDF (1440x810)...', 'info', 3000);
          const calc = invoiceEngine.calculate(
            activeQuotationClient.requirements,
            activeQuotationClient.discountPercent,
            activeQuotationClient.advancePaid
          );
          const filename = await quotationEngine.downloadQuotationPdf(activeQuotationClient, calc);
          showToast(`Quotation downloaded: ${filename} 🎉`, 'success');
        } catch (err) {
          showToast(err.message || 'Error creating quotation PDF', 'error');
        }
      });
    }

    // Share Quotation on WhatsApp
    const shareWaBtn = document.getElementById('btn-share-quotation-whatsapp');
    if (shareWaBtn) {
      shareWaBtn.addEventListener('click', async () => {
        if (!activeQuotationClient || !quotationEngine) return;
        try {
          const calc = invoiceEngine.calculate(
            activeQuotationClient.requirements,
            activeQuotationClient.discountPercent,
            activeQuotationClient.advancePaid
          );
          await quotationEngine.shareQuotationWhatsapp(activeQuotationClient, calc);
        } catch (err) {
          showToast(err.message || 'Error sharing quotation', 'error');
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // 9. ADMIN TAB (CATALOGUE & CLOUD SYNC)
  // --------------------------------------------------------------------------
  window.renderAdminTab = function() {
    renderCatalogueList();
    renderGDriveStatus();
  };

  function renderCatalogueList() {
    const container = document.getElementById('catalogue-items-container');
    if (!container) return;

    const items = catalogueMgr.getAll();
    container.innerHTML = items.map(item => `
      <div class="catalogue-item-card">
        <div class="catalogue-info">
          <span class="catalogue-name">${escapeHtml(item.name)}</span>
          <span class="catalogue-category">${escapeHtml(item.category)}</span>
          ${item.description ? `<span style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${escapeHtml(item.description)}</span>` : ''}
          <span class="catalogue-price">${invoiceEngine.formatCurrency(item.price)}</span>
        </div>
        <div class="catalogue-actions">
          <button class="btn btn-secondary btn-icon-sm" onclick="window.openEditCatalogueModal('${item.id}')" title="Edit">✏️</button>
          <button class="btn btn-danger btn-icon-sm" onclick="window.confirmDeleteCatalogue('${item.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function renderGDriveStatus() {
    const isConn = GDriveSync.isConnected();
    const gdriveSettings = Store.getSettings().gdrive || {};

    const badge = document.getElementById('gdrive-status-badge');
    const emailEl = document.getElementById('gdrive-account-email');
    const syncTimeEl = document.getElementById('gdrive-last-sync-time');
    const connectBtn = document.getElementById('btn-gdrive-connect');
    const disconnectBtn = document.getElementById('btn-gdrive-disconnect');
    const opsRow = document.getElementById('gdrive-cloud-ops-row');
    const autoSyncToggle = document.getElementById('gdrive-auto-sync-toggle');

    if (badge) {
      badge.className = `gdrive-badge ${isConn ? 'connected' : 'disconnected'}`;
      badge.textContent = isConn ? 'Connected' : 'Disconnected';
    }

    if (emailEl) {
      emailEl.textContent = isConn ? (gdriveSettings.userEmail || 'Google Account') : 'Not Connected';
    }

    if (syncTimeEl) {
      syncTimeEl.textContent = gdriveSettings.lastSyncedAt
        ? new Date(gdriveSettings.lastSyncedAt).toLocaleString('en-IN')
        : 'Never';
    }

    if (connectBtn) connectBtn.style.display = isConn ? 'none' : 'block';
    if (disconnectBtn) disconnectBtn.style.display = isConn ? 'block' : 'none';
    if (opsRow) opsRow.style.display = isConn ? 'flex' : 'none';

    if (autoSyncToggle) {
      autoSyncToggle.checked = gdriveSettings.autoSync !== false;
    }

    GDriveSync.updateStatusVisuals(GDriveSync.isSyncing ? 'syncing' : (isConn ? 'connected' : 'disconnected'));
  }

  function initAdminEvents() {
    // Add Catalogue Button
    const addCatBtn = document.getElementById('btn-open-add-catalogue');
    if (addCatBtn) {
      addCatBtn.addEventListener('click', () => {
        document.getElementById('modal-catalogue-title').textContent = 'ADD SERVICE';
        document.getElementById('cat-id-field').value = '';
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-category').value = 'Traditional';
        document.getElementById('cat-price').value = '';
        document.getElementById('cat-desc').value = '';
        openModal('modal-catalogue');
      });
    }

    // Save Catalogue
    const saveCatBtn = document.getElementById('btn-save-catalogue');
    if (saveCatBtn) {
      saveCatBtn.addEventListener('click', () => {
        const id = document.getElementById('cat-id-field').value;
        const name = document.getElementById('cat-name').value.trim();
        const category = document.getElementById('cat-category').value;
        const price = Number(document.getElementById('cat-price').value) || 0;
        const description = document.getElementById('cat-desc').value.trim();

        if (!name) {
          showToast('Please enter service name.', 'error');
          return;
        }

        if (id) {
          catalogueMgr.updateItem(id, { name, category, price, description });
        } else {
          catalogueMgr.addItem({ name, category, price, description });
        }

        Store.setCatalogue(catalogueMgr.getAll());
        closeModal('modal-catalogue');
        showToast('Catalogue updated! ✨', 'success');
        renderCatalogueList();
      });
    }

    // Google Drive Buttons
    const connectBtn = document.getElementById('btn-gdrive-connect');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => GDriveSync.connect(true));
    }

    const disconnectBtn = document.getElementById('btn-gdrive-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => GDriveSync.disconnect());
    }

    const backupNowBtn = document.getElementById('btn-gdrive-backup-now');
    if (backupNowBtn) {
      backupNowBtn.addEventListener('click', () => GDriveSync.uploadData(true, true));
    }

    const restoreNowBtn = document.getElementById('btn-gdrive-restore-now');
    if (restoreNowBtn) {
      restoreNowBtn.addEventListener('click', () => GDriveSync.restoreFromCloud());
    }

    const autoSyncToggle = document.getElementById('gdrive-auto-sync-toggle');
    if (autoSyncToggle) {
      autoSyncToggle.addEventListener('change', () => {
        const cur = Store.getSettings().gdrive || {};
        Store.updateSettings({
          gdrive: { ...cur, autoSync: autoSyncToggle.checked }
        });
        showToast(`Auto-sync ${autoSyncToggle.checked ? 'Enabled' : 'Disabled'}`, 'info');
      });
    }

    // Header Quick Sync Button
    const headerSyncBtn = document.getElementById('header-sync-status');
    if (headerSyncBtn) {
      headerSyncBtn.addEventListener('click', () => {
        if (GDriveSync.isConnected()) {
          GDriveSync.uploadData(true, false);
        } else {
          switchTab('tab-admin');
          showToast('Connect Google Drive to enable cloud backup.', 'info');
        }
      });
    }

    // Admin Data Slate Management (Wipe or Load Demo)
    const adminClearBtn = document.getElementById('btn-admin-clear-clients');
    if (adminClearBtn) {
      adminClearBtn.addEventListener('click', () => {
        if (confirm('Permanently wipe all clients from the database and reset to clean slate (0 clients)?')) {
          Store.clearAllClients();
          showToast('Database wiped! 0 clients remaining.', 'info');
          renderCurrentTab();
        }
      });
    }

    const adminLoadDemoBtn = document.getElementById('btn-admin-load-demo');
    if (adminLoadDemoBtn) {
      adminLoadDemoBtn.addEventListener('click', () => {
        Store.loadSeedClients();
        showToast('Sample demo clients restored!', 'success');
        renderCurrentTab();
      });
    }

    // Local JSON Export
    const exportBtn = document.getElementById('btn-export-json');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = Store.exportFullData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RXT_Productions_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('JSON backup exported!', 'success');
      });
    }

    // Local JSON Import
    const importTriggerBtn = document.getElementById('btn-import-json-trigger');
    const importFileInput = document.getElementById('import-json-file-input');
    if (importTriggerBtn && importFileInput) {
      importTriggerBtn.addEventListener('click', () => importFileInput.click());
      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            if (Store.importFullData(parsed)) {
              catalogueMgr = new window.CatalogueManager(Store.getCatalogue());
              showToast('Backup restored successfully!', 'success');
              renderCurrentTab();
            } else {
              showToast('Invalid backup file format.', 'error');
            }
          } catch (err) {
            showToast('Failed to parse JSON file.', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Cache Refresh Feature (PWA with cache refresh requirement)
    const cacheRefreshBtn = document.getElementById('btn-cache-refresh');
    if (cacheRefreshBtn) {
      cacheRefreshBtn.addEventListener('click', async () => {
        showToast('Clearing cache & refreshing app...', 'info', 2000);
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          } catch (e) {}
        }
        if (navigator.serviceWorker) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let reg of regs) {
            await reg.unregister();
          }
        }
        setTimeout(() => {
          window.location.reload(true);
        }, 500);
      });
    }
  }

  window.openEditCatalogueModal = function(id) {
    const item = catalogueMgr.getById(id);
    if (!item) return;

    document.getElementById('modal-catalogue-title').textContent = 'EDIT SERVICE';
    document.getElementById('cat-id-field').value = item.id;
    document.getElementById('cat-name').value = item.name;
    document.getElementById('cat-category').value = item.category || 'Traditional';
    document.getElementById('cat-price').value = item.price;
    document.getElementById('cat-desc').value = item.description || '';
    openModal('modal-catalogue');
  };

  window.confirmDeleteCatalogue = function(id) {
    const item = catalogueMgr.getById(id);
    if (!item) return;

    if (confirm(`Delete "${item.name}" from catalogue?`)) {
      catalogueMgr.deleteItem(id);
      Store.setCatalogue(catalogueMgr.getAll());
      showToast('Service removed from catalogue.', 'info');
      renderCatalogueList();
    }
  };

  // --------------------------------------------------------------------------
  // 10. MODAL UTILITIES
  // --------------------------------------------------------------------------
  function initModalCloseHandlers() {
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        closeModal(modalId);
      });
    });

    // Close on backdrop tap
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --------------------------------------------------------------------------
  // 11. PWA SERVICE WORKER REGISTRATION & UPDATE DETECTOR
  // --------------------------------------------------------------------------
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered:', reg.scope);

            // Handle updates
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    showToast('Update available! Tap "Refresh Cache" in Admin to apply.', 'info', 5000);
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }
  }

  // --------------------------------------------------------------------------
  // 12. INITIALIZATION ON DOM READY
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    Store.load();

    catalogueMgr = new window.CatalogueManager(Store.getCatalogue());
    invoiceEngine = new window.InvoiceEngine();
    if (window.QuotationEngine) {
      quotationEngine = new window.QuotationEngine();
    }

    initTabNavigation();
    initCalendarNavigation();
    initClientsTab();
    initClientFormEvents();
    initInvoiceModalEvents();
    initQuotationModalEvents();
    initAdminEvents();
    initModalCloseHandlers();

    // Initialize Google Drive sync module
    if (window.GDriveSync) {
      window.GDriveSync.init(Store);
    }

    // Register PWA Service Worker
    registerServiceWorker();

    // Initial Render
    renderDashboard();
  });

})();
