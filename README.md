you could read through this whole boreding regular readme page or you could:  
***play*** the readme, in passageJS, in your browser right now.

# PassageJS

A dynamic, Twine-like narrative engine with markdown support, custom animations, and smart transitions. Build interactive fiction and branching narratives with simple markdown files.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

## Features

- **Markdown-based** - Write in pure markdown with custom extensions
- **Smart linking** - Direct links, relative links, and random group selection
- **Built-in animations** - Wiggle, typewriter, fade-in, and delayed reveals
- **Transition system** - Smooth passages between story nodes
- **Game state** - Built-in visited tracking and localStorage persistence
- **Zero dependencies** - Vanilla JavaScript, no build step required
- **Highly customizable** - Easy to extend with your own macros and styles
- **limitless scope** - Never gets bogged down with huge stories

## Quick Start

```bash
# Clone or download this repository
git clone https://github.com/YOUR_USERNAME/passagejs.git
cd passagejs

# Start the development server
npm start

# Open http://localhost:3000 in your browser
```

## File Structure

```
passages/
  groupName/
    passageID.md          - Main passage files
    manifest.json         - List of passage IDs for random selection
    transitions/
      T-fromID-toID.md    - Transition passages between specific passages
```

## Passage Naming

Passages are referenced as: `groupName_passageID`

Example: `intelectualization_I1` loads `passages/intelectualization/I1.md`

## Standard Markdown

All standard markdown syntax is supported:

```markdown
# Heading 1
## Heading 2

**bold** and *italic*

- Bullet lists
- Work great

1. Numbered
2. Lists too

[External links](https://example.com)

`inline code`

> Blockquotes
```

## Custom Link Syntax

### Direct Links

Link to a specific passage:

```markdown
[[Display Text|groupName_passageID]]
[[Display Text|passageID]]  <!-- Uses current group -->
```

Examples:
```markdown
[[Go to anxiety section|meta-anxiety_M1]]
[[Continue|I2]]
```

### Random Group Links

Link to a random passage from a group (requires manifest.json):

```markdown
[[Display Text|@groupName]]
```

Example:
```markdown
[[Explore your thoughts|@intelectualization]]
```

**Note:** The system automatically checks for transitions when navigating to new passages.

## Animation Macros

### Wiggle (Anxious Shake)

Makes text shake with a chaotic, anxious animation. Each letter moves independently.

```markdown
<<wiggle>>This text shakes nervously<</wiggle>>
```

### Typewriter

Reveals text letter by letter. Speed is in milliseconds per character.

```markdown
<<typewriter speed="50">>This types out slowly<</typewriter>>
<<typewriter speed="20">>This types faster<</typewriter>>
```

### Fade In

Text fades in with a delay. Delay is in milliseconds.

```markdown
<<fadein delay="1000">>Appears after 1 second<</fadein>>
<<fadein delay="2500">>Appears after 2.5 seconds<</fadein>>
```

### Delayed Reveal

Text appears suddenly after a delay. Time is in milliseconds.

```markdown
<<delayed time="2000">>Pops in after 2 seconds<</delayed>>
```

## Combining Effects

You can nest markdown inside macros:

```markdown
<<wiggle>>**Bold and shaking!**<</wiggle>>

<<typewriter speed="40">>This *italic* word types out<</typewriter>>
```

## Transitions

Transitions are optional passages that play between two specific passages.

**File naming:** `T-fromID-toID.md`

Example: Going from `intelectualization_I1` to `meta-anxiety_M1`:
- System checks for: `passages/intelectualization/transitions/T-I1-M1.md`
- If found: plays transition, then goes to destination
- If not found: goes directly to destination

## Manifest Files

For random group links, create a `manifest.json` in each group folder:

```json
{
  "passages": ["I1", "I2", "I3", "I4"]
}
```

**Auto-generate manifests:**
```bash
npm run manifests
```

This scans all groups and creates manifest files automatically.

## Game State

The system tracks:
- **Visited passages:** Won't repeat passages in random selection
- **Seeded RNG:** Consistent randomization across sessions
- **Current passage:** For transition lookups

## Development Commands

```bash
npm start           # Start development server
npm run manifests   # Generate manifest.json files
```

Server runs at: http://127.0.0.1:3000

## Example Passage

```markdown
# The Beginning

You find yourself in a <<wiggle>>strange<<</wiggle>> place.

<<fadein delay="1000">>The walls seem to shift around you.<</fadein>>

<<delayed time="2000">>What will you do?<</delayed>>

[[Examine the room|I2]]
[[Leave quickly|@escape]]
[[Face your fears|meta-anxiety_M1]]
```

## Tips

1. **Start simple:** Use basic links and markdown first
2. **Add animations sparingly:** Too many can be overwhelming
3. **Test transitions:** Make sure file names match exactly
4. **Use manifests:** Run `npm run manifests` after adding new passages
5. **Random variation:** Use `@groupName` links for replayability

## Publishing Your Story

### Itch.io (Recommended)

[Itch.io](https://itch.io) is perfect for narrative games and interactive fiction.

**Steps to publish:**

1. **Prepare your project**
   - Remove `node_modules/` and `server.js` (not needed for itch)
   - Test locally with `npm start` to ensure everything works
   - Run `npm run manifests` to update manifest files

2. **Create a ZIP file**
   - Select these files/folders:
     - `index.html`
     - `render.js`
     - `passages/` (entire folder)
     - `generate-manifests.js` (optional, for reference)
     - `package.json` (optional, for reference)
   - Right-click → "Compress to ZIP" or use compression tool
   - Name it something like `my-story.zip`

3. **Upload to itch.io**
   - Go to [itch.io/game/new](https://itch.io/game/new)
   - Fill in title, description, tags
   - Upload your ZIP file
   - Set "Kind of project" to **HTML**
   - Set `index.html` as the main file
   - Check "This file will be played in the browser"
   - Set embed options (recommended: 960x600 or fullscreen)
   - Publish!

**Pricing options:**
- Free
- Paid
- Pay what you want
- No payments (just distribute)

**GitHub Pages** - Free static hosting, good for open-source projects  
**Netlify/Vercel** - Professional hosting with custom domains  
**Your own server** - Full control, requires hosting knowledge

## File Naming Rules

- Passage IDs: Can contain letters, numbers, underscores
- Groups: Use lowercase, no spaces
- Transitions: Must follow `T-fromID-toID.md` pattern exactly
- Extensions: Always use `.md`

## Troubleshooting

**Link not working?**
- Check passage name format: `groupName_passageID`
- Verify file exists at correct path
- Check for typos in file name

**Animation not showing?**
- Verify closing tags: `<</wiggle>>` not `<<wiggle>>`
- Refresh page after editing

## Contributing

Contributions are welcome! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

**Ways to contribute:**
- 🐛 Report bugs or suggest features via GitHub Issues
- 💻 Submit pull requests for improvements
- 📝 Help improve documentation and examples
- 🎨 Create new animation macros or transitions
- 💬 Share your stories and use cases

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**New to the project?** Check the issues labeled "good first issue" or ask questions in GitHub Discussions.

## License

MIT License - see [LICENSE](LICENSE) file for details.

Free to use for personal and commercial projects!
- Check browser console for errors

**Transition not playing?**
- Check transition file name matches pattern
- Verify it's in the source group's transitions folder
- File must be named exactly: `T-fromID-toID.md`

**Random link failing?**
- Run `npm run manifests` to generate manifest.json
- Check manifest includes passage IDs (without group name)
- Verify passages exist in group folder
