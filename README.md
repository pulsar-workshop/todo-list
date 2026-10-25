# Todo List

A minimal todo list built with [Pulsar](https://github.com/riclud/pulsar) (QML UI + Bun backend).

Add a task, mark it done, or delete it. Tasks are persisted in the app data directory.

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

`bun run server` starts a small Bun server on port 8787 (override with `PORT`).
It stores the list in `sync-state.json` next to the script:

- `GET /todos` returns the list;
- `POST /todos` replaces it with the JSON array in the body.

Open **Настройки** in the app and enter the server address and port. The app
pushes after every change and pulls every four seconds while there are no
pending changes, so the last change wins. Leave the address empty to disable
syncing.

A phone next to the computer can use `adb reverse tcp:8787 tcp:8787` with the
host `127.0.0.1`. For a VPS run the server there, open the port, and enter its
IP or domain in the app.
