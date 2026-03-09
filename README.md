**You could read through this regular README, or...**

**[Play the Interactive README](https://sambo4118.github.io/passageJS/)** 

*(Run `npm start` first to launch the interactive version)*

---

# PassageJS

A dynamic, Twine-like narrative engine with markdown support, custom animations, and smart transitions. Build interactive fiction and branching narratives with simple markdown files.

**Key advantages over Twine:**
- Built-in spell checking (via VS Code)
- Scales to 100,000+ passages without performance issues
- Uses real markdown with syntax highlighting
- Full control over styling and animations
- Easy to extend with custom macros

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

## Features

- **Markdown-based** - Write in pure markdown with custom extensions
- **Smart linking** - Direct links, relative links, and random group selection
- **Built-in animations** - Wiggle, typewriter, fade-in, and delayed reveals
- **Interactive macros** - Reveal, button, and onclick for dynamic content
- **Transition system** - Smooth passages between story nodes
- **Game state** - Built-in visited tracking and localStorage persistence
- **Save/Load system** - Multiple save slots with autosave
- **Zero dependencies** - Vanilla JavaScript, no build step required
- **Highly customizable** - Easy to extend with your own macros and styles
- **Limitless scope** - Never gets bogged down with huge stories
- **Syntax highlighting** - 190+ languages supported in code blocks

## Quick Start

### Option 1: Clone with Git

```bash
git clone https://github.com/YOUR_USERNAME/passagejs.git
cd passagejs
npm start
# Open http://localhost:3000 in your browser
```

### Option 2: Download ZIP

1. Go to the GitHub repository
2. Click the green **"Code"** button
3. Select **"Download ZIP"**
4. Extract the ZIP file
5. Open terminal/command prompt in the extracted folder
6. Run `npm start`
7. Open http://localhost:3000

### Option 3: Use as Template

1. Click **"Use this template"** on the GitHub repository
2. Create your own repository
3. Clone your new repository
4. Run `npm start`

## Spell Checking Support

Unlike Twine, PassageJS has full spell checking support via VS Code!

**To enable:**

1. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) to open Extensions
2. Search for **"Code Spell Checker"** by Street Side Software
3. Click **Install**
4. Reload VS Code if prompted

**Features:**
- Real-time spell checking with squiggly underlines
- Right-click for spelling suggestions
- Add custom words (character names, fantasy terms, etc.)
- Works across all your `.psg` passage files

## File Structure

```
passages/
  groupName/
    passageID.psg         - Main passage files (markdown)
    manifest.json         - List of passage IDs for random selection
    transitions/
      T-fromID-toID.psg   - Transition passages between specific passages
```

**Note:** PassageJS uses `.psg` (passage) files which are treated as markdown by VS Code.

## Passage Naming

Passages are referenced as: `groupName_passageID`

Examples:
- `menu_title_screen` loads `passages/menu/title_screen.psg`
- `quickstart_landing` loads `passages/quickstart/landing.psg`

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
[[Go to usage guide|usage_landing]]
[[Continue|landing]]
```

### Random Group Links

Link to a random passage from a group (requires manifest.json):

```markdown
[[Display Text|@groupName]]
```

Example:
```markdown
[[Explore random passage|@examples]]
```

### Back Link

Go back to the previous passage:

```markdown
[[Back|@back]]
[[@back]]  <!-- Just shows "@back" as text -->
```

**Note:** The system automatically checks for transitions when navigating to new passages.

## Animation Macros

### Background Color

Changes the background color of the entire page:

```markdown
<<bgcolor color="#1f1f1f">>
<<bgcolor color='darkblue'>>
```

### Text Color

Changes text color globally or for a specific block:

```markdown
<<textcolor color="#f5f5f5">>
<<textcolor color='lightgreen'>>
<<textcolor color="#ff6b6b">>Only this text is red<</textcolor>>
```

- Unclosed form sets global default page text color
- Closed form colors only wrapped content

### Wiggle (Anxious Shake)

Makes text shake with a chaotic, anxious animation. Each letter moves independently. Supports markdown formatting.

```markdown
<<wiggle>>This text shakes nervously<</wiggle>>
<<wiggle>>**Bold and shaking!**<</wiggle>>
```

### Typewriter

Reveals text letter by letter. Speed is in milliseconds per character. Does not support markdown (breaks character parsing).

```markdown
<<typewriter speed="50">>This types out slowly<</typewriter>>
<<typewriter speed="20">>This types faster<</typewriter>>
```

### Fade In

Text fades in with a delay. Delay is in milliseconds. Supports markdown.

```markdown
<<fadein delay="1000">>Appears after 1 second<</fadein>>
<<fadein delay="2500">>This has **bold** text<</fadein>>
```

### Delayed Reveal

Text appears suddenly after a delay. Time is in milliseconds. Supports markdown.

```markdown
<<delayed time="2000">>Pops in after 2 seconds<</delayed>>
```

## Interactive Macros

### Onclick Reveal Mode

Progressive reveal system using `onclick` - click labeled text to reveal hidden content. Perfect for branching narrative moments.

```markdown
<<onclick text="Click me">>This was hidden!<</onclick>>
<<onclick text="Continue...">>More content<</onclick>>
<<onclick text="And then?">>Even more!<</onclick>>
```

**Behavior:**
- If `text` and body content are both present, it behaves as click-to-reveal
- If body content is present but `text` is omitted, it reveals on non-interactive page clicks
- Clicking the label reveals hidden content
- Optional `action` or `js` runs JavaScript on the same click
- Supports markdown in both clickable text and hidden content

### Button

Creates an interactive button that runs JavaScript when clicked:

```markdown
<<button text="Click Me" onclick="alert('Hello!')">>
<<button text="**Bold Button**" onclick="console.log('clicked')">>
```

### On Click

Makes text clickable and runs JavaScript when clicked:

```markdown
<<onclick action="alert('Clicked!')">>Click this text<</onclick>>
<<onclick action="console.log('test')">>Check the **console**<</onclick>>
```

## Combining Effects

You can nest macros and markdown for complex effects:

```markdown
<<wiggle>>**Bold and shaking!**<</wiggle>>

<<fadein delay="1000">>
  <<wiggle>>**This fades in, then wiggles!**<</wiggle>>
<</fadein>>

<<onclick text="What happens next?">>
  <<typewriter speed="30">>The story continues...<</typewriter>>
<</onclick>>
```

**For a complete interactive macro reference,** run `npm start` and navigate to the usage guide in the interactive readme!

## Transitions

Transitions are optional passages that play between two specific passages when using random group links (`group/*`). They create smooth narrative bridges between randomly selected content.

**How it works:**
- Only triggered by random group links (e.g., `[[Next|example/title/*]]`)
- System checks current passage's group for: `transitions/T-currentPassageID-selectedPassageID.psg`
- If transition exists: plays transition first, then navigates to selected passage
- If not found: navigates directly to the randomly selected passage

**File structure:**
```
passages/
  menu/
    title-screen.psg
    transitions/
      T-title-screen-main-menu-1.psg
      T-title-screen-main-menu-2.psg
```

**Example:** From `menu/title-screen` clicking `[[Start|example/title/*]]`:
1. System randomly picks `example/title/main-menu-1`
2. Checks for: `menu/transitions/T-title-screen-main-menu-1.psg`
3. If found: shows transition → then shows main-menu-1
4. If not: shows main-menu-1 directly

## Manifest Files

For random group links, create a `manifest.json` in each group folder:

```json
{
  "passages": ["landing", "intro", "chapter1", "chapter2"]
}
```

**Auto-generate manifests:**
```bash
npm run manifests
```

This scans all groups and creates manifest files automatically.

## Game State & Save System

The system automatically tracks:
- **Visited passages:** Won't repeat passages in random selection
- **Seeded RNG:** Consistent randomization across sessions
- **Current passage:** For transition lookups
- **Previous passage:** For @back navigation
- **Save slots:** Multiple manual saves plus autosave

**Save controls** are available in the top-right corner when playing.

## Development Commands

```bash
npm start           # Start development server
npm run manifests   # Generate manifest.json files
npm run build       # Bundle engine into dist/ for deployment
npm run update      # Pull template updates (keeps passages/ untouched)
npm run update:dry  # Preview what would change before updating
```

Server runs at: http://localhost:3000

## Syncing Template Updates

If your story repo was created from this template, you can pull engine and structure updates without overwriting your story content in `passages/`.

1. Add this template repo as an upstream remote (one-time setup):

```bash
git remote add upstream https://github.com/sambo4118/passageJS.git
```

2. Preview incoming changes:

```bash
npm run update:dry
```

3. Apply the update when you're ready:

```bash
npm run update
```

What it does:
- Syncs all template files except anything under `passages/`
- Never overwrites your `.psg` files or passage manifests
- Supports local testing with `node sync-template.js --source ../some-template-clone --dry-run`
- Optional cleanup mode with `node sync-template.js --prune` to delete non-passage files removed upstream

## Tips

1. **Start simple:** Use basic links and markdown first
2. **Add animations sparingly:** Too many can overwhelm readers
3. **Use spell check:** Take advantage of VS Code's spell checking (see above)
4. **Test transitions:** Make sure file names match exactly
5. **Use manifests:** Run `npm run manifests` after adding new passages
6. **Random variation:** Use `@groupName` links for replayability
7. **Code blocks protected:** Macros inside ` ``` ` blocks won't execute
```

Server runs at: http://127.0.0.1:3000

## Example Passage

Here's a sample passage showcasing various features:

```markdown
<<bgcolor color="#1f1f1f">>

# The Beginning

You find yourself in a <<wiggle>>strange<<</wiggle>> place.

<<fadein delay="1000">>The walls seem to shift around you.<</fadein>>

<<delayed time="2000">>What will you do?<</delayed>>

<<onclick text="Look closer...">>
You notice something unusual about the shadows.
<</onclick>>

<<onclick text="Investigate further">>
A hidden door reveals itself!
<</onclick>>

[[Examine the room|chapter2_room]]
[[Leave quickly|@escape]]
[[Go back|@back]]
```

**Output**: Creates a dark-themed passage with animated text, progressive reveals, and multiple navigation options.

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

1. **Build your project**
   - Run `npm run build` to bundle everything into `dist/`
   - The build packs all engine JS into a single `engine.min.js`
   - Your passages are copied as-is

2. **Create a ZIP file**
   - ZIP the entire `dist/` folder contents:
     - `index.html`
     - `engine.min.js`
     - `styles.css`
     - `passages/` (entire folder)
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
- Transitions: Must follow `T-fromID-toID.psg` pattern exactly
- Extensions: Always use `.psg` (configured to be treated as markdown in VS Code)

## Troubleshooting

**"Passage not found" error?**
- Check file naming: `groupName_passageID` matches `passages/groupName/passageID.psg`
- Verify file extension is `.psg` (not `.md`)
- Check for typos in passage name

**Link not working?**
- Check passage name format: `groupName_passageID`
- Verify file exists at correct path
- For group links, verify manifest.json exists

**Animation not showing?**
- Verify closing tags: `<</wiggle>>` not `<<wiggle>>`
- Refresh page after editing
- Check browser console (F12) for errors

**Macro showing as plain text?**
- Make sure you're not inside a code block (` ``` `)
- Check for proper syntax with quotes
- Verify the macro is supported

**Transition not playing?**
- Check transition file name matches pattern: `T-fromID-toID.psg`
- Verify it's in the source group's transitions folder
- File must be named exactly with correct IDs

**Random link failing?**
- Run `npm run manifests` to generate manifest.json
- Check manifest includes passage IDs (without group name)
- Verify passages exist in group folder

**Save/Load not working?**
- Check browser localStorage isn't disabled
- Try a different browser
- Clear browser cache and reload

## Contributing

Contributions are welcome! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

**Ways to contribute:**
- Report bugs or suggest features via GitHub Issues
- Submit pull requests for improvements
- Help improve documentation and examples
- Create new animation macros or transitions
- Share your stories and use cases

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines, or run `npm start` and check out the **interactive contributor guide** in the app.

**New to GitHub?** The interactive guide walks you through forking, branching, committing, and creating pull requests step-by-step!

## License

MIT License - see [LICENSE](LICENSE) file for details.

Free to use for personal and commercial projects!
