const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const defaults = { enabled: false, baseUrl: '', models: [], timeoutMs: 60000 };
function endpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('Use an HTTPS API URL without credentials'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('Use an HTTPS API URL without credentials');
  return url.toString().replace(/\/$/, '');
}
function validate(value) {
  const baseUrl = value.baseUrl?.trim() ? endpoint(value.baseUrl.trim()) : '';
  if (!Array.isArray(value.models) || value.models.some(m => typeof m !== 'string' || !m.trim() || m.length > 150)) throw Error('Specify model identifiers, one per line');
  const models = value.models.map(m => m.trim());
  if (value.enabled && (!baseUrl || !models.length)) throw Error('Set the API URL and at least one model before enabling AI');
  return { ...defaults, baseUrl, models, enabled: value.enabled === true };
}
async function raw(dir) {
  try { return JSON.parse(await fs.readFile(path.join(dir, 'ai.json'), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return {}; throw Error('Cannot read local AI settings'); }
}
// Compatibility is restricted to the original endpoint; never forward its key elsewhere.
async function externalKey(dir, baseUrl, env = process.env) {
  if (!baseUrl) return '';
  if (env.MSXLAB_AI_API_KEY && env.MSXLAB_AI_BASE_URL && endpoint(env.MSXLAB_AI_BASE_URL) === baseUrl) return env.MSXLAB_AI_API_KEY.trim();
  if (baseUrl !== 'https://llm.wavespeed.ai/v1') return '';
  if (env.WAVESPEED_API_KEY) return env.WAVESPEED_API_KEY.trim();
  try { const data = JSON.parse(await fs.readFile(path.join(dir, 'ai-secrets.json'), 'utf8')); return typeof data.WAVESPEED_API_KEY === 'string' ? data.WAVESPEED_API_KEY.trim() : ''; }
  catch (e) { if (e.code === 'ENOENT') return ''; throw Error('Cannot read local AI key file'); }
}
function storage(provided) {
  const safe = provided || require('electron').safeStorage;
  if (!safe.isEncryptionAvailable() || safe.getSelectedStorageBackend?.() === 'basic_text') throw Error('Secure key storage is unavailable; use the documented environment variables');
  return safe;
}
async function read(dir) {
  const data = await raw(dir), config = validate({ ...defaults, ...data });
  return { ...config, hasKey: !!((data.keyBaseUrl === config.baseUrl && data.encryptedKey) || await externalKey(dir, config.baseUrl)) };
}
async function save(dir, value, { safeStorage } = {}) {
  const config = validate(value), previous = await raw(dir);
  const next = { ...config };
  if (previous.encryptedKey) { next.encryptedKey = previous.encryptedKey; next.keyBaseUrl = previous.keyBaseUrl; }
  if (value.apiKey !== undefined && value.apiKey !== '') {
    if (!config.baseUrl) throw Error('Set the API URL before saving a key');
    if (typeof value.apiKey !== 'string' || !value.apiKey.trim() || value.apiKey.length > 8192 || /[\r\n]/.test(value.apiKey)) throw Error('Invalid API key');
    next.encryptedKey = storage(safeStorage).encryptString(value.apiKey.trim()).toString('base64');
    next.keyBaseUrl = config.baseUrl;
  }
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'ai.json'), tmp = file + '.' + crypto.randomUUID() + '.tmp';
  try { await fs.writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 }); await fs.rename(tmp, file); }
  finally { await fs.rm(tmp, { force: true }); }
  return read(dir);
}
async function readKey(dir, baseUrl, { safeStorage, env = process.env } = {}) {
  baseUrl = endpoint(baseUrl);
  const data = await raw(dir);
  if (data.encryptedKey && data.keyBaseUrl === baseUrl) {
    try { return storage(safeStorage).decryptString(Buffer.from(data.encryptedKey, 'base64')); }
    catch { throw Error('Cannot unlock the saved API key; enter it again in AI settings'); }
  }
  return externalKey(dir, baseUrl, env);
}
async function chat(config, messages, { apiKey, fetchImpl = fetch } = {}) {
  if (!config.enabled) throw Error('AI is disabled');
  if (!apiKey) throw Error('AI API key is missing; configure your own connection in Settings');
  if (!Array.isArray(messages) || !messages.length || messages.some(m => !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string')) throw Error('Invalid AI messages');
  if (JSON.stringify(messages).length > 200000) throw Error('AI context too large');
  const checked = validate(config);
  for (let i = 0; i < checked.models.length; i++) {
    const response = await fetchImpl(checked.baseUrl + '/chat/completions', {
      method: 'POST', redirect: 'error', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: checked.models[i], messages, stream: false }), signal: AbortSignal.timeout(checked.timeoutMs)
    });
    if (!response.ok) {
      if ([429, 500, 502, 503, 504].includes(response.status) && i + 1 < checked.models.length) continue;
      throw Error('AI request failed (HTTP ' + response.status + ')');
    }
    const data = await response.json(), text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw Error('AI returned no text');
    return { text, model: data.model || checked.models[i], usage: data.usage };
  }
  throw Error('AI models unavailable');
}
module.exports = { read, save, chat, readKey };
