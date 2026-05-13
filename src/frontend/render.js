import * as nodeTypes from "../parsing/Nodes/nodeIndex.js";
import { linkDependencies } from "./dependencies.js";

function revive(json) {
    if (Array.isArray(json)) return json.map(revive);
    if (json && typeof json === "object") {
        const NodeClass = nodeTypes[json.name];
        const revived = Object.fromEntries(
            Object.entries(json).map(([key, value]) => [key, revive(value)])
        );
        return NodeClass ? Object.assign(new NodeClass({}), revived) : revived;
    }

}
export function render(nodes) {
    nodes = revive(nodes);
    linkDependencies(nodes);
    return nodes.map(node => node.render({container: document.body}));
}
