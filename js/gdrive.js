// RXT Productions - Google Drive Cloud Backup & Sync Engine
// Architecture proven in BuilderMate & NDS projects

const DEFAULT_GDRIVE_CLIENT_ID = '434441892966-203633m5fa73di5u7al48o4niilu1obh.apps.googleusercontent.com';
const GDRIVE_AUTH_STORAGE_KEY = 'rxt_gdrive_auth_v1';
const GDRIVE_BACKUP_FILENAME = 'RXT_Productions_Backup.json';

const GDriveSync = {
  clientId: DEFAULT_GDRIVE_CLIENT_ID,
  fileName: GDRIVE_BACKUP_FILENAME,
  scopes: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
  tokenClient: null,
  accessToken: null,
  tokenExpiresAt: 0,
  isSyncing: false,
  autoSyncTimer: null,

  init(store) {
    this.store = store;

    // Load persisted token from localStorage if valid
    try {
      const savedAuth = localStorage.getItem(GDRIVE_AUTH_STORAGE_KEY);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed.accessToken && parsed.tokenExpiresAt > Date.now()) {
          this.accessToken = parsed.accessToken;
          this.tokenExpiresAt = parsed.tokenExpiresAt;
        }
      }
    } catch (e) {}

    // Initialize GIS Token Client if Google Accounts API script is loaded
    this.setupGisClient();

    // Trigger initial silent sync if connected
    setTimeout(() => {
      if (this.isConnected()) {
        this.handleInitialSync();
      }
    }, 2000);
  },

  setupGisClient() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      try {
        const emailHint = (this.store && this.store.getSettings().gdrive && this.store.getSettings().gdrive.userEmail) || '';
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scopes,
          hint: emailHint,
          callback: async (resp) => {
            if (resp.error) {
              console.error('[GDrive] Auth error:', resp.error);
              if (window.showToast) window.showToast('Google Drive authentication failed.', 'error');
              return;
            }
            this.accessToken = resp.access_token;
            this.tokenExpiresAt = Date.now() + (Number(resp.expires_in) || 3500) * 1000;
            this.saveAuthStorage();

            const email = await this.fetchUserEmail(this.accessToken);
            const cur = this.store.getSettings().gdrive || {};
            this.store.updateSettings({
              gdrive: {
                ...cur,
                isConnected: true,
                userEmail: email || cur.userEmail || 'Google Account',
                autoSync: cur.autoSync !== false
              }
            });

            if (window.showToast) window.showToast(`Connected to Google Drive (${email || 'Account'})! ☁️`, 'success');
            if (window.renderAdminTab) window.renderAdminTab();
            this.handleInitialSync();
          }
        });
      } catch (e) {
        console.warn('[GDrive] GIS initialization warning:', e);
      }
    }
  },

  saveAuthStorage() {
    try {
      if (this.accessToken) {
        localStorage.setItem(GDRIVE_AUTH_STORAGE_KEY, JSON.stringify({
          accessToken: this.accessToken,
          tokenExpiresAt: this.tokenExpiresAt
        }));
      } else {
        localStorage.removeItem(GDRIVE_AUTH_STORAGE_KEY);
      }
    } catch (e) {}
  },

  isConnected() {
    const gdriveSettings = (this.store && this.store.getSettings().gdrive) || {};
    return !!gdriveSettings.isConnected;
  },

  async fetchUserEmail(token) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.email;
      }
    } catch (e) {}
    return '';
  },

  connect(forceSelect = true) {
    if (!window.google || !window.google.accounts) {
      if (window.showToast) window.showToast('Google Identity Services is loading. Please try again.', 'info');
      return;
    }
    if (!this.tokenClient) {
      this.setupGisClient();
    }
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: forceSelect ? 'select_account' : '' });
    }
  },

  disconnect() {
    if (this.accessToken && window.google && window.google.accounts) {
      try {
        google.accounts.oauth2.revoke(this.accessToken, () => {});
      } catch (e) {}
    }
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.saveAuthStorage();

    const cur = (this.store && this.store.getSettings().gdrive) || {};
    this.store.updateSettings({
      gdrive: {
        ...cur,
        isConnected: false,
        userEmail: '',
        lastSyncedAt: ''
      }
    });

    if (window.showToast) window.showToast('Disconnected from Google Drive', 'info');
    if (window.renderAdminTab) window.renderAdminTab();
  },

  async ensureValidToken(allowPrompt = false) {
    if (this.accessToken && Date.now() < (this.tokenExpiresAt - 45000)) {
      return this.accessToken;
    }

    return new Promise((resolve) => {
      if (!this.tokenClient) this.setupGisClient();
      if (!this.tokenClient) return resolve(null);

      const timeout = setTimeout(() => resolve(null), 8000);
      this.tokenClient.callback = (resp) => {
        clearTimeout(timeout);
        if (resp && resp.access_token) {
          this.accessToken = resp.access_token;
          this.tokenExpiresAt = Date.now() + (Number(resp.expires_in) || 3500) * 1000;
          this.saveAuthStorage();
          resolve(this.accessToken);
        } else {
          resolve(null);
        }
      };

      try {
        const email = (this.store && this.store.getSettings().gdrive && this.store.getSettings().gdrive.userEmail) || '';
        this.tokenClient.requestAccessToken({ prompt: allowPrompt ? 'select_account' : '', hint: email });
      } catch (e) {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  },

  async findRemoteFile(token) {
    try {
      const q = encodeURIComponent(`name = '${this.fileName}' and trashed = false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder,drive&q=${q}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) return data.files[0];
      }
    } catch (e) {}
    return null;
  },

  async uploadData(showNotification = false, allowPrompt = false) {
    if (this.isSyncing) return;
    if (!this.isConnected()) return;

    this.isSyncing = true;
    this.updateStatusVisuals('syncing');

    try {
      const token = await this.ensureValidToken(allowPrompt);
      if (!token) {
        this.isSyncing = false;
        this.updateStatusVisuals('connected');
        return;
      }

      const existing = await this.findRemoteFile(token);
      const dataToSync = this.store.exportFullData();
      const contentBlob = new Blob([JSON.stringify(dataToSync, null, 2)], { type: 'application/json' });

      let response;
      if (existing) {
        response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: contentBlob
        });
      } else {
        const metadata = { name: this.fileName, parents: ['appDataFolder'], mimeType: 'application/json' };
        const boundary = '-------rxtprod31415926535';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        const body = delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) + delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(dataToSync, null, 2) +
          close_delim;

        response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/related; boundary=' + boundary
          },
          body: body
        });
      }

      if (response && response.ok) {
        const nowIso = new Date().toISOString();
        const cur = this.store.getSettings().gdrive || {};
        this.store.updateSettings({
          gdrive: { ...cur, lastSyncedAt: nowIso }
        });
        if (showNotification && window.showToast) {
          window.showToast('☁️ RXT Productions cloud data backed up to Google Drive!', 'success');
        }
      }
    } catch (e) {
      console.warn('[GDrive] Sync error:', e);
    } finally {
      this.isSyncing = false;
      this.updateStatusVisuals('connected');
      if (window.renderAdminTab) window.renderAdminTab();
    }
  },

  async downloadRemoteData() {
    const token = await this.ensureValidToken(true);
    if (!token) throw new Error('Google Drive authorization required.');
    const file = await this.findRemoteFile(token);
    if (!file) throw new Error('No cloud backup found on your Google Drive yet.');
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  },

  async restoreFromCloud() {
    try {
      if (window.showToast) window.showToast('Fetching backup from Google Drive...', 'info', 2000);
      const remoteData = await this.downloadRemoteData();
      if (!remoteData || !remoteData.clients) {
        throw new Error('Invalid backup data received.');
      }
      
      const confirmRestore = confirm(
        `Restore ${remoteData.clients.length || 0} clients and ${remoteData.catalogue?.length || 0} catalogue services from Google Drive?\n(This will merge/update your local data)`
      );

      if (confirmRestore) {
        this.store.importFullData(remoteData);
        if (window.showToast) window.showToast('🎉 Restored data from Google Drive successfully!', 'success');
        if (window.renderCurrentTab) window.renderCurrentTab();
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'Error restoring from Google Drive', 'error');
    }
  },

  async handleInitialSync() {
    try {
      const token = await this.ensureValidToken(false);
      if (!token) return;
      const remoteFile = await this.findRemoteFile(token);
      if (remoteFile && this.store.getClients().length === 0) {
        if (confirm('Found existing RXT Productions backup on your Google Drive. Restore now?')) {
          this.restoreFromCloud();
          return;
        }
      }
      this.uploadData(false);
    } catch (e) {}
  },

  triggerAutoSync() {
    const gdriveSettings = (this.store && this.store.getSettings().gdrive) || {};
    if (!gdriveSettings.isConnected || gdriveSettings.autoSync === false) return;

    if (this.autoSyncTimer) clearTimeout(this.autoSyncTimer);
    this.autoSyncTimer = setTimeout(() => {
      this.uploadData(false);
    }, 3000);
  },

  updateStatusVisuals(status) {
    const icon = document.getElementById('header-sync-status');
    if (!icon) return;

    icon.classList.remove('synced', 'syncing');
    if (status === 'syncing') {
      icon.classList.add('syncing');
      icon.title = 'Syncing with Google Drive...';
    } else if (this.isConnected()) {
      icon.classList.add('synced');
      icon.title = 'Google Drive Connected';
    } else {
      icon.title = 'Google Drive Disconnected';
    }
  }
};

window.GDriveSync = GDriveSync;
