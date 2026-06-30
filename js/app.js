const App = {
  currentPage: 'notes',
  currentNoteId: null,
  calYear: 0,
  calMonth: 0,
  selectedCalDate: null,
  viewMode: 'grid',
  searchQuery: '',
  autoSaveTimer: null,

  init() {
    I18n.init();
    Theme.init();
    Offline.init();

    const settings = Storage.getSettings();
    this.viewMode = settings.viewMode || 'grid';
    this.updateViewToggleIcon();

    const now = new Date();
    const pc = PersianCalendar.getCurrentPersianDate();
    this.calYear = pc.year;
    this.calMonth = pc.month;

    this.setupNavigation();
    this.setupEventListeners();
    this.startClock();

    this.showPage('notes');
    this.renderNotes();
    this.renderCalendar();
    this.renderSettings();
    this.updateAllTexts();
    Theme.updateIcon();
    this.applyFont(settings.font);
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        if (document.getElementById('app').classList.contains('search-expanded')) {
          this.collapseSearch();
        }
        if (document.getElementById('page-editor').classList.contains('active')) {
          this.closeEditor();
        }
        this.showPage(page);
      });
    });
  },

  setupEventListeners() {
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      const app = document.getElementById('app');
      app.classList.toggle('search-has-query', !!e.target.value.trim());
      this.renderNotes();
    });
    document.getElementById('search-input')?.addEventListener('focus', () => {
      document.getElementById('app').classList.add('search-expanded');
      document.querySelector('.page-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('search-close-btn')?.addEventListener('click', () => {
      this.collapseSearch();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('app').classList.contains('search-expanded')) {
        this.collapseSearch();
      }
    });
    document.getElementById('new-note-btn')?.addEventListener('click', () => this.createNewNote());

    document.getElementById('add-image')?.addEventListener('click', () => document.getElementById('image-input')?.click());
    document.getElementById('add-audio')?.addEventListener('click', () => document.getElementById('audio-input')?.click());
    document.getElementById('add-video')?.addEventListener('click', () => document.getElementById('video-input')?.click());

    document.getElementById('image-input')?.addEventListener('change', (e) => this.handleMedia(e, 'image'));
    document.getElementById('audio-input')?.addEventListener('change', (e) => this.handleMedia(e, 'audio'));
    document.getElementById('video-input')?.addEventListener('change', (e) => this.handleMedia(e, 'video'));

    document.getElementById('note-title')?.addEventListener('input', () => this.triggerAutoSave());
    document.getElementById('note-content')?.addEventListener('input', () => this.triggerAutoSave());

    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.closeEditor();
    });

    document.getElementById('delete-note-btn')?.addEventListener('click', () => this.confirmDeleteNote());
    document.getElementById('pin-note-btn')?.addEventListener('click', () => this.togglePinNote());
    document.getElementById('confirm-delete')?.addEventListener('click', () => this.executeDeleteNote());
    document.getElementById('cancel-delete')?.addEventListener('click', () => this.hideModal('delete-modal'));

    document.getElementById('confirm-event-delete')?.addEventListener('click', () => {
      if (this.pendingDeleteEventId) {
        Storage.deleteEvent(this.pendingDeleteEventId);
        this.pendingDeleteEventId = null;
        this.hideModal('delete-event-modal');
        this.renderCalendar();
      }
    });
    document.getElementById('cancel-event-delete')?.addEventListener('click', () => {
      this.pendingDeleteEventId = null;
      this.hideModal('delete-event-modal');
    });

    document.getElementById('cal-prev')?.addEventListener('click', () => this.changeMonth(-1));
    document.getElementById('cal-next')?.addEventListener('click', () => this.changeMonth(1));
    document.getElementById('cal-today')?.addEventListener('click', () => this.goToToday());

    document.getElementById('add-event-btn')?.addEventListener('click', () => this.showAddEvent());
    document.getElementById('save-event')?.addEventListener('click', () => this.saveEvent());
    document.getElementById('cancel-event')?.addEventListener('click', () => this.hideModal('event-modal'));

    document.getElementById('view-toggle')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      btn.classList.remove('animating');
      void btn.offsetWidth;
      btn.classList.add('animating');
      this.toggleViewMode();
    });
    document.getElementById('view-toggle')?.addEventListener('animationend', () => {
      document.getElementById('view-toggle')?.classList.remove('animating');
    });

    this.setupTextareaAutoResize();
  },

  setupTextareaAutoResize() {
    const textarea = document.getElementById('note-content');
    if (!textarea) return;
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    textarea.addEventListener('input', resize);
  },

  openEditor(originX = 0, originY = 0, callback) {
    const editor = document.getElementById('page-editor');
    document.querySelectorAll('.page').forEach(p => {
      if (p.id !== 'page-editor') p.classList.remove('active');
    });
    editor.classList.remove('active');
    editor.style.transition = 'none';
    editor.style.clipPath = `circle(0 at ${originX}px ${originY}px)`;
    editor.style.zIndex = '100';
    editor.style.pointerEvents = 'auto';
    void editor.offsetHeight;
    editor.style.transition = 'clip-path 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    editor.style.clipPath = `circle(200vmax at ${originX}px ${originY}px)`;
    editor.classList.add('active');
    this.currentPage = 'editor';
    document.getElementById('topbar-title').textContent = I18n.t('notes');
    if (callback) callback();
  },

  closeEditor() {
    const editor = document.getElementById('page-editor');
    if (!editor.classList.contains('active')) return;
    const backBtn = document.getElementById('back-btn');
    const rect = backBtn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    document.getElementById('page-notes')?.classList.add('active');
    editor.style.zIndex = '100';
    editor.style.pointerEvents = 'none';
    void editor.offsetHeight;
    editor.style.transition = 'clip-path 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    editor.style.clipPath = `circle(0 at ${x}px ${y}px)`;
    editor.classList.remove('active');
    setTimeout(() => {
      editor.style.transition = '';
      editor.style.clipPath = '';
      editor.style.zIndex = '';
      editor.style.pointerEvents = '';
      this.currentNoteId = null;
      this.currentPage = 'notes';
      document.getElementById('topbar-title').textContent = I18n.t('notes');
      this.renderNotes(true);
    }, 500);
  },

  showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
      pageEl.classList.add('active');
      pageEl.style.animation = 'none';
      void pageEl.offsetHeight;
      pageEl.style.animation = 'pageIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards';
    }
    this.currentPage = page;
    document.getElementById('topbar-title').textContent = I18n.t(page === 'notes' ? 'notes' : page === 'calendar' ? 'calendar' : 'settings');
  },

  startClock() {
    const update = () => {
      const now = new Date();
      const settings = Storage.getSettings();
      const hour12 = settings.use24hour === false;
      const time = now.toLocaleTimeString(I18n.lang === 'fa' ? 'fa-IR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12
      });
      const clock = document.getElementById('clock');
      if (clock) clock.textContent = time;
    };
    update();
    setInterval(update, 1000);
  },

  toggleLanguage() {
    const newLang = I18n.lang === 'fa' ? 'en' : 'fa';
    I18n.setLang(newLang);
    const settings = Storage.getSettings();
    settings.language = newLang;
    Storage.saveSettings(settings);
    this.updateAllTexts();
    Theme.updateIcon();
  },

  updateAllTexts() {
    document.querySelectorAll('.nav-label').forEach(el => {
      const page = el.closest('.nav-item')?.dataset?.page;
      if (page) el.textContent = I18n.t(page);
    });
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = I18n.t(el.dataset.i18n);
    });
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.placeholder = I18n.t('searchNotes');
    document.getElementById('topbar-title').textContent = I18n.t(this.currentPage);
    this.renderNotes();
    this.renderCalendar();
    this.renderSettings();
  },

  applyFont(fontName) {
    const fontMap = {
      vazirmatn: "'Vazirmatn', 'Segoe UI', system-ui, -apple-system, sans-serif",
      iranSans: "'Iranian Sans', 'Segoe UI', system-ui, -apple-system, sans-serif"
    };
    document.documentElement.style.setProperty('--font', fontMap[fontName] || fontMap.vazirmatn);
  },

  renderNotes(instant = false) {
    const container = document.getElementById('notes-container');
    if (!container) return;
    let notes = Storage.getNotes();
    const query = (this.searchQuery || '').trim();

    if (query) {
      const q = query.toLowerCase();
      notes = notes.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q)
      );
    }

    notes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    container.innerHTML = '';

    if (notes.length === 0) {
      if (query) {
        container.innerHTML = `
          <div class="empty-state" style="animation:fadeIn 0.3s ease-out">
            <svg class="w-20 h-20 opacity-20 mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto 1.5rem;display:block">
              <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
            <p class="text-xl font-medium opacity-60 mb-2">${I18n.t('noSearchResults')}</p>
            <p class="text-sm opacity-40">${I18n.t('noSearchResultsHint')}</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-state" style="animation:fadeIn 0.3s ease-out">
            <svg class="w-20 h-20 opacity-20 mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto 1.5rem;display:block">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
            </svg>
            <p class="text-xl font-medium opacity-60 mb-2">${I18n.t('noNotes')}</p>
            <p class="text-sm opacity-40">${I18n.t('noNotesHint')}</p>
          </div>
        `;
      }
      return;
    }

    const gridClass = this.viewMode === 'grid' ? 'note-grid' : 'note-list';
    const wrapper = document.createElement('div');
    wrapper.className = gridClass;

    notes.forEach((note, idx) => {
      const isPinned = note.pinned;
      const content = note.content || '';
      const q = query.toLowerCase();

      let preview = '';
      if (q && content.toLowerCase().includes(q)) {
        const idx = content.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 40);
        const end = Math.min(content.length, idx + q.length + 60);
        preview = (start > 0 ? '…' : '') + content.substring(start, end) + (end < content.length ? '…' : '');
      } else {
        preview = content.substring(0, 100);
      }

      const date = new Date(note.updatedAt || note.createdAt);
      const settings = Storage.getSettings();
      const hour12 = settings.use24hour === false;
      const dateStr = I18n.lang === 'fa'
        ? date.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12 })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12 });

      const card = document.createElement('div');
      card.className = instant ? 'note-card' : 'note-card animate-fade-in';
      if (!instant) card.style.animationDelay = `${idx * 70}ms`;
      card.dataset.id = note.id;
      card.addEventListener('click', () => this.openNote(note.id));

      let mediaIcons = '';
      if (note.mediaType) {
        const t = note.mediaType.split('/')[0];
        if (t === 'image') mediaIcons = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/></svg>';
        else if (t === 'audio') mediaIcons = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"/></svg>';
        else if (t === 'video') mediaIcons = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/></svg>';
      }

      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            ${isPinned ? '<span class="inline-block mr-1">📌</span>' : ''}
            <h3 class="font-semibold text-sm truncate">${note.title || I18n.t('newNote')}</h3>
            <p class="text-xs opacity-50 mt-1 line-clamp-2">${preview || ''}</p>
          </div>
        </div>
        <div class="flex items-center justify-between mt-3">
          <div class="flex items-center gap-2">
            ${mediaIcons ? `<span class="opacity-40">${mediaIcons}</span>` : ''}
          </div>
          <span class="text-[10px] opacity-40">${dateStr}</span>
        </div>
        <div class="card-actions">
          <button class="card-action-btn${isPinned ? ' pinned' : ''}" data-action="pin" title="${I18n.t(isPinned ? 'unpin' : 'pin')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5">
              <path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z"/>
            </svg>
          </button>
          <button class="card-action-btn card-action-delete" data-action="delete" title="${I18n.t('delete')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
            </svg>
          </button>
        </div>
      `;

      card.querySelector('[data-action="pin"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        note.pinned = !note.pinned;
        Storage.saveNote(note);
        this.renderNotes();
      });

      card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentNoteId = note.id;
        this.confirmDeleteNote();
      });

      wrapper.appendChild(card);
    });
    container.appendChild(wrapper);
  },

  openNote(id) {
    this.currentNoteId = id;
    const note = Storage.getNote(id);
    if (!note) return;
    document.getElementById('note-title').value = note.title || '';
    document.getElementById('note-content').value = note.content || '';
    document.getElementById('media-preview').innerHTML = '';
    if (note.mediaData) {
      this.renderMediaPreview(note.mediaData, note.mediaType);
    }
    const pinBtn = document.getElementById('pin-note-btn');
    if (pinBtn) {
      const svgTag = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">';
      const path = 'M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z';
      pinBtn.innerHTML = note.pinned
        ? svgTag + '<path d="' + path + '" fill="currentColor"/>' + '</svg>'
        : svgTag + '<path d="' + path + '" fill="none" stroke="currentColor" stroke-width="1.5"/>' + '</svg>';
    }
    const card = document.querySelector(`.note-card[data-id="${id}"]`);
    if (card) {
      const rect = card.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      this.openEditor(x, y);
    } else {
      this.openEditor(0, 0);
    }
  },

  createNewNote() {
    const note = Storage.saveNote({
      title: '',
      content: '',
      type: 'text',
      pinned: false,
      mediaData: null,
      mediaType: null
    });
    this.currentNoteId = note.id;
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
    document.getElementById('media-preview').innerHTML = '';
    this.openEditor(0, 0, () => {
      setTimeout(() => document.getElementById('note-title')?.focus(), 550);
    });
  },

  triggerAutoSave() {
    const title = document.getElementById('note-title')?.value || '';
    const content = document.getElementById('note-content')?.value || '';
    if (!this.currentNoteId) return;
    const note = {
      id: this.currentNoteId,
      title,
      content
    };
    const indicator = document.getElementById('save-indicator');
    if (indicator) indicator.textContent = I18n.t('saving');
    Storage.autoSave(note, (saved) => {
      if (indicator) indicator.textContent = I18n.t('saved');
      setTimeout(() => { if (indicator) indicator.textContent = ''; }, 1500);
    });
  },

  handleMedia(e, type) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target.result;
      const note = Storage.getNote(this.currentNoteId);
      if (note) {
        note.mediaData = data;
        note.mediaType = file.type;
        note.type = type;
        Storage.saveNote(note);
        this.renderMediaPreview(data, file.type);
        this.triggerAutoSave();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  },

  renderMediaPreview(data, mimeType) {
    const container = document.getElementById('media-preview');
    if (!container) return;
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'media-preview-wrap animate-scale-in';

    if (mimeType.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = data;
      wrapper.appendChild(img);
    } else if (mimeType.startsWith('audio/')) {
      const audio = document.createElement('audio');
      audio.src = data;
      audio.controls = true;
      wrapper.appendChild(audio);
    } else if (mimeType.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = data;
      video.controls = true;
      wrapper.appendChild(video);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'media-remove';
    removeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      container.innerHTML = '';
      const note = Storage.getNote(this.currentNoteId);
      if (note) {
        note.mediaData = null;
        note.mediaType = null;
        note.type = 'text';
        Storage.saveNote(note);
      }
    });
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
  },

  confirmDeleteNote() {
    document.getElementById('delete-modal')?.classList.add('open');
  },

  hideModal(id) {
    document.getElementById(id)?.classList.remove('open');
  },

  executeDeleteNote() {
    if (this.currentNoteId) {
      Storage.deleteNote(this.currentNoteId);
      this.hideModal('delete-modal');
      if (document.getElementById('page-editor').classList.contains('active')) {
        this.closeEditor();
      } else {
        this.showPage('notes');
        this.renderNotes();
      }
    }
  },

  togglePinNote() {
    if (!this.currentNoteId) return;
    const note = Storage.getNote(this.currentNoteId);
    if (!note) return;
    note.pinned = !note.pinned;
    Storage.saveNote(note);
    const btn = document.getElementById('pin-note-btn');
    if (btn) {
      const svgTag = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">';
      const path = 'M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z';
      btn.innerHTML = note.pinned
        ? svgTag + '<path d="' + path + '" fill="currentColor"/>' + '</svg>'
        : svgTag + '<path d="' + path + '" fill="none" stroke="currentColor" stroke-width="1.5"/>' + '</svg>';
      btn.classList.add('animating');
      btn.addEventListener('animationend', () => btn.classList.remove('animating'), { once: true });
    }
  },

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    const settings = Storage.getSettings();
    settings.viewMode = this.viewMode;
    Storage.saveSettings(settings);
    this.updateViewToggleIcon();
    this.renderNotes();
  },

  collapseSearch() {
    const app = document.getElementById('app');
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    this.searchQuery = '';
    app.classList.remove('search-has-query');
    app.classList.remove('search-expanded');
    app.classList.add('search-restoring');
    this.renderNotes(true);
    setTimeout(() => {
      app.classList.remove('search-restoring');
      input?.blur();
    }, 350);
  },

  updateViewToggleIcon() {
    const btn = document.getElementById('view-toggle');
    if (!btn) return;
    const svg = btn.querySelector('svg');
    if (!svg) return;
    svg.innerHTML = this.viewMode === 'list'
      ? '<path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>'
      : '<path d="M3.75 5.25h16.5M3.75 12h16.5m-16.5 6.75h16.5" stroke-linecap="round"/>';
  },

  renderCalendar() {
    const grid = document.getElementById('cal-grid');
    const header = document.getElementById('cal-header');
    if (!grid || !header) return;

    const mName = PersianCalendar.getPersianMonthName(this.calMonth);
    header.textContent = `${I18n.t(mName)} ${this.calYear}`;

    const weeks = PersianCalendar.getMonthGrid(this.calYear, this.calMonth);
    grid.innerHTML = '';

    const weekdaysHeader = document.createElement('div');
    weekdaysHeader.className = 'cal-weekdays';
    const weekdayNames = I18n.lang === 'fa'
      ? ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش']
      : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const weekdayOrder = I18n.lang === 'fa' ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];

    for (const order of weekdayOrder) {
      const day = document.createElement('div');
      day.className = 'cal-weekday';
      day.textContent = weekdayNames[order];
      weekdaysHeader.appendChild(day);
    }
    grid.appendChild(weekdaysHeader);

    const pc = PersianCalendar.getCurrentPersianDate();
    const isCurrentMonth = pc.year === this.calYear && pc.month === this.calMonth;

    const events = Storage.getEvents();
    const eventsByDate = {};
    events.forEach(e => {
      if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
      eventsByDate[e.date].push(e);
    });

    weeks.forEach(week => {
      const row = document.createElement('div');
      row.className = 'cal-week';
      const displayOrder = I18n.lang === 'fa' ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];

      for (const order of displayOrder) {
        const cell = document.createElement('div');
        const day = week[order];
        if (day === 0) {
          cell.className = 'cal-cell empty';
        } else {
          const dateStr = PersianCalendar.formatPersianDateShort(this.calYear, this.calMonth, day);
          const hasEvent = !!eventsByDate[dateStr];
          const isToday = isCurrentMonth && pc.day === day;

          cell.className = `cal-cell ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`;
          cell.dataset.date = dateStr;
          cell.dataset.day = day;

          cell.innerHTML = `
            <span class="cal-day-num ${isToday ? 'today' : ''}">${day}</span>
            ${hasEvent ? '<span class="cal-dot"></span>' : ''}
          `;

          cell.addEventListener('click', () => {
            document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            this.selectedCalDate = { year: this.calYear, month: this.calMonth, day, dateStr };
            this.showDayEvents(dateStr);
          });
        }
        row.appendChild(cell);
      }
      grid.appendChild(row);
    });

    if (isCurrentMonth && pc.day) {
      const todayStr = PersianCalendar.formatPersianDateShort(pc.year, pc.month, pc.day);
      const selected = this.selectedCalDate?.dateStr;
      if (!selected || !document.querySelector(`[data-date="${selected}"]`)) {
        this.selectedCalDate = { year: pc.year, month: pc.month, day: pc.day, dateStr: todayStr };
        this.showDayEvents(todayStr);
      } else {
        document.querySelectorAll('.cal-cell').forEach(c => {
          if (c.dataset.date === selected) c.classList.add('selected');
        });
        this.showDayEvents(selected);
      }
    } else {
      const container = document.getElementById('day-events');
      const title = document.getElementById('day-events-title');
      if (container) container.innerHTML = `<p class="text-sm opacity-40 text-center py-6">${I18n.t('noEvents')}</p>`;
      if (title) title.textContent = '';
    }
  },

  showDayEvents(dateStr) {
    const container = document.getElementById('day-events');
    const title = document.getElementById('day-events-title');
    if (!container || !title) return;

    const parsed = PersianCalendar.parsePersianDate(dateStr);
    if (!parsed) return;
    title.textContent = PersianCalendar.formatPersianDate(parsed.year, parsed.month, parsed.day);

    const events = Storage.getEventsForDate(dateStr);
    container.innerHTML = '';

    if (events.length === 0) {
      container.innerHTML = `<p class="text-sm opacity-40 text-center py-6">${I18n.t('noEvents')}</p>`;
      return;
    }

    events.forEach(ev => {
      const div = document.createElement('div');
      div.className = 'event-item';
      div.innerHTML = `
        <div class="event-info">
          <span class="event-color" style="background: ${ev.color || '#6366f1'}"></span>
          <div>
            <p class="event-title">${ev.title}</p>
            ${ev.time ? `<p class="event-time">${ev.time}</p>` : ''}
          </div>
        </div>
        <button class="event-delete" data-id="${ev.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      `;
      div.querySelector('.event-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pendingDeleteEventId = ev.id;
        document.getElementById('delete-event-modal')?.classList.add('open');
      });
      container.appendChild(div);
    });
  },

  changeMonth(delta) {
    this.calMonth += delta;
    if (this.calMonth > 12) { this.calMonth = 1; this.calYear++; }
    if (this.calMonth < 1) { this.calMonth = 12; this.calYear--; }
    this.renderCalendar();
  },

  goToToday() {
    const pc = PersianCalendar.getCurrentPersianDate();
    this.calYear = pc.year;
    this.calMonth = pc.month;
    this.renderCalendar();
  },

  showAddEvent() {
    if (!this.selectedCalDate) {
      const pc = PersianCalendar.getCurrentPersianDate();
      this.selectedCalDate = {
        dateStr: PersianCalendar.formatPersianDateShort(pc.year, pc.month, pc.day)
      };
    }
    document.getElementById('event-date').textContent = this.selectedCalDate.dateStr || '';
    document.getElementById('event-title-input').value = '';
    document.getElementById('event-time-input').value = '';
    document.getElementById('event-color-input').value = '#6366f1';
    document.getElementById('event-modal')?.classList.add('open');
  },

  saveEvent() {
    const title = document.getElementById('event-title-input')?.value?.trim();
    if (!title) return;
    const ev = {
      title,
      date: this.selectedCalDate?.dateStr || PersianCalendar.formatPersianDateShort(
        PersianCalendar.getCurrentPersianDate().year,
        PersianCalendar.getCurrentPersianDate().month,
        PersianCalendar.getCurrentPersianDate().day
      ),
      time: document.getElementById('event-time-input')?.value || '',
      color: document.getElementById('event-color-input')?.value || '#6366f1'
    };
    Storage.saveEvent(ev);
    this.hideModal('event-modal');
    this.renderCalendar();
  },

  renderSettings() {
    const container = document.getElementById('settings-content');
    if (!container) return;

    const isDark = Theme.current === 'dark';
    const currentLang = I18n.lang;
    const settings = Storage.getSettings();

    container.innerHTML = `
      <div class="flex-col gap-4 animate-fade-in" style="display:flex">
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-row-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                ${isDark
                  ? '<path d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>'
                  : '<path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>'
                }
              </svg>
              <span class="theme-label setting-row-text">${I18n.t(isDark ? 'darkMode' : 'lightMode')}</span>
            </div>
            <button id="settings-theme" class="toggle ${isDark ? 'on' : 'off'}"><span class="toggle-knob"></span></button>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-row-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="setting-row-text">${I18n.t('timeFormat') || 'Time Format'}</span>
            </div>
          </div>
          <div class="flex gap-2 mt-2">
            <button class="lang-btn ${settings.use24hour !== false ? 'active' : ''}" data-format="24">24h</button>
            <button class="lang-btn ${settings.use24hour === false ? 'active' : ''}" data-format="12">12h (AM/PM)</button>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-row-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/>
              </svg>
              <span class="setting-row-text">${I18n.t('language')}</span>
            </div>
          </div>
          <div class="flex gap-2 mt-2">
            <button class="lang-btn ${currentLang === 'fa' ? 'active' : ''}" data-lang="fa">${I18n.t('persian')}</button>
            <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">${I18n.t('english')}</button>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-row-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3.75 4.5h16.5M3.75 9h16.5M3.75 13.5h16.5M3.75 18h10.5"/>
              </svg>
              <span class="setting-row-text">${I18n.t('font') || 'Font'}</span>
            </div>
          </div>
          <div class="flex gap-2 mt-2">
            <button class="lang-btn ${(settings.font || 'vazirmatn') === 'vazirmatn' ? 'active' : ''}" data-font="vazirmatn">${I18n.t('vazirmatn')}</button>
            <button class="lang-btn ${settings.font === 'iranSans' ? 'active' : ''}" data-font="iranSans">${I18n.t('iranSans')}</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#settings-theme')?.addEventListener('click', () => {
      Theme.toggle();
      this.renderSettings();
    });

    container.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        I18n.setLang(lang);
        const settings = Storage.getSettings();
        settings.language = lang;
        Storage.saveSettings(settings);
        this.updateAllTexts();
        this.renderSettings();
      });
    });

    container.querySelectorAll('.lang-btn[data-format]').forEach(btn => {
      btn.addEventListener('click', () => {
        const settings = Storage.getSettings();
        settings.use24hour = btn.dataset.format === '24';
        Storage.saveSettings(settings);
        this.renderSettings();
        this.renderNotes();
      });
    });

    container.querySelectorAll('.lang-btn[data-font]').forEach(btn => {
      btn.addEventListener('click', () => {
        const settings = Storage.getSettings();
        settings.font = btn.dataset.font;
        Storage.saveSettings(settings);
        this.applyFont(settings.font);
        this.renderSettings();
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
