const app = document.querySelector("#app");

if (app) {
  app.innerHTML = `
    <main style="font-family: sans-serif; padding: 2rem; line-height: 1.5;">
      <h1>Deploy Success Ready</h1>
      <p>This project is now set up with Vite and can deploy to Cloudflare Pages.</p>
    </main>
  `;
}
