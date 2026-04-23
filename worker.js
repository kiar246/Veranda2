export default {
  async fetch(request, env) {
    // Fallback prevents 500 when ASSETS binding is missing.
    if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return new Response(
        "<!doctype html><html><body><h1>Worker is running</h1><p>ASSETS binding is not available in this deployment.</p></body></html>",
        {
          headers: { "content-type": "text/html; charset=UTF-8" },
        }
      );
    }
    return env.ASSETS.fetch(request);
  },
};
