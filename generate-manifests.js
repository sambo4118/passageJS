const fs = require('fs/promises');
const path = require('path');

async function generateManifests() {
    const passagesDir = path.join(__dirname, 'passages');
    
    try {
        // Get all group folders
        const groups = await fs.readdir(passagesDir, { withFileTypes: true });
        
        for (const group of groups) {
            if (!group.isDirectory()) continue;
            
            const groupPath = path.join(passagesDir, group.name);
            const manifestPath = path.join(groupPath, 'manifest.json');
            
            const files = await fs.readdir(groupPath, { withFileTypes: true });
            const passages = files
                .filter(file => file.isFile() && file.name.endsWith('.md'))
                .map(file => path.parse(file.name).name);
            
            const manifest = {
                passages: passages.sort()
            };
            
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
            console.log(`✓ Created manifest for "${group.name}" with ${passages.length} passages`);
        }
        
        console.log('\nAll manifests generated successfully!');
    } catch (error) {
        console.error('Error generating manifests:', error);
        process.exit(1);
    }
}

generateManifests();
