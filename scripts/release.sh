#!/usr/bin/env bash
# Cut a release: scripts/release.sh X.Y.Z [--yes]
#
# Checks the tree, bumps package.json to X.Y.Z, rebuilds the committed
# labextension, runs lint and the unit tests, commits "Release X.Y.Z", tags
# vX.Y.Z, and (after asking, unless --yes) pushes main and the tag together.
# The tag push runs .github/workflows/publish-pypi.yml, which publishes to
# PyPI and creates the GitHub release. See RELEASE.md.
#
# Needs jlpm on PATH (e.g. `conda activate mosaic`), and a "## X.Y.Z" section
# in CHANGELOG.md: its text becomes the release notes.
set -euo pipefail

die() { echo "release: $*" >&2; exit 1; }

version="${1:-}"
yes="${2:-}"
[[ -n "$version" ]] || die "usage: scripts/release.sh X.Y.Z [--yes]"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] || die "'$version' is not a version like 2.0.4"
tag="v$version"

cd "$(git rev-parse --show-toplevel)"
command -v jlpm > /dev/null || die "jlpm not found: activate the development environment first"

# -- checks ----------------------------------------------------------------
[[ "$(git branch --show-current)" == main ]] || die "not on main"
git fetch --quiet origin main --tags
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || die "main is not the same as origin/main: pull or push first"
git rev-parse -q --verify "refs/tags/$tag" > /dev/null && die "tag $tag already exists"

# Notebooks and junit.xml in the working tree are allowed to be dirty; what
# goes into the package is not. CHANGELOG.md may carry the new, uncommitted
# section, and is committed with the release.
if ! git diff --quiet HEAD -- package.json src style schema mosaic pyproject.toml; then
  git status --short -- package.json src style schema mosaic pyproject.toml
  die "uncommitted changes in the files above: commit or stash them first"
fi

current=$(node -p "require('./package.json').version")
[[ "$current" != "$version" ]] || die "package.json is already $version"

notes=$(awk -v v="$version" '/^## / { if (found) exit; found = ($2 == v); next } found' CHANGELOG.md)
grep -q '[^[:space:]]' <<< "$notes" || die "CHANGELOG.md has no '## $version' section: add the release notes first"

# -- bump and build ----------------------------------------------------------
echo "release: $current -> $version"
node -e '
  const fs = require("fs");
  const text = fs.readFileSync("package.json", "utf8");
  fs.writeFileSync("package.json", text.replace(/"version": "[^"]*"/, `"version": "${process.argv[1]}"`));
' "$version"

jlpm build:prod
rm -f mosaic/labextension/build_log.json
built=$(node -p "require('./mosaic/labextension/package.json').version")
[[ "$built" == "$version" ]] || die "the rebuilt labextension says $built, not $version"

jlpm lint:check
# jest rewrites the tracked junit.xml; put back whatever was there.
junit_backup=$(mktemp)
cp junit.xml "$junit_backup"
trap 'cp "$junit_backup" junit.xml; rm -f "$junit_backup"' EXIT
jlpm jest

# -- commit and tag ----------------------------------------------------------
git add package.json CHANGELOG.md
git add -A mosaic/labextension
git commit --quiet -m "Release $version"
git tag -a "$tag" -m "Release $version"
git --no-pager log --oneline -1
echo
echo "Release notes:"
echo "$notes"
echo

if [[ "$yes" != "--yes" ]]; then
  read -r -p "Push main and $tag now? This publishes to PyPI. [y/N] " answer
  if [[ "$answer" != [yY]* ]]; then
    # A soft reset: the bump stays in the files, and nothing else is touched.
    echo "Not pushed. To undo: git tag -d $tag && git reset --soft HEAD~1"
    echo "To publish later:    git push --atomic origin main $tag"
    exit 0
  fi
fi

git push --atomic origin main "$tag"
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2> /dev/null || echo robertstrauss/jupytermosaic)
echo "Pushed. Publishing: https://github.com/$repo/actions/workflows/publish-pypi.yml"
