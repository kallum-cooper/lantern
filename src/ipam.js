function assertIpv4(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
}

export function ipToNumber(ip) {
  assertIpv4(ip);
  return ip.split('.').reduce((value, part) => (value * 256) + Number(part), 0);
}

export function numberToIp(number) {
  if (!Number.isInteger(number) || number < 0 || number > 4294967295) throw new Error('Invalid IPv4 number');
  return [24, 16, 8, 0].map((shift) => (number >>> shift) & 255).join('.');
}

export function cidrInfo(cidr) {
  const [ip, prefixText] = String(cidr).split('/');
  const prefix = Number(prefixText);
  assertIpv4(ip);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error(`Invalid CIDR: ${cidr}`);
  const total = 2 ** (32 - prefix);
  const mask = prefix === 0 ? 0 : (4294967295 << (32 - prefix)) >>> 0;
  const networkNumber = (ipToNumber(ip) & mask) >>> 0;
  return {
    cidr,
    prefix,
    network: numberToIp(networkNumber),
    broadcast: numberToIp(networkNumber + total - 1),
    total,
    usable: prefix >= 31 ? 0 : total - 2,
  };
}

export function isIpInCidr(ip, cidr) {
  const info = cidrInfo(cidr);
  const value = ipToNumber(ip);
  return value >= ipToNumber(info.network) && value <= ipToNumber(info.broadcast);
}

export function nextAvailableIp(cidr, usedIps = []) {
  const info = cidrInfo(cidr);
  if (info.usable === 0) return null;
  const used = new Set(usedIps);
  const start = ipToNumber(info.network) + 1;
  const end = ipToNumber(info.broadcast) - 1;
  for (let value = start; value <= end; value += 1) {
    const candidate = numberToIp(value);
    if (!used.has(candidate)) return candidate;
  }
  return null;
}

export function usableIps(cidr) {
  const info = cidrInfo(cidr);
  if (info.usable === 0) return [];
  const start = ipToNumber(info.network) + 1;
  const end = ipToNumber(info.broadcast) - 1;
  return Array.from({ length: end - start + 1 }, (_, index) => numberToIp(start + index));
}
