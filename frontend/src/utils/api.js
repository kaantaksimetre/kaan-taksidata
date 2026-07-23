async function readErrorPayload(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return null;
}

function notifyUnauthorized(url, status) {
  if (status === 401 && !url.startsWith('/auth/')) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }
}

export const apiRequest = async (method, url, data = null) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`/api${url}`, {
      method,
      credentials: 'same-origin',
      headers: data === null ? undefined : { 'Content-Type': 'application/json' },
      body: data === null ? undefined : JSON.stringify(data),
      signal: controller.signal,
    });

    const payload = await readErrorPayload(response);
    if (!response.ok) {
      notifyUnauthorized(url, response.status);
      const apiError = new Error(payload?.error || `İstek başarısız (${response.status})`);
      apiError.status = response.status;
      throw apiError;
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Sunucu 20 saniye içinde yanıt vermedi. Bağlantıyı kontrol edip tekrar deneyin.', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const apiDownload = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`/api${url}`, {
      method: 'GET',
      credentials: 'same-origin',
      signal: controller.signal,
    });
    if (!response.ok) {
      const payload = await readErrorPayload(response);
      notifyUnauthorized(url, response.status);
      const apiError = new Error(payload?.error || `Dosya indirilemedi (${response.status})`);
      apiError.status = response.status;
      throw apiError;
    }
    const disposition = response.headers.get('content-disposition') || '';
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
    return {
      blob: await response.blob(),
      filename: filenameMatch?.[1] || 'taksimetre-yedek.db',
      sha256: response.headers.get('x-backup-sha256') || '',
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Yedek indirme zaman aşımına uğradı.', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
