# Sourdough

This template project is part of Sourdough, a set of JavaScript templates that
were originally developed at Northeastern for their Software Engineering class
in spring of 2026.

## Vite+Express Full-stack React Application with Workspaces

This project has three parts, which together form an
[npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) project.

1.  A minimal Express transcript API for a very simple transcript server (in
    the `./server` directory)
2.  A Vite frontend for a simple React application that uses the API server
    (this lives in the `./frontend` directory)
3.  Shared Zod validation and type definitions (in the `./shared` directory)

The shared Zod validation is why the move to workspaces is desirable in the
first place: it's common practice to keep frontend and backend code separate
and to define a separate project that acts as a "single source of truth" for
the API's types and that is subsequently imported by both frontend and
backend. Zod validators and shared types are one of the most common things
that a project might share between the frontend and the backend.

The way this project runs in "production mode" versus "development mode" is
very different.

### Production Mode

Production mode is simpler: there's one server running, the Express server, on
port 3000, accessible via the url <http://localhost:3000>. When a GET request
doesn't match any existing API endpoints, the Express server looks in
`./frontend/dist` to see if there's a file it can serve from that directory.
Files are put in that directory when `npm run build` calls the `vite build`
command.

The `vite build` step is necessary because we're writing our frontend code in
TypeScript, but browsers can't do type stripping like Node can — we have to do
some transformation on the code we're writing to make it browser-friendly.
(Vite is doing a bunch of other transformations for other reasons as well.)

### Development Mode

Development mode is a little trickier to explain. When developing, we want our
browser to be connecting to Vite's "development web server", not to Express,
because Vite does a lot of nifty stuff to make sure that when we change our
TypeScript code, it **reloads the web page**. That is _very_ handy for
frontend web development.

However, this means your "frontend code" — the HTML and JS that the browser is
supposed to run being served by the Vite development web server — is coming
from a different server than the Express server that's handling API requests.
The default convention is that Vite development web server is accessed via
<http://localhost:5173>, and the Express API server is accessible via
<http://localhost:3000>. If you try to have a website that is being served
from a different website than the API service it is using, you're going to
have to gain a nightmarish amount of literacy with
[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS). (A
different port on `localhost` counts as a different website.) This wasn't a
problem in production mode: your entire website is coming from the Express
server. You really want your website to look like it's _all_ coming from a
single server during development too.

The easy way to do this is to have the development server _only_ respond to
API requests, and have the Vite development server forward all API requests to
the Express server. This is called "proxying", and it means that you can
access a complete Vite server from <http://localhost:5173>. (The Vite
development server needs to know what an API request is: it's configured to
treat every route starting with `/api` as an API endpoint.)

### Express API

The Express server's API has the following endpoints:

| Endpoint             | Method | Description                         |
| -------------------- | ------ | ----------------------------------- |
| `/api/addStudent`    | POST   | Add a new student                   |
| `/api/addGrade`      | POST   | Add a grade for an existing student |
| `/api/getTranscript` | POST   | Look up information for a student   |

## Base configuration

The base project configuration follows a philosophy of "minimalism, mostly."
Project configuration should be minimal and have a bias towards implicit
defaults. Deviations from this principle should be justified and documented
(here or elsewhere).

Notable exceptions to this principle:

- `.gitignore` takes a kitchen-sink approach and should freely accept
  additions. (For example, if a student accidentally checks in a file that
  could have been ignored, it makes sense to add that file here.)

- The ESLint configuration is a maximalist attempt at keeping new TypeScript
  programmers on the rails in a complicated codebase, and also giving them a
  sense of working inside style conventions of a project that may differ from
  their own.

- If we can have all project variants using the _exact_ same `tsconfig.json`
  file or `eslint.config.mjs` file by adding a bit of cruft to the base
  configuration, that's a reasonable trade. Things are going to inevitably get
  copy-pasted, and so the fewer copies of configuration files there are, the
  better.

  This is why the `.vscode/settings.json` applies Prettier to html and css
  files even though that's not relevant to the base project, and why
  `eslint.config.mjs` includes React's Rules of Hooks despite most of the
  project variants not including any React code.

### NPM Scripts

This sets up a set of commands that projects should consistently support, when
appropriate:

- `npm run check` runs TypeScript
- `npm run lint` runs ESLint, and `npm run lint:fix` runs eslint with the
  `--fix` option
- `npm run prettier` checks formatting, and `npm run prettier:fix` writes
  formatted files back to disk
- `npm run test` runs appropriate tests on all projects: vitest without
  coverage for the shared project (it's mostly validators and types anyway),
  vitest with coverage for the API server, and Playwright end-to-end tests in
  the frontend project that exercise the frontend and backend together
- `npm run playwright` runs the Playwright end-to-end tests with the
  interactive Playwright UI
- `npm run dev` starts a development server or watch process
- `npm run build` prepares the project for production-style deployment
- `npm start` runs the project in production mode

These are tested by github actions in `.github/workflows/main.yml`.

### ESLint

This base project has an opinionated ESLint configuration that relies on
[typed linting](https://typescript-eslint.io/getting-started/typed-linting).
The ESLint configuration makes some assumptions about project structure:

- Frontend code is code that lives in `./frontend` or `./client`, and
  optionally uses React and JSX. This code is subject to different linter
  rules.
- Test code lives in a `**/tests` directory OR has a `*.spec.ts(x)` or a
  `*.test.ts(x)` filename. Tests can use devDependencies, unlike other code.
- Config files all have `*.config.mjs` filenames (vite, vitest, playwright,
  and eslint all can follow this convention). Config files can also import
  devDependencies, like tests but unlike other code.
- Most everything should be registered as `error`. Warnings don't fail CI
  checks. Exceptions should have a documented reason. Notable exceptions where
  we either turn on warnings or leave the warn default in place:
  - `no-console` is `warn` because no-console regularly gets turned off by
    line or file specific rules: we want to discourage excessive `no-console`
    use but it is more like the admonition to not check in commented-out code:
    it's mostly a problem when done excessively and it's easy to check in
    visual inspection.
  - `prettier` is `warn` because red squigglies for `prettier` are especially
    distracting and we can check for prettier failures in CI separately.
  - `simple-import-sort/imports` is `warn` — it's a property much like
    prettier in that it's a mechanical fix and the red squigglies are
    extremely distracting. It's also no huge loss if this doesn't get flagged
    in CI.
  - We do not override the default setting of `warn` for
    `react-hooks/exhaustive-deps` in the default configuration. This rule
    makes the (horrible) suggestion to remove the dependency array, and people
    breaking their projects by blindly following that suggestion would be a
    bad outcome.

### TypeScript

TypeScript is configured with options that support
[type stripping](https://nodejs.org/api/typescript.html#type-stripping).
Beyond this, the TypeScript configuration enables
`noFallthroughCasesInSwitch`, `noImplicitOverride`, `noImplicitReturns`, and
`noUncheckedIndexedAccess`, which are linter-like properties that don't seem
to be well-supported by typed linting in ESLint.

[Matt Pocock's cheat sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)
is a reasonable source for more on minimal typescript configuration.

### Prettier

The `.prettierrc` file is intended to use some reasonable defaults. A
`.vscode/settings.json` file is added to encourage Visual Studio Code to treat
Prettier as the default formatter for javascript, typescript, json, css, and
html files even if a students' global configuration uses other defaults.

### LF Line Endings

The `.prettierrc`, `.gitattributes`, and `.vscode/settings.json` files
conspire to generally force projects to use `\n` file endings instead of
Windows-style `\r\n` line endings (LF instead of CRLF).

## Project Tree

The various Sourdough starters live in a single git repository as a series of
Git branches that build off of one another.

- [`base`](https://github.com/robsimmons/sourdough/tree/base), the base
  configuration
- [`express`](https://github.com/robsimmons/sourdough/tree/express), adds an
  Express server and API tests
- [`fullstack`](https://github.com/robsimmons/sourdough/tree/fullstack), adds
  a Vite frontend (+ Playwright end-to-end tests) for a simple client/server
  setup
- [`fullstack-react`](https://github.com/robsimmons/sourdough/tree/fullstack-react),
  makes the Vite frontend use React
- [`workspaces`](https://github.com/robsimmons/sourdough/tree/workspaces),
  uses NPM workspaces to mediate validation and types that can be productively
  shared between the frontend and backend

## Using Sourdough as a Starter

The `main` and `fullstack-react` branches should coincide, so you can use
GitHub to fork the full-stack React project by just forking this repository.

For other branches, or if you don't want to deal with the weirdness of being a
forked GitHub project, you'll want to follow a pattern like this, replacing
the three bits in square brackets as needed:

```sh
git init
git branch -M main
git remote add upstream git@github.com:robsimmons/sourdough.git
git remote add origin git@github.com:[MY_USERNAME]/[MY_PROJECT].git
git fetch upstream
git merge upstream/[THE_STARTER_YOU_WISH_TO_FORK]
git push -u origin main
```
