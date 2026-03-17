# Contributing Guide

Thank you for your interest in SketchToCode! This document provides guidelines for contributing.

## Code of Conduct

- Be respectful and inclusive
- No harassment or discrimination
- Constructive feedback only
- Respect intellectual property

## Getting Started

### 1. Fork & Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/UI-UX-ML-Sketch-to-code.git
cd UI-UX-ML-Sketch-to-code

# Add upstream remote
git remote add upstream https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code.git
```

### 2. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-fix-name
```

Follow naming convention:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test improvements

### 3. Setup Development Environment

```bash
npm install --legacy-peer-deps
cp .env.local.example .env.local
# Add your API key to .env.local
npm run dev
```

## Development Workflow

### Code Style

We use **ESLint** for code quality. Run before committing:

```bash
npm run lint
npm run lint -- --fix # Auto-fix issues
```

### TypeScript

- Strict mode enabled
- No `any` types (use proper typing)
- Document complex types

```typescript
// ✅ Good
interface GenerationOptions {
  image: string;
  timeout?: number;
}

// ❌ Avoid
const generate = (options: any) => { ... }
```

### Component Guidelines

- One component per file
- Use TypeScript interfaces for props
- Prefer functional components with hooks
- Memoize expensive operations

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function MyButton({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### Naming Conventions

- Components: `PascalCase` (MyComponent.tsx)
- Hooks: `camelCase` (useMyHook.ts)
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: Match component name or descriptive

### Comments & Documentation

- JSDoc for functions:
  ```typescript
  /**
   * Generates HTML code from sketch image
   * @param image - Base64-encoded PNG image
   * @returns Generated HTML code
   */
  async function generateCode(image: string): Promise<string>
  ```

- Inline comments for complex logic:
  ```typescript
  // Use exponential backoff for retries
  const delay = baseDelay * Math.pow(2, retryCount);
  ```

- TODO comments with context:
  ```typescript
  // TODO: Add batch processing support (issue #123)
  ```

## Testing

### Run Tests

```bash
npm test
```

### Test Guidelines

- Test user workflows, not implementation
- Use descriptive test names
- Aim for >80% coverage

```typescript
describe("useGenerate", () => {
  it("should append chunks to generated code", async () => {
    // Arrange
    const { result } = renderHook(() => useGenerate());
    
    // Act
    result.current.appendGeneratedCode("test");
    
    // Assert
    expect(result.current.code).toBe("test");
  });
});
```

## Git Workflow

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]
[optional footer]
```

Examples:
```
feat(canvas): add text tool support
fix(api): handle rate limiting errors
docs(readme): update installation instructions
refactor(store): simplify state initialization
test(hooks): add useGenerate test cases
```

### Before Committing

```bash
# Check code quality
npm run lint -- --fix

# Run tests
npm test

# Verify TypeScript
npx tsc --noEmit
```

### Pull Request Process

1. **Sync with upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push to your fork:**
   ```bash
   git push origin feature/your-feature
   ```

3. **Create PR on GitHub:**
   - Clear title describing change
   - Reference related issues
   - Describe what & why
   - Include screenshots for UI changes

**PR Template:**
```markdown
## Description
Brief description of changes

## Related Issue
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing
How to test this change

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings generated
```

4. **Address Reviews:**
   - Respond to feedback
   - Make requested changes
   - Resolve conversations

5. **Merge:**
   - Maintainers merge when approved
   - Squash commits when appropriate

## Issue Guidelines

### Reporting Bugs

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: 
- Node version:
- npm version:
- Browser:

## Screenshots/Logs
Add relevant logs or screenshots
```

### Feature Requests

```markdown
## Description
What feature would you like?

## Motivation
Why is this needed?

## Proposed Solution
How should it work?

## Alternative Solutions
Other approaches considered
```

## Documentation

### Update These Files

- **README.md** - For user-facing features
- **docs/ARCHITECTURE.md** - For technical changes
- **docs/API_DOCUMENTATION.md** - For API changes
- **Code comments** - For complex logic

### Documentation Standards

- Clear, concise language
- Code examples where helpful
- Links to relevant sections
- Keep updated with code

## Project Structure

### Adding a New Component

```typescript
// src/components/MyComponent.tsx
import { memo } from "react";

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent = memo(function MyComponent({
  title,
  onAction
}: MyComponentProps) {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  );
});

MyComponent.displayName = "MyComponent";
```

### Adding a New Hook

```typescript
// src/hooks/useMyHook.ts
import { useCallback, useState } from "react";

export function useMyHook(initialValue: string) {
  const [value, setValue] = useState(initialValue);

  const updateValue = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return { value, updateValue };
}
```

### Adding Dependencies

Discuss major new dependencies in an issue first. When adding:

```bash
npm install package-name --legacy-peer-deps
```

Update peer info in PR.

## Performance Guidelines

- Avoid unnecessary re-renders (use `memo`, `useCallback`)
- Lazy load heavy components
- Optimize images
- Minimize bundle size

```typescript
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  ssr: false
});
```

## Security Guidelines

- No secrets in code
- Sanitize user input
- Follow OWASP guidelines
- Report security issues privately

## Release Process

Maintainers follow semantic versioning:
- **MAJOR** - Breaking changes (1.0.0)
- **MINOR** - New features (1.1.0)
- **PATCH** - Bug fixes (1.1.1)

## Getting Help

- **Questions:** Open a Discussion
- **Bugs:** Open an Issue
- **Ideas:** Discuss in Issues first
- **Community:** Check existing discussions

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Best Practices](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Recognition

Contributors are recognized in:
- Commit history
- GitHub contributors page
- Release notes (for significant contributions)

Thank you for contributing! 🎉

---

**Questions?** Open an issue or start a discussion!
