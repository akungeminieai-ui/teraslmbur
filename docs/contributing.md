# Teras Lmbur OS — Contribution Rules & Best Practices

Please align your code revisions and branch creation patterns with the guidelines below.

---

## 1. Branch Naming Policies

Create descriptive operational branches:
- `feat/description-here`: New components or capabilities.
- `fix/bug-details`: Code defects resolutions.
- `refactor/target-module`: Code refactoring without behavioral modifications.
- `chore/task-name`: Settings, configurations, or dependency maintenance.

---

## 2. Commit Message Guidelines

All commits must follow **Conventional Commits** syntax:
```
<type>(<scope>): <short description>
```

### Supported Types
- `feat`: New business capability or UI element.
- `fix`: Code defect resolution.
- `docs`: Documentation updates.
- `refactor`: Structural modifications without behavior changes.
- `test`: Adding missing unit tests.
- `chore`: Version updates, config tweaks, locks maintenance.

### Examples
- `feat(catalog): add product variant templates support`
- `fix(auth): fix token rotation database error`
- `chore(deps): update prisma client dependency`

---

## 3. Pull Request Standards

- Ensure `pnpm turbo build` completes with zero TypeScript warnings before opening a PR.
- Always include an updated ADR if introducing new domain entities or database models.
