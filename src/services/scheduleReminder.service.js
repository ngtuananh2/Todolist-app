const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Schedule, Todo } = require('../config/database');

const TIME_ZONE = process.env.SCHEDULE_TIMEZONE || 'Asia/Ho_Chi_Minh';
const EMAIL_TO = process.env.EMAIL_TO || 'ntuananh201205@gmail.com';
const DAY_BY_ENGLISH = {
  Mon: 'Thứ 2',
  Tue: 'Thứ 3',
  Wed: 'Thứ 4',
  Thu: 'Thứ 5',
  Fri: 'Thứ 6',
  Sat: 'Thứ 7',
  Sun: 'Chủ nhật'
};

let transport;
let isChecking = false;

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transport;
}

function getCurrentScheduleTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    day: DAY_BY_ENGLISH[values.weekday],
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`
  };
}

function getCurrentWallClock(date = new Date()) {
  const current = getCurrentScheduleTime(date);
  return `${current.date}T${current.time}`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function getOccurrenceKey(date, source, stableId) {
  return crypto.createHash('sha256').update(`${date}|${source}|${stableId}`).digest('hex');
}

async function sendEmailReminder({ subject, title, details, note = '' }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransport().sendMail({
    from,
    to: EMAIL_TO,
    subject: `[TaskFlow] ${subject.replace(/[\r\n]+/g, ' ').slice(0, 180)}`,
    text: `${title}\n${details}${note ? `\nGhi chú: ${note}` : ''}`,
    html: `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(details)}</p>${note ? `<p>Ghi chú: ${escapeHtml(note)}</p>` : ''}`
  });
}

function getDueDeadline(deadline, now = new Date()) {
  if (!deadline) return null;
  const deadlineText = String(deadline);
  const localMatch = deadlineText.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  let difference;

  if (localMatch && !/(Z|[+-]\d{2}:?\d{2})$/i.test(deadlineText)) {
    const deadlineWallClock = `${localMatch[1]}T${localMatch[2]}:${localMatch[3]}`;
    difference = Date.parse(`${getCurrentWallClock(now)}:00Z`) - Date.parse(`${deadlineWallClock}:00Z`);
  } else {
    const timestamp = new Date(deadlineText).getTime();
    if (!Number.isFinite(timestamp)) return null;
    difference = now.getTime() - timestamp;
  }

  return difference >= 0 && difference <= 15 * 60 * 1000 ? difference : null;
}

async function checkDueTodoDeadlines(now = new Date()) {
  const todos = await Todo.find({ completed: false, deadline: { $ne: null }, deadlineReminderSentAt: null })
    .select('title description deadline')
    .lean();

  for (const todo of todos) {
    if (getDueDeadline(todo.deadline, now) === null) continue;
    await sendEmailReminder({
      subject: `Đến hạn công việc: ${todo.title}`,
      title: `Đã đến hạn: ${todo.title}`,
      details: `Deadline: ${todo.deadline}`,
      note: todo.description || ''
    });
    await Todo.updateOne(
      { _id: todo._id, deadlineReminderSentAt: null },
      { $set: { deadlineReminderSentAt: new Date() } }
    );
    console.log(`📧 Đã gửi nhắc deadline Todo tới ${EMAIL_TO}`);
  }
}

function isDueScheduleItem(item, currentTime) {
  const scheduledTime = String(item?.time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!scheduledTime) return false;
  const scheduledMinutes = Number(scheduledTime[1]) * 60 + Number(scheduledTime[2]);
  const currentMinutes = Number(currentTime.time.slice(0, 2)) * 60 + Number(currentTime.time.slice(3));
  const minutesLate = currentMinutes - scheduledMinutes;
  return minutesLate >= 0 && minutesLate <= 15;
}

function getMultiDayDate(day, now) {
  if (day.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(day.dateKey)) return day.dateKey;
  const currentDateLabel = new Date(`${now.date}T12:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit'
  });
  return day.date === currentDateLabel ? now.date : null;
}

async function checkDueScheduleItems(nowDate = new Date()) {
  const schedule = await Schedule.findOne({ key: 'main' }).lean();
  if (!schedule?.data) return;

  const now = getCurrentScheduleTime(nowDate);
  const scheduledItems = [];
  const data = schedule.data;

  if (data._mode === 'weekly' && data.weekly) {
    (data.weekly[now.day] || []).forEach(item => {
      scheduledItems.push({ item, date: now.date, day: now.day, source: `weekly:${now.day}` });
    });
  } else if (data._mode === 'multi' && Array.isArray(data.days)) {
    data.days.forEach((day, index) => {
      const date = getMultiDayDate(day, now);
      if (!date || date !== now.date) return;
      (day.schedule || []).forEach(item => {
        scheduledItems.push({ item, date, day: day.date, source: `multi:${date}` });
      });
    });
  } else if (Array.isArray(data.schedule)) {
    const date = data.scheduleDate || now.date;
    if (date === now.date) {
      data.schedule.forEach(item => {
        scheduledItems.push({ item, date, day: now.day, source: `single:${date}` });
      });
    }
  }

  const sentOccurrences = { ...(schedule.sentOccurrences || {}) };
  const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const [k, ts] of Object.entries(sentOccurrences)) {
    if (new Date(ts).getTime() < cutoffTime) {
      delete sentOccurrences[k];
    }
  }
  for (const entry of scheduledItems) {
    const { item, date, day, source } = entry;
    const type = String(item.type || 'task').split('|')[0].trim();
    if (type !== 'task' || !isDueScheduleItem(item, now)) continue;
    const stableId = item._wid || `${item.time || ''}|${item.title || ''}`;
    const occurrenceKey = getOccurrenceKey(date, source, stableId);
    if (sentOccurrences[occurrenceKey]) continue;

    await sendEmailReminder({
      subject: `Đến giờ: ${item.title || 'Hoạt động'}`,
      title: `Đã đến giờ: ${item.title || 'Hoạt động'}`,
      details: `Thời gian: ${item.time || '--:--'}, ${day} (${date})`,
      note: item.note || ''
    });
    sentOccurrences[occurrenceKey] = new Date().toISOString();
    await Schedule.updateOne({ key: 'main' }, { $set: { sentOccurrences } });
    console.log(`📧 Đã gửi nhắc lịch tới ${EMAIL_TO}`);
  }
}

async function checkDueReminders(now = new Date()) {
  if (isChecking || !isEmailConfigured()) return;
  isChecking = true;
  try {
    await checkDueTodoDeadlines(now);
    await checkDueScheduleItems(now);
  } catch (err) {
    console.error('❌ Gửi email nhắc việc thất bại:', err.message);
  } finally {
    isChecking = false;
  }
}

function startScheduleReminderWorker() {
  if (!isEmailConfigured()) {
    console.warn('⚠️ Email nhắc lịch chưa bật: hãy cấu hình SMTP_HOST, SMTP_USER và SMTP_PASS trong .env');
    return null;
  }

  console.log(`📧 Email nhắc lịch đang hoạt động (${TIME_ZONE}) tới ${EMAIL_TO}`);
  checkDueReminders();
  return setInterval(checkDueReminders, 15000);
}

module.exports = { checkDueReminders, checkDueScheduleItems, checkDueTodoDeadlines, getDueDeadline, isEmailConfigured, startScheduleReminderWorker };