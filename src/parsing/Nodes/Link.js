export class Link {
  constructor({ parsedLocation, parsedDisplay, navigate }) {
    this.name = "link";
    this.location = parsedLocation;
    this.display = parsedDisplay;
    this.navigate = navigate;
  }

  output() {
    return this.location.map(node => node.output()).join("");
  }

  navigateTo() {
    const slug = this.output().trim();
    if (!slug) return;
    if (typeof this.navigate === "function") this.navigate(slug);
  }

  render({ container, navigate }) {
    this.navigate = navigate;
    const linkElement = document.createElement("a");
    linkElement.href = "/" + this.output().trim();

    this.display
      .filter((node) => node && typeof node.render === "function")
      .forEach((node) => node.render({ container: linkElement, navigate }));

    linkElement.addEventListener("click", (event) => {
      event.preventDefault();
      this.navigateTo();
    });

    container.appendChild(linkElement);
    return linkElement;
  }
}