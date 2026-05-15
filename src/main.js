import { render } from "./frontend/render.js";
import "./style.css";

const DEFAULT_SLUG = "title-screen";

function slugFromPath(pathname) {
  const cleaned = pathname.replace(/^\/+|\/+$/g, "");
  return cleaned || DEFAULT_SLUG;
}

async function loadPassage(slug, pushHistory = true) {
  const appRoot = document.getElementById("app");
  if (!appRoot) throw new Error("Missing #app root element");

  try {
    const response = await fetch(`/api/passages/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      let details = response.statusText;
      try {
        const errorBody = await response.json();
        if (errorBody && typeof errorBody.error === "string") {
          details = errorBody.error;
        }
      } catch {
        // Ignore parse errors and fall back to status text.
      }
      throw new Error(`Failed to load passage (${response.status}): ${details}`);
    }

    const data = await response.json();
    appRoot.innerHTML = "";

    render(data, {
      navigate: (nextSlug) => loadPassage(nextSlug, true),
      container: appRoot
    });

    if (pushHistory) history.pushState({ slug }, "", `/${slug}`);
  } catch (error) {
    console.error("Error loading passage:", error);
    const message = error instanceof Error ? error.message : "Please try again later.";
    appRoot.innerHTML = `<h1>Error loading passage</h1><p>${message}</p>`;
  }
}

window.addEventListener("popstate", (event) => {
  const slug = event.state?.slug || slugFromPath(window.location.pathname);
  loadPassage(slug, false);
});

loadPassage(slugFromPath(window.location.pathname), false);