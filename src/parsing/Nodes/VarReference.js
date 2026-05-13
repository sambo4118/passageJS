export class VarReference {
    constructor({tag, Args, _}) {
        this.name = VarReference.name;
        this.varName = Args.map(node => node.output()).join("");
    }
    static name = "varreference";

    bindTarget(varNode) {
        this.target = varNode || null;
    }

    output() {
        return this.target ? this.target.output() : "";
    }

    render ({container}) {
        const varRefElement = document.createElement("span");
        varRefElement.textContent = this.output();
        container.appendChild(varRefElement);
        return varRefElement;
    }
}