# Contributing to Passage Renderer

Thank you for your interest in contributing! This project aims to be a flexible, markdown-based narrative engine for interactive fiction creators.

## Ways to Contribute

### 🐛 Bug Reports
Found a bug? Open an issue with:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser/Node version

### 💡 Feature Requests
Have an idea? Open an issue describing:
- The feature you'd like
- Why it would be useful
- Example use cases

### 📝 Documentation
Help improve the docs by:
- Fixing typos or unclear explanations
- Adding examples
- Creating tutorials
- Translating documentation

### 💻 Code Contributions
Pull requests welcome for:
- Bug fixes
- New animation macros
- Performance improvements
- New features (discuss in an issue first)

## Development Setup

1. Clone the repository
2. No build step needed - it's vanilla JS!
3. Run `npm start` to start the dev server
4. Make changes and test at `http://localhost:8080`

## Coding Guidelines

### Style
- Use ES6+ features (const, arrow functions, etc.)
- Keep functions small and focused
- Add comments for complex logic
- Use descriptive variable names

### File Organization
- `render.js` - Core rendering engine
- `index.html` - Entry point and CSS
- `server.js` - Development server
- `passages/` - Example content

### Testing
Before submitting:
- Test in multiple browsers (Chrome, Firefox, Safari)
- Verify all existing examples still work
- Add example passages for new features
- Check that `npm run manifests` generates correct files

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`feature/new-animation` or `fix/link-parsing`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages:
   - `feat: add shake animation macro`
   - `fix: resolve relative link parsing bug`
   - `docs: improve animation syntax examples`
6. Push to your fork
7. Open a pull request with:
   - Description of changes
   - Why the change is needed
   - Any breaking changes

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on the idea, not the person
- Assume good intentions

## Questions?

- Open a GitHub Discussion for general questions
- Use Issues for specific bugs/features
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT suggested).

---

**New to open source?** Check out [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
