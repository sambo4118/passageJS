import * as NodeTypes from "./Nodes/nodeIndex.js";

const nodeRegistry = {};

for (const [key, NodeClass] of Object.entries(NodeTypes)) {
    if (typeof NodeClass !== "function") continue;
    if (typeof key === "string") {
        nodeRegistry[key.toLowerCase()] = NodeClass;
    }
    if (typeof NodeClass.name === "string") {
        nodeRegistry[NodeClass.name.toLowerCase()] = NodeClass;
    }
}

function resolveTagHandler(tagName) {
    if (typeof tagName !== "string") return null;
    return nodeRegistry[tagName.toLowerCase()] || null;
}

export function parse(tags) {
    let index = -1;
    const result = [];

    while (index < tags.length - 1) {
        index++;
        const tag = tags[index];
        if (tag.type === "text") {
            result.push(new NodeTypes.Text({tag}));
            continue;
        }

        if (tag.type === "newline") {
            result.push(new NodeTypes.Newline({tag}));
            continue;
        }

        if (tag.type === "at") {
            const parsedAt = parseAt(tags, index);
            result.push(parsedAt.result);
            index = parsedAt.index;
            continue;
        }

        if (tag.type === "link") {
            result.push(new NodeTypes.Link({tag, parsedLocation: parse(tag.location), parsedDisplay: parse(tag.display)}));
            continue;
        }

        if (tag.type === "varreference") {
            result.push(new NodeTypes.VarReference({tag, Args: parse(tag.value)}));
            continue;
        }

    }

    return result;

}

function parseAt(tags, index) {
    let result = new NodeTypes.Text({ tag: { value: "" } });
    const tag = tags[index];

    const handler = resolveTagHandler(tag?.name);
    if (handler) {
        const instance = new handler({
            tag,
            Args: parse(tag.args || []),
            Body: parse(tag.body || [])
        });
        result = instance;
    } else {
        const name = typeof tag?.name === "string" ? tag.name : "";
        result = new NodeTypes.Text({ tag: { value: `@${name}` } });
    }
    return {result, index};
}