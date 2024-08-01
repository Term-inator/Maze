# Maze

npx vite

```bash
[Unit]
Description=Vite Server
After=network.target

[Service]
User=azureuser
Group=sudo
WorkingDirectory=/home/azureuser/Maze/dist/
ExecStart=/home/azureuser/.nvm/versions/node/v20.16.0/bin/npx live-server --port=9999
Environment="NVM_DIR=/home/azureuser/.nvm"
Environment="PATH=/home/azureuser/.nvm/versions/node/v20.16.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

```bash
location ~* ^/(audio|models|html|assets)/ {
    root /home/azureuser/Maze/dist;
    try_files $uri $uri/ =404;
}

location /maze/ {
    alias /home/azureuser/Maze/dist/;
    proxy_pass http://localhost:9999/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
}
```

```bash
sudo systemctl daemon-reload
sudo systemctl start maze
sudo systemctl status maze

sudo nginx -t
sudo systemctl restart nginx
```