function displayMainText(text) {
    const displayElement = document.getElementById("display");
    if (!displayElement) return;
    displayElement.textContent = text;
}

function loadPassage(passageName) {
    const splitPassageName = passageName.split("_");
    
    if (splitPassageName.passageType === "transition") {
        
        const passagePath = `./passages/${splitPassageName.passageGroupName}/${splitPassageName.passageType}/${splitPassageName.startPassageID}_${splitPassageName.endPassageID}.txt`;
        return passagePath;
    }
    
    const passagePath = `./passages/${splitPassageName.passageGroupName}/${splitPassageName.passageType}/${splitPassageName.passageID}.txt`;
    return passagePath;
}