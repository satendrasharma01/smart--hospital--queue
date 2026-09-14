# Testing

The frontend uses the existing Vite build and Oxlint commands. Backend syntax
can be checked with `node --check` for each source file. Integration and
concurrency tests require an isolated MongoDB test database and must exercise
the real unique indexes (including simultaneous booking and Call Next).

Minimum release checks:

```powershell
npm run lint --prefix frontend
npm run build --prefix frontend
Get-ChildItem backend\src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
npm test --prefix backend
```

The repository now includes real Node test-runner unit tests for Asia/Kolkata
day boundaries and HTML escaping. MongoDB integration, IDOR, Socket.IO and
concurrency suites require an isolated test database and are not claimed as
verified without that environment.
