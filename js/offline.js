const Offline = {
  isOnline: navigator.onLine,
  bannerEl: null,

  init() {
    this.createBanner();
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));
    if (!navigator.onLine) this.showBanner();
  },

  createBanner() {
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.className = 'offline-banner hidden';
    banner.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414"/></svg>
      <span id="offline-text">${I18n?.t('offline') || 'No internet connection'}</span>`;
    document.body.prepend(banner);
    this.bannerEl = banner;
  },

  setOnline(online) {
    this.isOnline = online;
    if (online) {
      this.hideBanner();
    } else {
      this.showBanner();
    }
  },

  showBanner() {
    if (!this.bannerEl) return;
    const text = this.bannerEl.querySelector('#offline-text');
    if (text) text.textContent = I18n?.t('offline') || 'No internet connection';
    this.bannerEl.classList.remove('hidden');
    this.bannerEl.style.transform = 'translateY(0)';
  },

  hideBanner() {
    if (!this.bannerEl) return;
    this.bannerEl.style.transform = 'translateY(-100%)';
    setTimeout(() => {
      this.bannerEl.classList.add('hidden');
    }, 300);
  },

  check() {
    return navigator.onLine;
  }
};
