export function linkDependencies(nodes) {
    const varMap = new Map();

    let walk = (node) => {
        if (node?.name === 'var') {
            varMap.set(node, node);
        }
        Object.values(node || {}).forEach(v => {
            if (Array.isArray(v)) v.forEach(walk);
            else if (v?.name) walk(v);
        });
    };

    nodes.forEach(walk);

    walk = (node, parent) => {
        if (parent?.name === 'var') {
            parent.addDependent(node);
        }
        Object.values(node || {}).forEach(v => {
            if (Array.isArray(v)) v.forEach(n => walk(n, node));
            else if (v?.name) walk(v, node);
        });
    }

    nodes.forEach(n => walk(n, null));
}