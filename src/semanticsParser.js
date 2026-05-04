
class Node {
    constructor(location) {
        this.location = location;
        this.type = this.constructor.name.replace(/Node$/, '');
    }
}

class TextNode extends Node {
    constructor(text, location) {
        super(location);
        this.text = text;
    }
}

class IfNode extends Node {
    constructor(condition, body, location) {
        super(location);
        this.condition = condition;
        this.body = body;
    }
}

class TextColorNode extends Node {
    constructor(color, body, location) {
        super(location);
        this.color = color;
        this.body = body;
    }
}

class NewLineNode extends Node {
    constructor(location) {
        super(location);
    }
}

export function parseSemantics(syntaxTree) {
    const state = { syntaxTree, i: 0 };
    
    for (const node of syntaxTree) {
    

    }
}

function parseSemanticsContent(state) {

    const nodes = [];

    while (i < state.syntaxTree.length) {
        
        state.i++;
        const node = syntaxTree[i];
        if (node.type === 'TAG') {
            
            const { tagNode, state } = parseSemanticsTag(node, state);

            if (!tagNode) throw new Error(node.name + ' is not recognized as a valid tag');
            nodes.push(tagNode);
            continue;
        }

        if (node.type === 'TEXT') {
            nodes.push(new TextNode(node.value, { index: node.index, line: node.line }));
            continue;
        }
        
        if (node.type === 'NEWLINE') {
            nodes.push(new TextNode('\n', { index: node.index, line: node.line }));
            continue;
        }

        throw new Error('Unknown syntax node type: ' + node.type);
    }
}

function parseSemanticsTag(node, state) {
    const name = node.name.toLowerCase();

    if (name === 'textcolor') {
    
    }
}

function parseArgs(args) {
    args = [];

}