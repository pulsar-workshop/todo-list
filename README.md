# Todo List

A minimal todo list built with [Pulsar](https://github.com/riclud/pulsar) (TypeScript UI + Bun backend).

Add a task, mark it done, or delete it. Each task can be renamed, described,
given a start and end time (or just a deadline), tags with colors, subtasks and
attached files. Tasks are persisted in the app data directory.

The task editor copies or shares a task, sync failures raise a native
notification, and macOS gets a native menu bar. `Ctrl+N` focuses the new-task
field, `Ctrl+R` syncs immediately and `Ctrl+,` opens the sync settings. The
theme follows the system light/dark scheme and can be switched from the header.

## Requirements

- [Bun](https://bun.sh) (the Pulsar CLI runs on Bun)
- The Pulsar toolchain 1.2.3 or newer: run `pulsar install` once

## Project layout

```
src/
  main.ts        entry point and event wiring
  actions.ts     task and attachment actions
  sync.ts        server merge, push and pull
  storage.ts     local persistence
  state.ts       shared state and UI store helpers
  model.ts       parsing and attachment keys
  format.ts      date and text formatting
  theme.ts       light/dark palette
  ui/            screens and components
```

## Develop

```
bun run dev
```

## Run

```
bun run start
```

`dev` and `start` clear `QT_QPA_PLATFORMTHEME` so the file picker uses Qt's
own dialog. With the KDE platform theme (`QT_QPA_PLATFORMTHEME=kde`) on
Hyprland the native dialog can fail to list files (`KIO: Unknown protocol
"file"`); for a built binary run it as
`QT_QPA_PLATFORMTHEME= ./todo-list`.

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

`bun run server` starts a small Bun server on port 8008 (override with `PORT`,
set `PASSWORD` to require a bearer token). It stores everything in `sync.db`
(SQLite) next to the script:

- `GET /state` returns `{ todos, tags, deletedTodos, deletedTags, files }`;
- `POST /state` merges the incoming items by `ID`, keeping the newest
  `updatedAT`; a deleted item can never come back;
- `GET/PUT/DELETE /file?key=<key>` moves attachment blobs.

The schema lives in `db/schema.ts`; `bun run db:generate` regenerates the
migrations in `drizzle/`, which the server applies on start.

Deleted tasks and tags keep their full data and attachment blobs in SQLite for
`TRASH_DAYS` (default 30) so they can be restored manually with SQL. The
tombstone itself stays forever, so a stale device cannot resurrect the item.
After the retention the data and blobs are purged. There is no trash UI.

A manual restore within the retention window:

```
sqlite3 sync.db "UPDATE todos SET deleted = 0, updatedAT = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) WHERE ID = '...'"
```

The restored `updatedAT` is newer than the clients' tombstones, so their next
sync drops the tombstone and keeps the task. Tags use the `tags` table.

## Backups (VPS)

The deployed server keeps daily SQLite backups in `/opt/todo-sync/backups`
(30 days) through `todo-sync-backup.timer` at 04:00. The script and units are
in `deploy/`:

```
install -m 700 deploy/backup.sh /opt/todo-sync/backup.sh
cp deploy/todo-sync-backup.service deploy/todo-sync-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now todo-sync-backup.timer
```

Manual run: `systemctl start todo-sync-backup.service`.

Open **Настройки** in the app and enter the server address, port and password. The app
pushes after every change and pulls every four seconds while there are no
pending changes. Merging is per object, so a task created on two devices at
once stays on both. Deletion always wins: once a task is deleted on one
device, a later edit on another device cannot resurrect it. Pending changes
and tombstones survive an app restart. Leave the address empty to disable
syncing.

A phone next to the computer can use `adb reverse tcp:8008 tcp:8008` with the
host `127.0.0.1`. For a VPS run the server there and enter its address in the
app. Bearer tokens travel over plain HTTP, so expose the port only through a
VPN or an HTTPS reverse proxy.

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
PORT=8008
PASSWORD=change-me
DB=sync.db
```

Then run `./todo-sync`. `sync.db` and `.env` are read next to the executable;
`PORT`, `PASSWORD`, `DB` can also come from the real environment. If `DB` is
relative, it is resolved next to the binary. On `SIGINT`/`SIGTERM` the server
checkpoints the WAL, so `DB` can be backed up on its own after it stops.

## Deployments

Release `0.2.1` artifacts are built into `dist/`:

| Target | Artifact | Notes |
| --- | --- | --- |
| Android (sideload) | `todo-list.apk` | arm64-v8a, minSdk 28 |
| Android (bundle) | `todo-list.aab` | for stores; this repo does not upload it |
| Linux desktop | `todo-list` | one file with bundled Qt |
| Sync server | `todo-sync-linux-x64`, `todo-sync-linux-arm64` | one file with embedded migrations |

### Android

```
adb install -r dist/todo-list.apk
```

Open **Настройки** in the app and enter the server address, port and password.
The APK is signed with `PULSAR_ANDROID_KEYSTORE` when set, otherwise with the
debug key. No Play upload is performed.

### Desktop

```
chmod +x dist/todo-list
./dist/todo-list
```

The binary bundles Qt and renders through Qt Quick; on Linux it needs a working
OpenGL driver (`QSG_INFO=1` prints the selected backend).

### Sync server

```
sudo useradd --system --home /opt/todo-sync todo
sudo install -d -o todo -g todo -m 750 /opt/todo-sync
sudo install -o todo -g todo -m 755 dist/todo-sync-linux-x64 /opt/todo-sync/todo-sync
sudo -u todo sh -c 'cat > /opt/todo-sync/.env' <<'ENV'
PORT=8008
PASSWORD=change-me
DB=sync.db
TRASH_DAYS=30
ENV
sudo cp deploy/todo-sync.service /etc/systemd/system/todo-sync.service
sudo systemctl daemon-reload
sudo systemctl enable --now todo-sync.service
```

Update: `systemctl stop todo-sync`, replace `/opt/todo-sync/todo-sync`, start
again. SQLite data stays in `sync.db`; migrations run on boot. Backups are
covered below.

## Permissions

`pulsar.json` lists the capabilities the app uses: `storage`, `fs`, `paths`,
`dialog`, `net`, `clipboard`, `share`, `notify`, `permissions` and `theme`. A listed set
is a whitelist, so every capability the app calls must be present.
`osPermissions` declares the Android notification permission.
