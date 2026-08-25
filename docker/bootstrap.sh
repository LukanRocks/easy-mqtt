#!/bin/sh
# First-run initialization. Idempotent: safe to run on every container start.
# Creates the /data layout, a stable session secret, and — on the very first
# run — a dynsec admin account whose password is printed to the logs.
set -e

DATA_DIR="${DATA_DIR:-/data}"

mkdir -p "$DATA_DIR/conf.d" "$DATA_DIR/log"

# Stable session secret so admin sessions survive container restarts.
if [ ! -f "$DATA_DIR/session-secret" ]; then
  head -c 32 /dev/urandom | base64 | tr -d '\n' > "$DATA_DIR/session-secret"
  chmod 600 "$DATA_DIR/session-secret"
fi

# Drop a conf.d example the first time so users can discover the override hook.
if [ ! -f "$DATA_DIR/conf.d/tls.conf.example" ]; then
  cat > "$DATA_DIR/conf.d/tls.conf.example" <<'EOF'
# Rename to tls.conf and mount certs under /data to enable a TLS listener.
# Security is global, so extra listeners inherit the dynsec plugin and the
# anonymous policy automatically — you only declare the listener itself.
#
# listener 8883
# cafile /data/certs/ca.crt
# certfile /data/certs/server.crt
# keyfile /data/certs/server.key
#
# A websockets listener:
# listener 9001
# protocol websockets
EOF
fi

# One-time dynsec initialization: creates the ACL DB and the admin client.
if [ ! -f "$DATA_DIR/dynamic-security.json" ]; then
  USER="${DYNSEC_ADMIN_USER:-admin}"
  if [ -n "$DYNSEC_ADMIN_PASSWORD" ]; then
    PASS="$DYNSEC_ADMIN_PASSWORD"
    GENERATED=0
  else
    PASS="$(head -c 18 /dev/urandom | base64 | tr -d '/+=\n')"
    GENERATED=1
  fi

  mosquitto_ctrl dynsec init "$DATA_DIR/dynamic-security.json" "$USER" <<EOF
$PASS
$PASS
EOF

  # Post-process the freshly initialized ACL DB offline (the broker isn't
  # running yet) with jq: give the admin role a description, and seed a default
  # "devices" role operators can assign to new clients so they work immediately.
  # `dynsec init` only creates the admin client/role. The "devices" role grants
  # publish + subscribe on all application topics ("#" excludes $SYS/$CONTROL).
  # Both changes only apply when absent, never overwriting existing values.
  DSFILE="$DATA_DIR/dynamic-security.json"
  TMPFILE="$(mktemp)"
  jq '
    .roles |= map(
      if .rolename == "admin" and (has("textdescription") | not)
      then . + {"textdescription": "Full dynamic-security administration access"}
      else . end
    )
    | if any(.roles[]?; .rolename == "devices") then .
      else .roles += [{
        "rolename": "devices",
        "textdescription": "Basic device access: publish and subscribe on all application topics",
        "allowwildcardsubs": true,
        "acls": [
          {"acltype": "publishClientSend",    "topic": "#", "priority": 0, "allow": true},
          {"acltype": "publishClientReceive", "topic": "#", "priority": 0, "allow": true},
          {"acltype": "subscribePattern",     "topic": "#", "priority": 0, "allow": true}
        ]
      }] end
  ' "$DSFILE" > "$TMPFILE" && mv "$TMPFILE" "$DSFILE" || rm -f "$TMPFILE"

  echo "============================================================"
  echo " easy-mqtt: dynamic-security admin created"
  echo "   username: $USER"
  if [ "$GENERATED" = "1" ]; then
    echo "   PASSWORD: $PASS"
    echo "   (generated — save it now; it is not shown again)"
  else
    echo "   password: (from DYNSEC_ADMIN_PASSWORD)"
  fi
  echo " seeded role:  devices  (publish + subscribe on all app topics)"
  echo "============================================================"
fi

# The broker runs as the mosquitto user and must own its data.
chown -R mosquitto:mosquitto "$DATA_DIR"
