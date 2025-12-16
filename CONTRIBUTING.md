# Contributing to Shepherd AI

Thank you for considering contributing to Shepherd AI! 🙏

## How to Contribute

### Reporting Bugs
1. Check [existing issues](../../issues) first
2. Use the bug report template
3. Include steps to reproduce
4. Add screenshots if applicable

### Suggesting Features
1. Check [existing feature requests](../../issues?q=is%3Aissue+label%3Aenhancement)
2. Open a new issue with `[FEATURE]` prefix
3. Describe use case and expected behavior

### Code Contributions

#### Setup Development Environment
```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/shepherd-ai.git
cd shepherd-ai

# Install dependencies
cd "Agent File"
npm install

cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Making Changes
1. Create a branch: `git checkout -b feature/amazing-feature`
2. Make your changes
3. Test thoroughly
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

#### Code Style
- **Frontend:** Follow TypeScript/React best practices
- **Backend:** Follow PEP 8 (Python)
- **Commits:** Use conventional commits (`feat:`, `fix:`, `docs:`)

#### Testing
- Add tests for new features
- Ensure all tests pass
- Manual testing checklist in PR description

### Documentation
- Update README.md if needed
- Add JSDoc/docstrings to new functions
- Update relevant docs in `/docs`

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn

## Questions?

Open a [discussion](../../discussions) or reach out to [your.email@example.com]

**Thank you for helping build Shepherd AI!** 🚀
