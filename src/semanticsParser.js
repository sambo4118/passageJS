
import * as NodeTypes from './NodeTypes.js';

function buildRegistry() {
    const registry = new Map();
    for (const value of Object.values(NodeTypes)) {
        if (typeof value !== 'function') continue
        const tagName = value.name.toLowerCase();
        if (!tagName) continue;
        if (registry.has(tagName)) {
            console.warn(`Duplicate tag name "${tagName}" in NodeTypes. This may cause unexpected behavior.`);
        }
        registry.set(tagName, value);
    }
    return registry;
}

const nodeRegistry = buildRegistry();

export function parseSemantics(tokens) {
    const out = [];

    for (const token of tokens) {
        if (!token) continue;

        if (token.type === 'TAG') {
            const node = convertArgs(token);
            if (node) out.push(node);
            continue;
        }

        if (token.type === 'TEXT') {
            out.push(new NodeTypes.Text(token.value));
            continue;
        }

        if (token.type === 'NEWLINE') {
            out.push(new NodeTypes.Newline());
            continue;
        }
        if (typeof token.value === 'string') {
            out.push(new NodeTypes.Text(token.value));
        }
    }

    return out;
}

function convertArgs(tag) {

    const NodeClass = nodeRegistry.get(tag.name.toLowerCase());
    if (!NodeClass) {
        console.warn(`No Node class found for tag "${tag.name}"`);
        return;
    }

    const filledArgs = {};

    if (!NodeClass.args) return new NodeClass(filledArgs);

    NodeClass.args.forEach((argDefinition, index) => {
        const argNode = tag.args?.[index];
        if (!argNode) {
            return; //later handle missing required args
        }

        const parsedValue = parseSemantics(argNode.value);

        filledArgs[argDefinition.name] = parsedValue;
    });
    return new NodeClass(filledArgs);
}