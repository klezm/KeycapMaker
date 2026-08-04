# .github/workflows

The place for GitHub Actions and GitHub Pages deployment workflows.

## What will go here going forward

- The deployment workflow to GitHub Pages
- Build verification or static checks as needed

This repository has already added [deploy-pages.yml](deploy-pages.yml) as part of Task 10.

## GitHub Pages deployment conditions

- Deploy automatically only on pushes to the `main` branch
- Concentrate normal development on `dev`, and only make it live when `dev` is pushed / merged into `main`
- Do not deploy on pushes to branches other than `main`, such as `feat/*`
- Do not deploy for changes that only touch things unrelated to the served web resources, such as `docs/` or README files
- Limit the target paths to implementation files under `src/`, `public/`, `scad/**/*.scad`, `index.html`, and Vite / npm configuration
