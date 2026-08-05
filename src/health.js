export function healthStatus(results = []) {
  if (!results.length) return 'unknown';
  const open = results.filter((result) => result.open).length;
  if (open === results.length) return 'online';
  if (open > 0) return 'degraded';
  return 'offline';
}
