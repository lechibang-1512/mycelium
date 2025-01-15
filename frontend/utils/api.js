export const BASE_URL = '/api';

/**
 * Wrapper around fetch() with JSON defaults and credential handling.
 * @param {string} path — API path (e.g. '/dashboard/kpis')
 * @param {object} opts — fetch options
 * @returns {Promise<any>} parsed JSON body
 */
export async function api(path, opts = {}) {
    const url = `${BASE_URL}${path}`;
    const config = {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        ...opts,
    };
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }
    if (config.body instanceof FormData) {
        delete config.headers['Content-Type']; // let browser set boundary
    }
    const res = await fetch(url, config);
    if (res.status === 401) {
        // Redirection should be handled by AuthContext or router, but forcing it here just in case
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
        throw new Error('Unauthorized');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const msg = data?.message || data?.error || `Request failed (${res.status})`;
        throw new Error(msg);
    }
    return data;
}

api.get = (path, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api(`${path}${qs}`);
};
api.post = (path, body) => api(path, { method: 'POST', body });
api.put = (path, body) => api(path, { method: 'PUT', body });
api.del = (path, body) => api(path, { method: 'DELETE', body });
