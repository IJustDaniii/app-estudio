export function localDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function dateOnlyForLocalDay(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
