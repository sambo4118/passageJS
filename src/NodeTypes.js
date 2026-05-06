class Node {
    constructor(type, name) {
        this.type = type;
        this.name = name || this.constructor.name;
    }
}

export class Text extends Node {
    constructor(value) {
        super('TEXT');
        this.value = value;
    }
}

export class Link extends Node {
    constructor(name, target) {
        super('LINK');
        this.name = name;
        this.target = target;
    }
}

export class TextSize extends Node {
    constructor(argvalues, content) {
        super('TAG', 'textsize');
        this.size = argvalues.size;
        this.content = content;
        this.args = [
            { name: 'size', required: true }
        ]
    }
}