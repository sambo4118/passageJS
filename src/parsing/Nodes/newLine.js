export class Newline {
    constructor({tag}) {
        this.name = Newline.name;
    }
    static name = "newline";

    render({container}) {
        const newlineElement = document.createElement("br");
        container.appendChild(newlineElement);
        return newlineElement;
    }

    output() {
        return "\n";
    }
}