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
set `PASSWORD` to require a bearer token). It stores the state in
`sync-state.json` next to the script:

- `GET /state` returns `{ todos, tags }`;
- `POST /state` replaces it with the JSON object in the body.

Open **Настройки** in the app and enter the server address, port and password. The app
pushes after every change and pulls every four seconds while there are no
pending changes, so the last change wins. Leave the address empty to disable
syncing.

A phone next to the computer can use `adb reverse tcp:8787 tcp:8787` with the
host `127.0.0.1`. For a VPS run the server there, open the port, and enter its
IP or domain in the app.

Attachments are copied into the app data directory. The file picker uses the
native dialog, which exists on the desktop; on Android the button does nothing
yet.

## Permissions

`pulsar.json` lists the capabilities the app uses: `storage`, `fs`, `paths`,
`dialog` and `net`. A listed set is a whitelist, so every capability the app
calls must be present.
