# GitHub Publishing Checklist

Follow these steps to publish PassageJS and start attracting contributors.

## Pre-Publishing ✅

- [x] Create LICENSE file (MIT)
- [x] Create CONTRIBUTING.md
- [x] Create ROADMAP.md
- [x] Create .gitignore
- [x] Update package.json with metadata
- [x] Add GitHub issue templates
- [x] Update README with badges and features

## Rename Project Folder ⚠️

Your current folder is named `whatIwillIdo` - you should rename it to `passagejs`:

```powershell
# In the parent directory (javascript/)
cd c:\Users\hoelk\Documents\javascript
Rename-Item "whatIwillIdo" "passagejs"
cd passagejs\passagejs
# Or rename the nested folder structure as needed
```

## GitHub Setup

### 1. Create Repository
- Go to https://github.com/new
- Repository name: `passagejs`
- Description: "A dynamic, Twine-like narrative engine with markdown support"
- Public repository (for open source)
- Don't initialize with README (you already have one)
- Click "Create repository"

### 2. Push to GitHub

```bash
# Initialize git (in the passagejs project folder)
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: PassageJS narrative engine"

# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/passagejs.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Configure Repository Settings

On GitHub, go to Settings:

**General:**
- Add topics/tags: `javascript` `narrative-game` `interactive-fiction` `twine` `markdown` `game-engine` `storytelling`
- Enable "Issues" and "Discussions"

**Issues:**
- Create labels: `good first issue`, `help wanted`, `documentation`, `enhancement`, `bug`

**Pages (Optional):**
- Enable GitHub Pages to host a demo
- Source: main branch, /docs folder or root

## Create Initial Issues

Create 3-5 beginner-friendly issues with label "good first issue":

**Example issues:**
1. "Add shake animation macro"
2. "Create tutorial example story"
3. "Add passage statistics command (word count, passage count)"
4. "Improve error messages for missing files"
5. "Add dark/light theme toggle"

## Marketing & Outreach

### 1. Write Announcement Post

Template:
```
🎮 PassageJS - Open Source Narrative Engine

I've built a lightweight alternative to Twine with:
- Markdown-based passages
- Custom animation macros
- Smart transitions
- Zero dependencies

Perfect for interactive fiction, visual novels, and branching narratives.

Looking for contributors! Check it out: [GitHub link]

#InteractiveFiction #GameDev #OpenSource
```

### 2. Share in Communities

**Week 1:**
- [ ] Post on r/interactivefiction
- [ ] Post on r/gamedev
- [ ] Share on Twitter/Mastodon with hashtags
- [ ] Post in Itch.io forums (Tools & Game Development)

**Week 2:**
- [ ] Post on intfiction.org forums
- [ ] Share on Hacker News (Show HN: ...)
- [ ] Post in relevant Discord servers (game dev, web dev)

**Week 3:**
- [ ] Write a blog post or dev.to article
- [ ] Create demo video (2-3 minutes)
- [ ] Create example story to showcase features

### 3. Sample Reddit Post

**Title:** "[Open Source] PassageJS - A markdown-based narrative engine"

**Body:**
```
Hi! I built PassageJS, an open-source alternative to Twine with some different design choices:

**Key Features:**
- Write passages in pure Markdown
- Dynamic loading (no single-file export bloat)
- Built-in animations (wiggle, typewriter, fade-in)
- Smart transitions between passages
- Zero dependencies, no build step

**Why I built it:**
[Explain your motivation - maybe frustrations with Twine, desire for markdown, etc.]

**Looking for:**
- Feedback from interactive fiction creators
- Contributors (especially good for first-time open source contributors)
- Use cases I haven't thought of

GitHub: [link]
Demo: [link if you make one]

Happy to answer questions!
```

## Respond to Contributors

- Reply to issues within 24-48 hours
- Welcome first-time contributors warmly
- Label PRs with "awaiting review"
- Thank people for contributions
- Be patient with newcomers

## Ongoing Maintenance

- [ ] Update ROADMAP.md based on community feedback
- [ ] Tag releases with semantic versions (v1.0.0, v1.1.0)
- [ ] Write changelog for each release
- [ ] Pin helpful issues to the top
- [ ] Create a wiki or documentation site when project grows

---

**Ready to publish?** Run through this checklist and you'll be set for attracting contributors!
