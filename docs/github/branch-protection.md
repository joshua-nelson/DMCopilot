# Branch protection (GitHub)

This repo is intended to run with branch protection on `main`.

Apply these settings in **GitHub → Settings → Branches → Branch protection rules**.

## Rule: `main`

### Require pull request before merging

- Require a pull request before merging: **ON**
- Required approvals: **1** (raise later if needed)
- Dismiss stale pull request approvals when new commits are pushed: **ON**
- Require review from Code Owners: **OFF** (turn on if/when CODEOWNERS is added)
- Require approval of the most recent push: **ON**

### Require status checks to pass before merging

- Require status checks to pass before merging: **ON**
- Require branches to be up to date before merging: **ON**
- Required checks:
  - **CI / CI** (from `.github/workflows/ci.yml`)

### Additional protections (recommended)

- Require conversation resolution before merging: **ON**
- Require linear history: **ON** (optional; enables fast-forward merges only)
- Include administrators: **ON**

### Force pushes / deletions

- Allow force pushes: **OFF**
- Allow deletions: **OFF**
