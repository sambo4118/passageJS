import { render } from "./renderer.js";

const state = {};

function normalizePassageName(input) {
    return String(input ?? '')
        .trim()
        .replace(/^\/+/, '')
        .replace(/^passages?\//, '')
        .replace(/\.psg$/i, '');
}

async function loadPassage(passageName, pushState = true) {
    const normalizedName = normalizePassageName(passageName);
    if (!normalizedName) return;

    const passagePath = `${normalizedName}.psg`;
    const responce = await fetch(`/passages/${passagePath}`);
    const { parsed } = await responce.json();

    if (pushState) {
        history.pushState({ passagePath }, '', `/passage/${passagePath}`);
    }
    const title = normalizedName.split('/').pop() || normalizedName;
    document.title = title.replace(/-/g, ' ');
    const container = document.getElementById('app');
    container.innerHTML = '';
    container.appendChild(render(parsed, state, (target) => {
        loadPassage(target);
    }));
}

const [, requestedPassage] = window.location.pathname.match(/^\/passage\/([^?#]+\.psg)(?:\?.*)?$/) || [];
if (requestedPassage) {
    await loadPassage(requestedPassage, false);
} else {
    console.warn('No passage specified in URL. Defaulting to /passage/menu/title-screen.psg');
    await loadPassage('menu/title-screen', false);
}

window.addEventListener('popstate', (event) => {
    if(event.state?.passagePath) {
        loadPassage(event.state.passagePath, false);
    }
});