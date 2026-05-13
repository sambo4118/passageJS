export class Link {
    constructor({tag, parsedLocation, parsedDisplay}) {
        this.name = Link.name;
        this.location = parsedLocation;
        this.display = parsedDisplay;
    }
    static name = "link";
}