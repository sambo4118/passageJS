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
        container.addeventListener("click", () => {});
        container.appendChild(linkElement);
        return linkElement;
    }

    navigateTo() {
        
    }
}
