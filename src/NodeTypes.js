import { parseInline } from 'marked';

class Node {
    constructor(name) {
        this.name = name || this.constructor.name;
    }
}

export class Newline extends Node {
    constructor() {
        super();
    }
    render(container) {
        container.appendChild(document.createElement('br'));
    }
}

export class Text extends Node {
    constructor(value) {
        super();
        this.value = value;
    }
    render(container) {
        const html = parseInline(this.value);
        const div = document.createElement('div');
        div.innerHTML = html;
        while (div.firstChild) container.appendChild(div.firstChild);
    }
}

function targetToString(target) {
    if (typeof target === 'string') return target.trim();
    if (Array.isArray(target)) {
            return target
        .map((n) => (n && typeof n === 'object' && 'value' in n ? String(n.value) : ''))
        .join('')
        .trim();
    }
    if (target && typeof target === 'object' && 'value' in target) return String(target.value).trim();
    return '';
}

function contentToString(content) {
    if (!Array.isArray(content)) return '';
    return content
        .map((node) => {
            if (!node || typeof node !== 'object') return '';
            if (node.name === 'Text') return String(node.value ?? '');
            if (node.name === 'Newline') return ' ';
            return '';
        })
        .join('')
        .trim();
}

function targetToHref(target) {
    const normalized = target
        .replace(/^\/+/, '')
        .replace(/^passages?\//, '')
        .replace(/\.psg$/i, '');
    return `/passage/${normalized}.psg`;
}

export class Link extends Node {
    constructor(argvalues, content) {
        super();
        this.target = argvalues.target;
        this.content = content;
    }
    static args = [
            { name: 'target', required: true },
        ]
    render(container, state, navigate) {
        const target = targetToString(this.target);
        const label = contentToString(this.content) || target;

        const link = document.createElement('a');
        link.className = 'passage-link';
        link.href = targetToHref(target);
        link.textContent = label;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(target);
        });
        container.appendChild(link);
    }
}

export class TextSize extends Node {
    constructor(argvalues, content) {
        super();
        this.size = argvalues.size;
        this.content = content;
    }
    static args = [
        { name: 'size', required: true }
    ]
}