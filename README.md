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
