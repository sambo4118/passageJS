export class Var {
    constructor({tag, Args, _}) {
        this.name = Var.name;
        this.tag = tag;
        this.args = Args;
        this.dependents = [];
        this.value = this.output();
    }
    static name = "var";

    addDependent(node) {
        if (!this.dependents) this.dependents = [];
        this.dependents.push(node);
    }
    
    output() {
        return this.args.map(node => node.output()).join("");
    }

    render({container}) {
        // Var nodes don't render directly, only their references do
        return null;
    }
}