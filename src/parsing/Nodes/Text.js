import { parseInline } from "marked";

export class Text {
    constructor({tag}) {
        this.name = Text.name;
        this.text = tag.value;
    }
    static name = "text";

    render({container}) {
        const textElement = document.createElement("div");
        textElement.innerHTML = parseInline(this.text);
        container.appendChild(textElement);
        return textElement;
    }
}