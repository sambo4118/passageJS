export class Text {
    constructor({tag}) {
        this.name = Text.name;
        this.text = tag.value;
    }
    static name = "text";
}