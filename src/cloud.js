const resourceTypes = new Map([
  ['ec2', 'EC2'], ['instance', 'EC2'], ['ec2:instance', 'EC2'], ['rds', 'RDS'], ['database', 'RDS'], ['rds:db', 'RDS'],
  ['s3', 'S3'], ['bucket', 'S3'], ['s3:bucket', 'S3'], ['load-balancer', 'Load Balancer'], ['load_balancer', 'Load Balancer'],
  ['lambda:function', 'Lambda'],
  ['vpc', 'VPC'], ['subnet', 'Subnet'], ['lambda', 'Lambda'], ['eks', 'EKS'], ['cluster', 'EKS'],
]);

const text = (value) => String(value ?? '').trim();
const lower = (value) => text(value).toLowerCase();

export function cloudResourceKey(resource = {}) {
  return `${lower(resource.provider)}:${text(resource.accountId)}:${text(resource.region)}:${normalizeResourceType(resource.resourceType)}:${text(resource.resourceId)}`;
}

export function normalizeResourceType(value) {
  const normalized = lower(value).replaceAll(' ', '-');
  return resourceTypes.get(normalized) || text(value).toUpperCase();
}

function normalizeTags(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [text(key), text(item)]));
  return {};
}

export function normalizeCloudImport(input = {}) {
  const records = Array.isArray(input) ? input : input.records;
  if (!Array.isArray(records)) return { sites: [], resources: [], errors: [{ row: 0, message: 'Import must contain a records array' }], counts: { valid: 0, invalid: 1 } };
  const resources = [];
  const errors = [];
  const siteMap = new Map();
  records.forEach((record, index) => {
    const provider = lower(record?.provider || record?.Provider || (record?.arn || record?.ARN ? 'aws' : ''));
    const accountId = text(record?.accountId || record?.['AWS account'] || record?.awsAccount);
    const region = text(record?.region || record?.Region || 'global');
    const resourceType = normalizeResourceType(record?.resourceType || record?.['Resource type'] || record?.cfnResourceType);
    const resourceId = text(record?.resourceId || record?.ARN || record?.arn || record?.identifier || record?.Identifier);
    const missing = [['provider', provider], ['accountId', accountId], ['region', region], ['resourceType', resourceType], ['resourceId', resourceId]].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) { errors.push({ row: index + 1, message: `Missing ${missing.join(', ')}` }); return; }
    const siteKey = `${provider}:${accountId}`;
    const site = siteMap.get(siteKey) || { id: `cloud:${siteKey}`, name: text(record.accountName) || `${provider.toUpperCase()} ${accountId}`, kind: 'cloud', provider, accountId, accountName: text(record.accountName), regions: [], description: '' };
    if (!site.regions.includes(region)) site.regions.push(region);
    siteMap.set(siteKey, site);
    const tagName = text(record.name || record.tagName || record['Tag:Name']);
    resources.push({ id: `cloud:${cloudResourceKey({ provider, accountId, region, resourceType, resourceId })}`, cloudSiteId: site.id, provider, accountId, accountName: text(record.accountName), region, availabilityZone: text(record.availabilityZone), resourceType, resourceId, name: tagName && tagName !== '(not tagged)' ? tagName : text(record.identifier || record.Identifier) || resourceId, status: text(record.status) || 'unknown', privateIp: text(record.privateIp), publicIp: text(record.publicIp), tags: normalizeTags(record.tags), metadata: record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata) ? record.metadata : {}, importedAt: new Date().toISOString(), promotedDeviceId: record.promotedDeviceId || null });
  });
  return { sites: [...siteMap.values()], resources, errors, counts: { valid: resources.length, invalid: errors.length } };
}

export function mergeCloudImport(state, normalized) {
  state.cloudSites ||= [];
  state.cloudResources ||= [];
  const siteByKey = new Map(state.cloudSites.map((site) => [`${site.provider}:${site.accountId}`, site]));
  const resourceByKey = new Map(state.cloudResources.map((resource) => [cloudResourceKey(resource), resource]));
  normalized.sites.forEach((incoming) => {
    const key = `${incoming.provider}:${incoming.accountId}`;
    const existing = siteByKey.get(key);
    if (existing) Object.assign(existing, incoming, { id: existing.id });
    else { state.cloudSites.push(incoming); siteByKey.set(key, incoming); }
  });
  let created = 0;
  let updated = 0;
  normalized.resources.forEach((incoming) => {
    const existing = resourceByKey.get(cloudResourceKey(incoming));
    if (existing) Object.assign(existing, incoming, { id: existing.id, promotedDeviceId: existing.promotedDeviceId || incoming.promotedDeviceId || null });
    else { state.cloudResources.push(incoming); resourceByKey.set(cloudResourceKey(incoming), incoming); created += 1; return; }
    updated += 1;
  });
  return { created, updated };
}
