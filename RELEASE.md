# Making a new release of jupyter-mosaic

A release is a tag push. Pushing `vX.Y.Z` runs
[`publish-pypi.yml`](.github/workflows/publish-pypi.yml), which builds the
package from that tag, publishes it to [PyPI](https://pypi.org/project/jupyter-mosaic/)
and creates the GitHub release. `scripts/release.sh` prepares and pushes the tag.

## Steps

1. Add a section for the new version to [`CHANGELOG.md`](CHANGELOG.md), below
   the `END NEW CHANGELOG ENTRY` marker and above the previous release:

   ```markdown
   ## 2.0.4 (2026-12-01)

   One line on what the release is about.

   **Fixed**

   - ...
   ```

   Its text becomes the GitHub release notes, with an install line added.

2. On an up-to-date `main`, in the development environment (where `jlpm` is on
   `PATH`), run:

   ```bash
   scripts/release.sh 2.0.4
   ```

   It stops before changing anything unless: you're on `main` and level with
   `origin/main`, there are no uncommitted changes to the package's files, the
   tag is new, and `CHANGELOG.md` has the section. Then it
   - sets the version in `package.json`,
   - rebuilds the committed labextension (`jlpm build:prod`),
   - runs `jlpm lint:check` and the unit tests,
   - commits `Release 2.0.4` and tags `v2.0.4`,
   - asks, then pushes `main` and the tag together (`--yes` skips the question).

   Answering no leaves the commit and tag local; the script prints how to push
   them later or undo them.

3. Watch the [Publish to PyPI](https://github.com/robertstrauss/jupytermosaic/actions/workflows/publish-pypi.yml)
   run. It checks that the tag, `package.json` and the committed labextension
   agree on the version, builds and checks the wheel, publishes to PyPI, then
   creates the GitHub release with the wheel and sdist attached.

## If something fails

- **The workflow failed before publishing** (version mismatch, missing
  changelog section, build error): delete the tag with
  `git push origin :refs/tags/vX.Y.Z` and `git tag -d vX.Y.Z`, fix the problem
  on `main`, and release again.
- **It failed after publishing, or the release step failed**: re-run it from the
  Actions tab, choosing the tag (not a branch) under "Use workflow from". Files
  already on PyPI are skipped and an existing GitHub release is kept.
- A version can never be uploaded to PyPI twice, even after deleting it there.
  If a broken version was published, release the next patch version.

## How publishing is authorised

PyPI [trusted publishing](https://docs.pypi.org/trusted-publishers/): there is
no API token. PyPI accepts uploads from this repository's `publish-pypi.yml`
workflow running in the `pypi` environment. Renaming the workflow file or the
environment breaks publishing until the publisher in the PyPI project settings
is changed to match.

## Building locally

To build the sdist and wheel without publishing:

```bash
pip install build
python -m build
```

The labextension bundle in `mosaic/labextension` is committed, so this does not
need Node; run `jlpm build:prod` first if the TypeScript or CSS changed.

## Unused template workflows

`prep-release.yml` and `publish-release.yml` come from the extension template's
[Jupyter Releaser](https://github.com/jupyter-server/jupyter_releaser) setup and
are not used for releases. `check-release.yml` still runs on every push as a
packaging check.
