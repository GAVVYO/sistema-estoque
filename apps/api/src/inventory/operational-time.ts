export const timezone = 'America/Sao_Paulo';
export function midnight(date: string) {
  const wall = Date.parse(date + 'T00:00:00Z');
  let instant = wall;
  // Resolve the timezone through ICU instead of depending on MySQL timezone tables.
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    const displayed = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    instant += wall - displayed;
  }
  return new Date(instant);
}
