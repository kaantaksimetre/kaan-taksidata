const pad = (value) => String(value).padStart(2, '0');

export function getComputerDateTime() {
  const now = new Date();
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return {
    local,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || `UTC${formatOffset(now.getTimezoneOffset())}`,
    display: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
}

export function formatStoredDateTime(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return String(value);
  const [, year, month, day, hour, minute, second = '00'] = match;
  return `${day}.${month}.${year} ${hour}:${minute}:${second}`;
}

function formatOffset(offsetMinutes) {
  const total = -offsetMinutes;
  const sign = total >= 0 ? '+' : '-';
  const abs = Math.abs(total);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
