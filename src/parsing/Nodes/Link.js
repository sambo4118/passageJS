export class Link {
    constructor({tag, parsedLocation, parsedDisplay}) {
        this.name = Link.name;
        this.location = parsedLocation;
        this.display = parsedDisplay;
    }
    static name = "link";

    render({container}) {
        const linkElement = document.createElement("span");
        linkElement.textContent = this.display;
        this.display.forEach(node => node.render({container: linkElement}));
        container.addEventListener("click", () => this.navigateTo());
        container.appendChild(linkElement);
        return linkElement;
    }

    navigateTo() {
        
    }

    output() {
        return this.location.map(node => node.output()).join("");
    }
}
