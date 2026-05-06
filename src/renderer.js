import * as NodeTypes from './NodeTypes.js';


export function render(nodes, state, navigate) {
    const container = document.createElement('div');

    for (const node of nodes) {
        revive(node).render(container, state, navigate);
    }
    return container;
}

function revive(node) {
    const Class = NodeTypes[node.name];
    return Object.assign(new Class(), node);
}