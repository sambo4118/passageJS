import * as nodeTypes from "../parsing/Nodes/nodeIndex.js";
import { linkDependencies } from "./dependencies.js";

const nodeRegistry = Object.entries(nodeTypes).reduce((acc, [key, NodeClass]) => {
    if (typeof NodeClass !== "function") return acc;
    acc[key.toLowerCase()] = NodeClass;
    if (typeof NodeClass.name === "string") {
        acc[NodeClass.name.toLowerCase()] = NodeClass;
    }
    return acc;
}, {});

function revive(json) {
    if (Array.isArray(json)) return json.map(revive);
    if (json && typeof json === "object") {
        const nodeName = typeof json.name === "string" ? json.name.toLowerCase() : "";
        const NodeClass = nodeRegistry[nodeName];
        const revived = Object.fromEntries(
            Object.entries(json).map(([key, value]) => [key, revive(value)])
        );
        return NodeClass ? Object.assign(Object.create(NodeClass.prototype), revived) : revived;
    }
    return json;
}
export function render(nodes, {navigate, container = document.body} = {}) {

    nodes = revive(nodes);
    linkDependencies(nodes);
    return nodes
        .filter(node => node && typeof node.render === "function")
        .map(node => node.render({container, navigate}));
}
