PASSAGEFILEPATH = "passages/"

async function loadPassage(passageName, passageGroup) {
    
    const passageFilePath = `${PASSAGEFILEPATH}/${passageGroup}/${passageName}.md`;

    const response = await fetch(passageFilePath);
    
    if (!response.ok) throw new Error(`Failed to load passage: ${passageName}`);
    return await response.text();
}

function parsePassage(passageContent) {
    const doubleBracket = extractDoubleBrackets(passageContent)
}

function extractDoubleBrackets(text) {
    const blocks = [...text.matchAll(/\[\[([\s\S]*?)\]\]/g)].map(match => match[0]);
    if (blocks.length === 0) return null;
    return blocks;
}

function displayText(text, elementId = "output", overWrite = true) {
    const outputElement = document.createElement("pre")
    
    outputElement.id = elementId
    outputElement.textContent = text
    
    if (overWrite) {
        document.body.replaceChildren(outputElement);
        return outputElement;
    }
    document.body.appendChild(outputElement);
    return outputElement;
}
document.addEventListener("DOMContentLoaded", () => {
    displayText("hello?",);
});