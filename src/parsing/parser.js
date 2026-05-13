import lexer from "./lexer.js";
import * as NodeTypes from "./Nodes/nodeIndex.js";

const nodeRegistry = {}

for (const [key, NodeClass] of Object.entries(NodeTypes)) {
    if (NodeClass.name) {
        nodeRegistry[NodeClass.name] = NodeClass;
    }
}

function resolveTagHandler(tagName) {
    return nodeRegistry[tagName.toLowerCase()];
}

export function parse(tags) {
    let index = -1;
    const result = [];

    while (index < tags.length - 1) {
        index++;
        const tag = tags[index];
        if (tag.type === "text") {
            result.push(new Text({tag}));
            continue;
        }

        if (tag.type === "newline") {
            result.push(new Newline({tag}));
            continue;
        }

        if (tag.type === "at") {
            const parsedAt = parseAt(tags, index);
            result.push(parsedAt.result);
            index = parsedAt.index;
            continue;
        }

        if (tag.type === "link") {
            result.push(new Link({tag, parsedLocation: parse(tag.location), parsedDisplay: parse(tag.display)}));
            continue;
        }

        if (tag.type === "varreference") {
            result.push(new VarReference({tag, Args: parse(tag.value)}));
            continue;
        }

    }

}

function parseAt(tags, index) {
    let result = {type: "at"};
    let tag = tags[index + 1];

    const handler = resolveTagHandler(tag.name);
    if (handler) {
        const instance = new handler({tag, Args: parse(tag.args), Body: parse(tag.body)});
        result = instance;
    }
    index++;
    return {result, index};
}