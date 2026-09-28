# Temporary GitHub Pages preview

User requested temporary GitHub deployment and a link, after requesting white intro text and block-by-block scroll motion.

- Intro body explicitly uses white with a scoped selector.
- Existing IntersectionObserver reveal behavior now covers section headings, step copy, feature video, creator content, crosswalk and beta invitation. Home transitions use 32px / 650ms desktop, 20px / 500ms mobile, ease-out and one-time entry; reduced-motion displays content immediately. Existing keyed 3D animation behavior is unchanged.
- Base-aware client routes and navigation support GitHub project Pages. Generated 28 locale/page entries plus website index and 404 fallback.
- Private source repository preserved. GitHub rejected Pages on the private repository with HTTP 422 (current plan unsupported). Created public static-artifact repository `echuu-ai/echuu-website-preview` and enabled main-root Pages. No secrets, environment files, source maps or source tree included in the artifact.
- Build, 9 tests and 107 asset checks passed. All generated HTML/CSS resource paths checked against project prefix. GitHub deployment status recorded separately after publish.
- No browser screenshot acceptance claimed: browser bridge was unavailable in previous attempts.

The supplied sync helper requires PowerShell, absent on this host. Portable runtime download failed repeatedly. The separate clean deployment checkout was synchronized with `git pull --ff-only` (already up to date) before adding artifacts; no stash, reset, force push, or source-repository mutation was used for deployment.

## Published

- Git HTTPS push failed with empty server replies; direct API upload of the 31MB model also timed out. Uploaded large resources as 750KB chunks, verified local reassembly byte-for-byte, and added a public GitHub Actions workflow to restore them before Pages artifact deployment.
- Updated remote main using a non-forced GitHub API ref update with the current remote commit as parent. Source repository remains private and its current implementation changes are local (not committed/pushed in this deployment).
- Published commit: `ad73c83c513096875b651c83e9a7570b0f4f1ae9`.
- GitHub Actions run `36446432835`: completed, success.
- Preview: https://echuu-ai.github.io/echuu-website-preview/website/zh/
- Future updates must regenerate chunk manifest/parts when changing large assets; the public workflow reconstructs those paths before publishing.
