const fs = require('fs/promises');
const path = require('path');

async function collectDirectPassageIds(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.psg'))
        .map(entry => path.parse(entry.name).name)
        .sort();
}

async function writeManifestForDirectory(dirPath) {
    const passages = await collectDirectPassageIds(dirPath);
    const manifestPath = path.join(dirPath, 'manifest.json');

    const manifest = {
        passages
    };

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

async function writeManifestsRecursively(dirPath, rootGroupName) {
    await writeManifestForDirectory(dirPath);

    const relativeDir = path.relative(path.join(__dirname, 'passages', rootGroupName), dirPath) || '.';
    const displayPath = relativeDir === '.' ? rootGroupName : `${rootGroupName}/${relativeDir.replace(/\\/g, '/')}`;
    const ids = await collectDirectPassageIds(dirPath);
    console.log(`✓ Created manifest for "${displayPath}" with ${ids.length} passages`);

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'transitions') continue;

        await writeManifestsRecursively(path.join(dirPath, entry.name), rootGroupName);
    }
}

async function generateManifests() {
    const passagesDir = path.join(__dirname, 'passages');
    
    try {
        // Get all group folders
        const groups = await fs.readdir(passagesDir, { withFileTypes: true });
        
        for (const group of groups) {
            if (!group.isDirectory()) continue;
            
            const groupPath = path.join(passagesDir, group.name);
            await writeManifestsRecursively(groupPath, group.name);
        }
        
        console.log('\nAll manifests generated successfully!');
    } catch (error) {
        console.error('Error generating manifests:', error);
        process.exit(1);
    }
}

generateManifests();
