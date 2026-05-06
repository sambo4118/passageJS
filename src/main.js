import { render } from "./renderer.js";

const state = {};

async function loadPassage(folder, name, pushState = true) {
    const passagePath = `${folder}/${name}.psg`;
    const responce = await fetch(`/passage/${passagePath}`);
    const { parsed } = await responce.json();

    if (pushState) {
        history.pushState({ passagePath }, '', `/${passagePath}`);
    }
    document.title = name.replace(/-/g, ' ');
    const container = document.getElementById('app');
    container.innerHTML = '';
    container.appendChild(render(parsed, state, (target) => {
        const [targetFolder, ...rest] = target.split('/');
        loadPassage(targetFolder, rest.join('/'));
    }));
}

const [, folder, name] = window.location.pathname.match(/^\/passage\/([^\/]+)\/([^\/]+)\.psg$/) || [];
if (folder && name) {
    await loadPassage(folder, name, false);
} else {
    console.warn('No passage specified in URL. Defaulting to /passage/menu/title-screen.psg');
    await loadPassage('menu', 'title-screen', false);
}

window.addEventListener('popstate', (event) => {
    if(event.state?.passagePath) {
        const [folder, ...rest] = event.state.passagePath.replace('.psg', '').split('/');
        loadPassage(folder, rest.join('/'), false);
    }
});