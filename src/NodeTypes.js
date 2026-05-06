import { parseInline } from 'marked';

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
    render(container) {
        const html = parseInline(this.value);
        const div = document.createElement('div');
        div.innerHTML = html;
        while (div.firstChild) container.appendChild(div.firstChild);
    }
}

export class Link extends Node {
    constructor(argvalues, content) {
        super('LINK');
        this.target = argvalues.target;
        this.content = content;
    }
    static args = [
            { name: 'target', required: true },
        ]
    render(container, state, navigate) {
        const link = document.createElement('a');
        link.textContent = this.target;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(this.target);
        });
        container.appendChild(link);
    }
}

export class TextSize extends Node {
    constructor(argvalues, content) {
        super('TAG', 'textsize');
        this.size = argvalues.size;
        this.content = content;
    }
    static args = [
        { name: 'size', required: true }
    ]
}