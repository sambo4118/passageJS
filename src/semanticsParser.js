// #region classes
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

class TextColorNode extends Node {
    constructor(color, body, location) {
        super(location);
        this.color = color;
        this.body = body;
    }
    static tagName = 'textcolor';
    static schema = {
        positional: ['color'],
        optional: {}
    }

    static fromTag(node) {
        const { color } = bindArgs(node.args, this.schema, node);
        const body = node.body ? convertNodes(node.body) : [];
        return new TextColorNode(color, body, locOf(node));
    }
}

class NewLineNode extends Node {
    constructor(location) {
        super(location);
    }
}
// #endregion

const tagHandlers = {}

const locOf = (node) => ({ index: node.index, line: node.line });

function registerTag(cls) {
    if (!cls.tagName) throw new Error(`${cls.name} missing static tagName`);
    if (!cls.fromTag) throw new Error(`${cls.name} missing static fromTag`);
    tagHandlers[cls.tagName.toLowerCase()] = cls.fromTag.bind(cls);
}


//#region register tags
registerTag(TextColorNode);
//#endregion

export function convertNodes(syntaxNodes) {
    return syntaxNodes.map(convertNode);
}

function convertNode(node) {
    if (node.type === 'TEXT') return new TextNode(node.value, locOf(node));
    if (node.type === 'NEWLINE') return new NewLineNode(locOf(node));
    if (node.type === 'TAG') return convertTag(node);
}

function convertTag(node) {
    const handler = tagHandlers[node.name.toLowerCase()];
    if (!handler) throw new Error(`Unknown tag @${node.name} at line ${node.line}`);
    return handler(node);
}

function classifyArgs(args, tagNode) {
    const positional = [];
    const named = {};
    let seenNamed = false;

    for (const arg of args) {
        if (arg.name === null) {
            if (seenNamed) {
                throw new Error(`Positional argument cannot follow named arguments \n line: ${arg.line}`);
            }
            positional.push(arg);
        } else {
            if (named[arg.name]) {
                throw new Error(`Duplicate named argument: ${arg.name} \n line: ${arg.line}`);
            }
            named[arg.name] = arg;
            seenNamed = true;
        }
    }
    return { positional, named };
}

function bindArgs(args, schema, tagNode) {
    const { positional, named } = classifyArgs(args, tagNode);
    const out = {};

    if (positional.length !== schema.positional.length) {
        throw new Error(`Expected ${schema.positional.length} positional arguments but got ${positional.length} \n line: ${tagNode.line}`);
    }

    schema.positional.forEach((name, i) => {
        out[name] = argToString(positional[i])
    });

    for (const [name, arg] of Object.entries(named)) {
        if (!(name in schema.optional)) {
            throw new Error(`Unknown named argument: ${name} \n line: ${arg.line}`);
        }
        out[name] = argToString(arg);
    }

    for (const [name, def] of Object.entries(schema.optional)) {
        if (!(name in out)) out[name] = def;
    }
    
    return out;
}

function argToString(arg) {
    let out = '';
    for (const value of arg.value) {
        if (value.type === 'TEXT' || value.type === 'PARAMS' || value.type === 'ARG') {
            out += value.value;
        } else if (value.type === 'NEWLINE') {
            out += '\n';
        } else {
            throw new Error(`Invalid argument value type: ${value.type} \n line: ${arg.line}`);
        }
    }
    return out.trim();
}