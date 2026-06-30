const PersianCalendar = {
  persianMonthNames: [
    'farvardin', 'ordibehesht', 'khordad', 'tir', 'mordad', 'shahrivar',
    'mehr', 'aban', 'azar', 'dey', 'bahman', 'esfand'
  ],

  persianWeekdayNames: [
    'jome', 'shanbe', 'yekshanbe', 'doshanbe', 'seshanbe', 'chaharshanbe', 'panjshanbe'
  ],

  gregorianToPersian(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    gy = Math.floor(gy); gm = Math.floor(gm); gd = Math.floor(gd);
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    let jy = -1595 + (40 * Math.floor(days / 14610));
    days %= 14610;
    jy += Math.floor(days / 365);
    days %= 365;
    let jm, jd;
    if (days < 186) {
      jm = 1 + Math.floor(days / 31);
      jd = 1 + (days % 31);
    } else {
      jm = 7 + Math.floor((days - 186) / 30);
      jd = 1 + ((days - 186) % 30);
    }
    return [jy, jm, jd];
  },

  persianToGregorian(jy, jm, jd) {
    jy = Math.floor(jy); jm = Math.floor(jm); jd = Math.floor(jd);
    let days = (jy - 1) * 365;
    for (let i = 1; i < jy; i++) {
      if (this.isLeapYear(i)) days++;
    }
    const monthDays = jm <= 6 ? 31 : 30;
    const lastMonthDays = this.isLeapYear(jy) ? 30 : 29;
    for (let i = 1; i < jm; i++) {
      if (i <= 6) days += 31;
      else if (i < 12) days += 30;
      else days += lastMonthDays;
    }
    days += jd;
    const base = 226894;
    days += base;
    let gy = Math.floor(days / 365.25);
    let remaining = days - Math.floor(gy * 365.25);
    remaining = Math.round(remaining);
    const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) g_days_in_month[1] = 29;
    let gm = 1;
    for (const daysInMonth of g_days_in_month) {
      if (remaining <= daysInMonth) break;
      remaining -= daysInMonth;
      gm++;
    }
    return [gy, gm, remaining];
  },

  isLeapYear(jy) {
    const remain = jy % 33;
    return remain === 1 || remain === 5 || remain === 9 || remain === 13 || remain === 17 || remain === 22 || remain === 26 || remain === 30;
  },

  getCurrentPersianDate() {
    const now = new Date();
    const [y, m, d] = this.gregorianToPersian(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
    return { year: y, month: m, day: d };
  },

  getPersianMonthName(month) {
    return this.persianMonthNames[(month - 1) % 12] || '';
  },

  getPersianWeekdayName(dayIndex) {
    return this.persianWeekdayNames[dayIndex % 7] || '';
  },

  getMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm < 12) return 30;
    return this.isLeapYear(jy) ? 30 : 29;
  },

  getMonthGrid(jy, jm) {
    const [gy, gm, gd] = this.persianToGregorian(jy, jm, 1);
    const firstDay = new Date(gy, gm - 1, gd).getDay();
    const monthLength = this.getMonthLength(jy, jm);
    const weeks = [];
    let week = new Array(7).fill(0);
    for (let d = 1; d <= monthLength; d++) {
      const dayOfWeek = (firstDay + d - 1) % 7;
      week[dayOfWeek] = d;
      if (dayOfWeek === 6 || d === monthLength) {
        weeks.push([...week]);
        week = new Array(7).fill(0);
      }
    }
    return weeks;
  },

  formatPersianDate(jy, jm, jd) {
    const mName = this.getPersianMonthName(jm);
    const lang = I18n?.lang || 'fa';
    if (lang === 'fa') {
      return `${jd} ${I18n?.t(mName) || mName} ${jy}`;
    }
    return `${I18n?.t(mName) || mName} ${jd}, ${jy}`;
  },

  formatPersianDateShort(jy, jm, jd) {
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  },

  parsePersianDate(str) {
    const parts = str.split('/').map(Number);
    if (parts.length === 3) return { year: parts[0], month: parts[1], day: parts[2] };
    return null;
  }
};
