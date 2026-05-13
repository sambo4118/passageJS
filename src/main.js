import { render } from "./frontend/render.js";

const DEFAULT_SLUG = "title-screen.JS";

function slugFromPath(pathname) {
    const cleaned = pathname.replace(/^\/+|\/+$/g, "");
    return cleaned || DEFAULT_SLUG;
}

async function loadPassage(slug) {
    try {
        const response = await fetch(`/api/passages/${encodeURIComponent(slug)}`);
        if (!response.ok) throw new Error(`Failed to load passage: ${response.statusText}`);

        const data = await response.json();
        document.body.innerHTML = "";
        render(nodes);

        if (pushHistory) history.pushState({ slug }, "", `/${slug}`);

    } catch (error) {
        console.error("Error loading passage:", error);
        document.body.innerHTML = "<h1>Error loading passage</h1><p>Please try again later.</p>";
    }
}

window.addEventListener("popstate", event => {
    const slug = event.state?.slug || slugFromPath(window.location.pathname);
    loadPassage(slug, false);
});

loadPassage(slugFromPath(window.location.pathname), false);