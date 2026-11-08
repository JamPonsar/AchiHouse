async function request(method, url, body, headers = {}) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined && !(body instanceof Blob) ? { "content-type": "application/json", ...headers } : headers,
    body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && url.startsWith("/api/admin/") && !url.endsWith("/login")) {
      window.dispatchEvent(new Event("admin-unauthorized"));
    }
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body ?? {}),
  put: (url, body) => request("PUT", url, body),
  patch: (url, body) => request("PATCH", url, body),
  del: (url) => request("DELETE", url),
  upload: (blob, type) => request("POST", "/api/admin/upload", blob, { "content-type": type }),
};
