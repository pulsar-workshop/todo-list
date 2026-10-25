#!/bin/sh
set -eu

cd /opt/todo-sync

mkdir -p backups
chmod 700 backups

stamp=$(date +%Y%m%d-%H%M%S)
target="backups/sync-$stamp.db"

sqlite3 sync.db ".backup '$target'"
chmod 600 "$target"

find backups -name 'sync-*.db' -type f -mtime +30 -delete
