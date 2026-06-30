const Storage = {
  NOTES_KEY: 'vtodo_notes',
  EVENTS_KEY: 'vtodo_events',
  SETTINGS_KEY: 'vtodo_settings',

  _debounceTimers: {},

  getNotes() {
    try {
      return JSON.parse(localStorage.getItem(this.NOTES_KEY) || '[]');
    } catch { return []; }
  },

  saveNote(note) {
    const notes = this.getNotes();
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) {
      notes[idx] = { ...notes[idx], ...note, updatedAt: new Date().toISOString() };
    } else {
      note.id = note.id || crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
      note.createdAt = note.createdAt || new Date().toISOString();
      note.updatedAt = new Date().toISOString();
      notes.unshift(note);
    }
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(notes));
    return note;
  },

  deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id);
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(notes));
  },

  getNote(id) {
    return this.getNotes().find(n => n.id === id) || null;
  },

  getEvents() {
    try {
      let events = JSON.parse(localStorage.getItem(this.EVENTS_KEY) || '[]');
      let migrated = false;
      events = events.map(e => {
        if (!e.id) { e.id = crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2); migrated = true; }
        return e;
      });
      if (migrated) localStorage.setItem(this.EVENTS_KEY, JSON.stringify(events));
      return events;
    } catch { return []; }
  },

  saveEvent(event) {
    const events = this.getEvents();
    const idx = events.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      events[idx] = { ...events[idx], ...event };
    } else {
      event.id = event.id || crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
      events.push(event);
    }
    localStorage.setItem(this.EVENTS_KEY, JSON.stringify(events));
    return event;
  },

  deleteEvent(id) {
    const events = this.getEvents().filter(e => e.id !== id);
    localStorage.setItem(this.EVENTS_KEY, JSON.stringify(events));
  },

  getEventsForDate(persianDate) {
    return this.getEvents().filter(e => e.date === persianDate);
  },

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}');
    } catch { return {}; }
  },

  saveSettings(settings) {
    const current = this.getSettings();
    const merged = { ...current, ...settings };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  },

  autoSave(note, callback) {
    const key = note.id || 'new';
    if (this._debounceTimers[key]) clearTimeout(this._debounceTimers[key]);
    this._debounceTimers[key] = setTimeout(() => {
      const saved = this.saveNote(note);
      if (callback) callback(saved);
      delete this._debounceTimers[key];
    }, 400);
  },

  exportAll() {
    return {
      notes: this.getNotes(),
      events: this.getEvents(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    };
  },

  importAll(data) {
    if (data.notes) localStorage.setItem(this.NOTES_KEY, JSON.stringify(data.notes));
    if (data.events) localStorage.setItem(this.EVENTS_KEY, JSON.stringify(data.events));
    if (data.settings) localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(data.settings));
  }
};
