# Todo List

A minimal todo list built with [Pulsar](https://github.com/riclud/pulsar) (QML UI + Bun backend).

Add a task, mark it done, or delete it. Each task can be renamed, described,
given a start and end time (or just a deadline), tags with colors, subtasks and
attached files. Tasks are persisted in the app data directory.

## Requirements

- [Bun](https://bun.sh) (the Pulsar CLI runs on Bun)
- The Pulsar toolchain 1.0.0 or newer: run `pulsar install` once

## Develop

```
bun run dev
```

## Run

```
bun run start
```

## Build a single-file app

```
bun run build
```

The result goes to `dist/todo-list`.

## Build an APK

```
pulsar build --target android
```

The first Android build provisions JDK 17, the Android SDK/NDK and Qt for
Android into `PULSAR_HOME` (about 4.5 GB, one time). The result is
`dist/todo-list.apk` for arm64-v8a (minSdk 28).

`pulsar check --target android` verifies that the app only uses portable APIs.

## Sync between devices

`bun run server` starts a small Bun server on port 8787 (override with `PORT`,
set `PASSWORD` to require a bearer token). It stores everything in `sync.db`
(SQLite) next to the script:

- `GET /state` returns `{ todos, tags, deletedTodos, deletedTags, files }`;
- `POST /state` merges the incoming items by `ID`, keeping the newest
  `updatedAT`; a deleted item can never come back;
- `GET/PUT/DELETE /file?key=<key>` moves attachment blobs.

The schema lives in `db/schema.ts`; `bun run db:generate` regenerates the
migrations in `drizzle/`, which the server applies on start.

Open **Настройки** in the app and enter the server address, port and password. The app
pushes after every change and pulls every four seconds while there are no
pending changes. Merging is per object, so a task created on two devices at
once stays on both. Deletion always wins: once a task is deleted on one
device, a later edit on another device cannot resurrect it. Pending changes
and tombstones survive an app restart. Leave the address empty to disable
syncing.

A phone next to the computer can use `adb reverse tcp:8787 tcp:8787` with the
host `127.0.0.1`. For a VPS run the server there, open the port, and enter its
IP or domain in the app.

Attachments are copied into the app data directory and uploaded to the server;
another device downloads them into its own directory when it pulls the task.

## Server binary

```
bun run build:server        # dist/todo-sync (host platform)
bun run build:server:linux  # dist/todo-sync-linux-x64 (baseline CPU target)
bun run build:server:arm64  # dist/todo-sync-linux-arm64
```

The Linux build uses Bun's baseline CPU target, so it also runs on older VPS
processors without AVX2.

The binary has no runtime dependencies and embeds the migrations. Put it in a
directory together with a `.env` file (see `.env.example`):

```
PORT=8787
PASSWORD=change-me
DB=sync.db
```

Then run `./todo-sync`. `sync.db` and `.env` are read next to the executable;
`PORT`, `PASSWORD`, `DB` can also come from the real environment. If `DB` is
relative, it is resolved next to the binary. On `SIGINT`/`SIGTERM` the server
checkpoints the WAL, so `DB` can be backed up on its own after it stops.

## Permissions

`pulsar.json` lists the capabilities the app uses: `storage`, `fs`, `paths`,
`dialog` and `net`. A listed set is a whitelist, so every capability the app
calls must be present.
