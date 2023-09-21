addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  let u = url.pathname + url.search + url.hash;
  console.log('proxy to', u);
  u = u.replace(/^\//, '');

  if (/https?:\/\//.test(u)) {
    const newRequest = new Request(u, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    const response = await fetch(newRequest);
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    newResponse.headers.set("Access-Control-Allow-Methods", "*");
    newResponse.headers.set("Access-Control-Allow-Headers", "*");
    newResponse.headers.set("Access-Control-Expose-Headers", "*");
    newResponse.headers.set("Access-Control-Allow-Private-Network", "true");
    newResponse.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    newResponse.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    newResponse.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    return newResponse;
  } else {
    return new Response(null, {
      status: 400,
      statusText: "Bad URL",
    });
  }
}
