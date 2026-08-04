let snapshot;
let searchTerm = '';
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
const relativeTime = (date) => { const minutes = Math.max(1, Math.round((Date.now() - new Date(date)) / 60000)); return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`; };
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2500); }
function render() {
  const { counts, networks, changes, racks, devices, discoveries } = snapshot;
  $('#nav-discovery-count').textContent = counts.discoveries;
  $('#scan-network').innerHTML = networks.map((network) => `<option value="${network.id}">${escapeHtml(network.name)} · ${escapeHtml(network.cidr)}</option>`).join('');
  $('#metrics').innerHTML = [['DEVICES', counts.devices, '↗  All accounted for', '⌁'], ['IP ADDRESSES', counts.addresses, `${counts.networks} networks tracked`, '⌁'], ['RACKS', counts.racks, 'Across 1 site', '▦'], ['TO REVIEW', counts.discoveries, counts.discoveries ? 'New observations' : 'All caught up', '◎']].map(([label, value, note, icon]) => `<div class="metric"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`).join('');
  $('#changes').innerHTML = changes.length ? changes.slice(0, 5).map((change) => `<div class="activity-item"><span class="event-dot"></span><div class="activity-copy"><strong>${escapeHtml(change.message)}</strong><small>${escapeHtml(change.type)} event</small></div><span class="time">${relativeTime(change.at)}</span></div>`).join('') : '<div class="empty">No changes yet.</div>';
  $('#networks').innerHTML = networks.map((network) => { const percent = network.capacity ? Math.min(100, Math.round(network.addressCount / network.capacity * 100)) : 0; return `<div class="network-row"><div class="network-label"><strong>${escapeHtml(network.name)}</strong><span>${network.addressCount} / ${network.capacity} used</span></div><div class="progress"><i style="width:${Math.max(3, percent)}%"></i></div></div>`; }).join('');
  $('#rack-mini').innerHTML = racks.map((rack) => `<div class="mini-rack"><div class="mini-rack-label"><strong>${escapeHtml(rack.name)}</strong><small>${rack.devices.length} device${rack.devices.length === 1 ? '' : 's'} · ${rack.height}U</small></div><div class="mini-slots">${Array.from({ length: 8 }, (_, index) => `<span class="mini-slot ${rack.devices[index] ? (index % 3 === 0 ? 'blue' : 'filled') : ''}"></span>`).join('')}</div></div>`).join('');
  $('#ipam-table').innerHTML = networks.map((network) => `<tr><td><strong>${escapeHtml(network.name)}</strong><br><span class="muted">${escapeHtml(network.cidr)}</span></td><td>${network.vlan ?? '—'}</td><td>Home Lab</td><td>${network.addressCount}</td><td>${network.capacity}</td><td><span class="pill">Healthy</span></td></tr>`).join('');
  $('#rack-grid').innerHTML = racks.map((rack) => `<article class="rack-card"><h3>${escapeHtml(rack.name)}</h3><p>Home Lab · ${rack.height}U rack · front elevation</p><div class="rack-body"><div class="rack-labels">${Array.from({ length: 12 }, (_, i) => `<span>${rack.height - i}</span>`).join('')}</div><div class="rack-face">${Array.from({ length: 12 }, (_, i) => { const device = rack.devices.find((item) => item.rackUnit === rack.height - i); return `<div class="rack-unit ${device ? `device ${i % 2 ? 'blue' : ''}` : ''}">${device ? `<span>${escapeHtml(device.name)}</span><button class="remove-device" data-id="${device.id}" title="Remove ${escapeHtml(device.name)}">×</button>` : ''}</div>`; }).join('')}</div></div></article>`).join('');
  $('#discovery-list').innerHTML = discoveries.filter((item) => item.status === 'pending').length ? discoveries.filter((item) => item.status === 'pending').map((item) => `<div class="discovery-card"><div class="discovery-symbol">◎</div><div class="discovery-copy"><strong>${escapeHtml(item.hostname || item.ip)}</strong><small>${escapeHtml(item.ip)} · ${escapeHtml(item.vendor)} · observed ${relativeTime(item.discoveredAt)}</small></div><button class="button secondary ignore-discovery" data-id="${item.id}">Ignore</button><button class="button secondary confirm-discovery" data-id="${item.id}">Confirm device</button></div>`).join('') : '<div class="empty">No pending discoveries. Run a scan when you are ready.</div>';
  document.querySelectorAll('.confirm-discovery').forEach((button) => button.addEventListener('click', () => confirmDiscovery(button.dataset.id)));
  document.querySelectorAll('.ignore-discovery').forEach((button) => button.addEventListener('click', () => ignoreDiscovery(button.dataset.id)));
  document.querySelectorAll('.remove-device').forEach((button) => button.addEventListener('click', () => removeDevice(button.dataset.id)));
  applySearch();
}
function applySearch() {
  const query = searchTerm.trim().toLowerCase();
  document.querySelectorAll('.activity-item,.network-row,.rack-card,.discovery-card,#ipam-table tr').forEach((node) => {
    node.hidden = Boolean(query) && !node.textContent.toLowerCase().includes(query);
  });
}
async function refresh() { const response = await fetch('/api/summary'); snapshot = await response.json(); render(); }
async function scan(networkId = $('#scan-network').value || snapshot.networks[0]?.id) { const network = snapshot.networks.find((item) => item.id === networkId); if (!network) return toast('Create a network before scanning.'); toast(`Scanning ${network.name}…`); const response = await fetch('/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ networkId: network.id }) }); if (!response.ok) return toast('Scan failed. Check the server logs.'); await refresh(); toast('Scan complete. Review the observations.'); }
async function confirmDiscovery(id) { const item = snapshot.discoveries.find((entry) => entry.id === id); const response = await fetch(`/api/discoveries/${id}/confirm`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: item.hostname || item.ip }) }); if (response.ok) { await refresh(); toast('Added to your inventory.'); } }
async function ignoreDiscovery(id) { const response = await fetch(`/api/discoveries/${id}/ignore`, { method: 'POST' }); if (response.ok) { await refresh(); toast('Observation ignored.'); } }
async function removeDevice(id) { const device = snapshot.devices.find((item) => item.id === id); if (!device || !window.confirm(`Remove ${device.name} and release linked IP records?`)) return; const response = await fetch(`/api/devices/${id}`, { method: 'DELETE' }); if (response.ok) { await refresh(); toast(`${device.name} removed.`); } }
async function addDevice() {
  const name = window.prompt('Device name');
  if (!name?.trim()) return;
  const role = window.prompt('Role (router, server, switch…)') || 'Unassigned';
  const rack = snapshot.racks[0];
  const rackUnit = window.prompt(`Rack unit in ${rack?.name || 'no rack'} (leave blank for standalone)`);
  const ip = window.prompt('IP address (leave blank to assign later)');
  const response = await fetch('/api/devices', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, role, rackId: rackUnit && rack ? rack.id : null, rackUnit, ip, networkId: ip ? snapshot.networks[0]?.id : null }) });
  if (response.ok) { await refresh(); toast(`${name} added to inventory.`); } else { const result = await response.json(); toast(result.error || 'Could not add device.'); }
}
async function addNetwork() {
  const name = window.prompt('Network name');
  if (!name?.trim()) return;
  const cidr = window.prompt('CIDR (for example 192.168.10.0/24)');
  if (!cidr?.trim()) return;
  const vlan = window.prompt('VLAN number (optional)');
  const response = await fetch('/api/networks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, cidr, vlan }) });
  if (response.ok) { await refresh(); toast(`${name} added to IPAM.`); } else { const result = await response.json(); toast(result.error || 'Could not add network.'); }
}
function field(label, name, type = 'text', extra = '') { return `<label class="form-label">${label}<input name="${name}" type="${type}" ${extra} /></label>`; }
function openResourceModal(type) {
  $('#resource-type').value = type;
  renderResourceFields();
  $('#resource-modal').hidden = false;
}
function renderResourceFields() {
  const type = $('#resource-type').value;
  $('#modal-title').textContent = `Add ${type}`;
  if (type === 'site') $('#resource-fields').innerHTML = `<div class="form-grid">${field('Name', 'name', 'text', 'required')}${field('Location', 'location')}</div>${field('Description', 'description')}`;
  if (type === 'rack') $('#resource-fields').innerHTML = `${field('Name', 'name', 'text', 'required')}<div class="form-grid">${field('Height (U)', 'height', 'number', 'value="12" min="1" max="60" required')}${field('Width (mm)', 'width', 'number', 'value="600" min="1"')}</div><label class="form-label">Site<select name="siteId">${snapshot.sites ? snapshot.sites.map((site) => `<option value="${site.id}">${escapeHtml(site.name)}</option>`).join('') : `<option value="${snapshot.site?.id || ''}">${escapeHtml(snapshot.site?.name || 'Home Lab')}</option>`}</select></label>`;
  if (type === 'network') $('#resource-fields').innerHTML = `${field('Name', 'name', 'text', 'required')}<div class="form-grid">${field('CIDR', 'cidr', 'text', 'placeholder="192.168.10.0/24" required')}${field('VLAN', 'vlan', 'number', 'min="1" max="4094"')}</div>`;
  if (type === 'device') $('#resource-fields').innerHTML = `${field('Name', 'name', 'text', 'required')}<div class="form-grid">${field('Role', 'role')} ${field('Height (U)', 'height', 'number', 'value="1" min="1" max="48" required')}</div><div class="form-grid">${field('Rack unit', 'rackUnit', 'number', 'min="1"')}<label class="form-label">Rack<select name="rackId"><option value="">Standalone</option>${snapshot.racks.map((rack) => `<option value="${rack.id}">${escapeHtml(rack.name)}</option>`).join('')}</select></label></div><div class="form-grid">${field('IP address', 'ip', 'text', 'placeholder="192.168.1.10"')}<label class="form-label">Network<select name="networkId"><option value="">No network</option>${snapshot.networks.map((network) => `<option value="${network.id}">${escapeHtml(network.name)}</option>`).join('')}</select></label></div>${field('Hostname', 'hostname')}`;
}
function closeResourceModal() { $('#resource-modal').hidden = true; }
async function submitResource(event) {
  event.preventDefault();
  const type = $('#resource-type').value;
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  const response = await fetch(`/api/${type}s`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) { const result = await response.json(); toast(result.error || `Could not create ${type}.`); return; }
  closeResourceModal(); await refresh(); toast(`${type[0].toUpperCase() + type.slice(1)} added.`);
}
function showView(view) { document.querySelectorAll('.view').forEach((node) => node.classList.remove('active-view')); $(`#view-${view}`).classList.add('active-view'); document.querySelectorAll('.nav-item').forEach((node) => node.classList.toggle('active', node.dataset.view === view)); const label = view === 'racks' ? 'RACKS & MAP' : view.toUpperCase(); $('#page-label').textContent = label; $('#page-title').innerHTML = view === 'overview' ? 'Good evening, Kallum <span>✦</span>' : `${label[0] + label.slice(1).toLowerCase()} <span>✦</span>`; }
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.viewLink)));
$('#add-device').addEventListener('click', () => openResourceModal('device')); $('#add-device-rack').addEventListener('click', () => openResourceModal('device')); $('#add-network').addEventListener('click', () => openResourceModal('network')); $('#setup-site').addEventListener('click', () => openResourceModal('site')); $('#add-rack').addEventListener('click', () => openResourceModal('rack')); $('#resource-type').addEventListener('change', renderResourceFields); $('#resource-form').addEventListener('submit', submitResource); $('#close-modal').addEventListener('click', closeResourceModal); $('#cancel-modal').addEventListener('click', closeResourceModal); $('#scan-quick').addEventListener('click', () => scan(snapshot.networks[0]?.id)); $('#scan-ipam').addEventListener('click', () => scan(snapshot.networks[0]?.id)); $('#scan-discovery').addEventListener('click', () => scan());
$('#global-search').addEventListener('input', (event) => { searchTerm = event.target.value; applySearch(); });
refresh().catch(() => toast('Lantern API is unavailable. Start the server first.'));
