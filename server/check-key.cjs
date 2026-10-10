const endpoint = new URL('https://my-api.plantnet.org/v2/quota/daily');
if (!process.env.PLANTNET_API_KEY) { console.error('API key missing'); process.exit(1); }
endpoint.searchParams.set('api-key', process.env.PLANTNET_API_KEY);
fetch(endpoint, { signal: AbortSignal.timeout(15000) }).then(async response => {
  console.log(`Pl@ntNet quota endpoint: HTTP ${response.status}`);
  process.exitCode = response.ok ? 0 : 1;
}).catch(() => { console.error('Could not reach Pl@ntNet quota endpoint'); process.exitCode = 1; });
