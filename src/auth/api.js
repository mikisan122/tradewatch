import { apiUrl } from '../sync/link';

/** Llamada a la API de TradeWatch. Lanza un Error con mensaje en español. */
export async function api(path, { method = 'GET', body, token, timeout = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(apiUrl() + path, {
      method,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error('No se pudo conectar con el servidor. Verifica que "npm run sync" esté corriendo.');
    err.offline = true;
    throw err;
  } finally {
    clearTimeout(t);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Ocurrió un error.');
    err.status = res.status;
    throw err;
  }
  return data;
}
