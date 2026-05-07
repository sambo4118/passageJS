import * as NodeTypes from './NodeTypes.js';


export function render(nodes, state, navigate) {
    const container = document.createElement('div');

    for (const node of nodes) {
        revive(node).render(container, state, navigate);
    }
    return container;
}

function revive(node) {
    if (!node || typeof node !== 'object') return node;

    const Class = NodeTypes[node.name];
    if (!Class) {
        throw new Error(`Unknown node type: ${node.name}`);
    }

    const instance = Object.create(Class.prototype);

    for (const [key, value] of Object.entries(node)) {
        if (Array.isArray(value)) {
            instance[key] = value.map((v) => {
                return v && typeof v === 'object' && 'name' in v ? revive(v) : v;
            });
        } else if (value && typeof value === 'object' && 'name' in value) {
            instance[key] = revive(value);
        } else {
            instance[key] = value;
        }
    }

    return instance;
}