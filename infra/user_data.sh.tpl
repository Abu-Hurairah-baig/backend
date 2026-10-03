#!/bin/bash
dnf install -y nodejs git
git clone ${repo_url} /opt/app
cd /opt/app
npm install

cat > /etc/systemd/system/backend.service <<'EOF'
[Unit]
Description=Backend app
After=network.target

[Service]
WorkingDirectory=/opt/app
Environment=PORT=${app_port}
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now backend