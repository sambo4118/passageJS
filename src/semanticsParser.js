
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

function makeErrorNode(message) {
    return new NodeTypes.Text(`[Semantic error] ${message}`);
}

function convertToken(token) {
    if (token.type === 'TAG') {
        return convertArgs(token);
    }

    if (token.type === 'TEXT') {
        return new NodeTypes.Text(token.value);
    }

    if (token.type === 'NEWLINE') {
        return new NodeTypes.Newline();
    }

    if (typeof token.value === 'string') {
        return new NodeTypes.Text(token.value);
    }

    return null;
}

export function parseSemantics(tokens) {
    const out = [];

    for (const token of tokens) {
        if (!token) continue;

        try {
            const node = convertToken(token);
            if (node) out.push(node);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            out.push(makeErrorNode(message));
        }
    }

    return out;
}

function convertArgs(tag) {

    const NodeClass = nodeRegistry.get(tag.name.toLowerCase());
    if (!NodeClass) {
        return makeErrorNode(`No Node class found for tag "${tag.name}"`);
    }

    const filledArgs = {};
    const content = tag.body ? parseSemantics(tag.body) : [];

    if (!NodeClass.args) return new NodeClass(filledArgs, content);

    NodeClass.args.forEach((argDefinition, index) => {
        const argNode = tag.args?.[index];
        if (!argNode) {
            return; //later handle missing required args
        }

        const parsedValue = parseSemantics(argNode.value);

        filledArgs[argDefinition.name] = parsedValue;
    });
    return new NodeClass(filledArgs, content);
}