# Deploy en un VPS Hetzner (Linux) — guía paso a paso

Guía completa para llevar el **Programador de Actualizaciones** a producción en un
VPS de Hetzner Cloud, desde cero: crear el server, endurecer SSH, instalar el stack,
clonar/buildear, dejar todo como servicios, y cerrar el acceso detrás de una **VPN
WireGuard** (la app no tiene login, así que la VPN es el control de acceso).

> Convenciones usadas (coinciden con `backend/README.md` y `nginx.example.conf`):
> repo en **`/opt/pbi`**, datos en **`/var/lib/pbi`**, build estático en
> **`/var/www/pbi-refresh-scheduler`**, servicio systemd **`pbi-api`**, usuario de
> servicio **`pbi`**, usuario administrador **`deploy`**.

## Arquitectura final

```
Consultor ──(WireGuard 10.8.0.0/24)──▶ VPS Hetzner
                                        ├─ nginx :80  ── sirve dist/ (estático)
                                        │       └─ /api/ ──▶ uvicorn 127.0.0.1:8000
                                        ├─ pbi-api (systemd): FastAPI + scheduler (1 worker)
                                        └─ datos: /var/lib/pbi/{schedules.json, runs.jsonl}
Backend ──(HTTPS saliente)──▶ login.microsoftonline.com + api.powerbi.com
```

---

## 1. Crear el server en Hetzner

1. En [console.hetzner.cloud](https://console.hetzner.cloud): **New Server**.
   - **Imagen:** Ubuntu 24.04 LTS.
   - **Tipo:** `CX22` (2 vCPU / 4 GB, x86) sobra; un `CAX11` (ARM, más barato) también
     sirve — todo el stack (Python, Node, nginx, WireGuard) corre en ARM sin cambios.
   - **Ubicación:** cualquiera de Europa (Falkenstein/Nuremberg); la app corre sola,
     la latencia desde Argentina no afecta a los refreshes.
2. **SSH key (no password):** en tu máquina, `ssh-keygen -t ed25519` y pegá el
   contenido de `~/.ssh/id_ed25519.pub` al crear el server.
3. **Firewall de Hetzner** (Cloud → Firewalls → Create): reglas inbound
   **TCP 22, TCP 80, TCP 443, UDP 51820** (WireGuard) y aplicarlo al server.
   Es la primera capa; abajo sumamos `ufw` como segunda.

## 2. Primer acceso, actualización del SO y hardening

```bash
ssh root@IP_DEL_VPS

# Actualizar TODO el sistema operativo y reiniciar
apt update && apt full-upgrade -y && reboot
```

Reconectá y creá el usuario administrador y el de servicio:

```bash
ssh root@IP_DEL_VPS

adduser deploy                 # admin con sudo (el que usás vos)
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # hereda tu llave

adduser --system --group --home /var/lib/pbi pbi            # corre la API, sin shell
```

Endurecer SSH (llaves sí, root y passwords no):

```bash
cat >/etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
systemctl restart ssh
```

> Probá en OTRA terminal que `ssh deploy@IP` entra y que `sudo -v` funciona ANTES de
> cerrar la sesión de root. La consola web de Hetzner es el salvavidas si te bloqueás.

Firewall local + parches automáticos:

```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 51820/udp
ufw enable
apt install -y unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades
```

De acá en más, todo como `deploy` (`ssh deploy@IP`).

## 3. Instalar el stack

```bash
sudo apt install -y git nginx python3-venv python3-pip
# Node 20 LTS (el repo de Ubuntu trae uno más viejo; .nvmrc pide 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && python3 --version   # esperado: v20.x y 3.12.x
```

> Alternativa sin Node en el VPS: buildear el front en tu máquina (`npm run build`)
> y subir `dist/` con `rsync -a dist/ deploy@IP:/var/www/pbi-refresh-scheduler/`.

## 4. Clonar el repo

```bash
sudo mkdir -p /opt/pbi && sudo chown deploy:deploy /opt/pbi
git clone https://github.com/bshinojo/Update_PBI.git /opt/pbi
```

Si el repo es **privado**, generá una *deploy key* de solo lectura en el server
(`ssh-keygen -t ed25519 -f ~/.ssh/github_deploy`) y cargá la pública en GitHub →
repo → Settings → Deploy keys; cloná por SSH (`git@github.com:bshinojo/Update_PBI.git`).

## 5. Backend (venv, .env, datos, servicio)

```bash
cd /opt/pbi/backend
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

# Directorio de DATOS (sobrevive a redeploys, entra en el backup)
sudo mkdir -p /var/lib/pbi && sudo chown pbi:pbi /var/lib/pbi

cp .env.example .env && nano .env
```

En el `.env`, lo mínimo:

```ini
PBI_TENANT_ID=...
PBI_CLIENT_ID=...
PBI_CLIENT_SECRET=...        # el VALUE del secret, no el "Secret ID" (un GUID falla con AADSTS7000215)
PBI_DB_PATH=/var/lib/pbi/schedules.json
PBI_RUNS_LOG_PATH=/var/lib/pbi/runs.jsonl
```

```bash
sudo chown pbi:pbi .env && sudo chmod 600 .env
```

Prueba manual antes de hacerlo servicio:

```bash
sudo -u pbi .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
# en otra terminal:  curl -s localhost:8000/health   → "status":"ok" y scheduler healthy
# Ctrl+C para cortar
```

Servicio systemd (`/etc/systemd/system/pbi-api.service`):

```ini
[Unit]
Description=PBI Refresh Scheduler API
After=network-online.target
Wants=network-online.target

[Service]
User=pbi
WorkingDirectory=/opt/pbi/backend
ExecStart=/opt/pbi/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

> **`--workers 1` es obligatorio**: el scheduler y el store comparten memoria del
> proceso; con más workers habría schedulers duplicados disparando refreshes dobles.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pbi-api
systemctl status pbi-api && curl -s localhost:8000/health
journalctl -u pbi-api -f        # logs en vivo (loggers pbi.*)
```

## 6. Frontend (build + nginx)

```bash
cd /opt/pbi
npm ci                # instala EXACTO lo lockeado en package-lock.json
npm run build         # genera dist/
sudo mkdir -p /var/www/pbi-refresh-scheduler
sudo rsync -a --delete dist/ /var/www/pbi-refresh-scheduler/
```

> **Sobre "actualizar dependencias":** en el server usá siempre `npm ci` /
> `pip install -r requirements.txt` (respetan el lockfile/pins → deploy reproducible).
> Las subidas de versión (`npm update`, `npm audit fix`, bumps de `requirements.txt`)
> se hacen en desarrollo, se corren los tests (`npm test`, `pytest`) y se commitean;
> el VPS solo consume lo lockeado.

nginx: usá `nginx.example.conf` como base y **descomentá el bloque `/api/`**:

```bash
sudo cp /opt/pbi/nginx.example.conf /etc/nginx/sites-available/pbi
sudo nano /etc/nginx/sites-available/pbi    # descomentar location /api/ { ... }
sudo ln -s /etc/nginx/sites-available/pbi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

(Opcional, si vas a exponerlo con dominio público en vez de solo VPN:
`sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d pbi.tudominio.com`.
Si el acceso va a ser **solo por VPN** —recomendado, ver §8— podés saltear el certificado:
el túnel ya cifra.)

## 7. Verificación end-to-end

1. Abrí `http://IP_DEL_VPS` → debe cargar la app y el header decir **"Programador activo"**
   (eso confirma front + proxy `/api` + backend + scheduler, todo junto).
2. Elegí un workspace/modelo reales → se listan tablas (lecturas contra Power BI ✓).
3. **La única parte nunca probada contra el tenant real es el disparo del refresh**:
   creá una programación de prueba sobre un modelo chico, tocá **"▶ Ejecutar ahora"**
   y mirá `journalctl -u pbi-api -f` — tiene que aparecer el POST con su HTTP status y
   `refreshId`, y en unos minutos el ✓ en la columna "Última actualización". Si Power BI
   devolviera el id en otro header, el ajuste es puntual en `backend/app/powerbi/client.py`.

## 8. WireGuard (VPN de acceso)

La app **no tiene login**: cualquiera que alcance la página puede programar refreshes.
La VPN convierte "alcanzar la página" en "tener una llave WireGuard".

### Server

```bash
sudo apt install -y wireguard qrencode
umask 077
wg genkey | sudo tee /etc/wireguard/server.key | wg pubkey | sudo tee /etc/wireguard/server.pub
```

`/etc/wireguard/wg0.conf`:

```ini
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <contenido de server.key>

# Un bloque [Peer] por consultor:
[Peer]
# Juan
PublicKey = <pública de Juan>
AllowedIPs = 10.8.0.2/32

[Peer]
# Maria
PublicKey = <pública de Maria>
AllowedIPs = 10.8.0.3/32
```

```bash
sudo systemctl enable --now wg-quick@wg0
sudo wg show       # debería listar la interfaz y los peers
```

> No hace falta IP forwarding ni NAT: esta VPN es solo para LLEGAR al VPS
> (split-tunnel), no un gateway de internet.

### Cada cliente (consultor)

Generale un par de claves (puede ser en el server con `wg genkey | tee juan.key | wg pubkey > juan.pub`)
y armale este archivo `pbi.conf` para la app de WireGuard (Windows/macOS/iOS/Android):

```ini
[Interface]
PrivateKey = <contenido de juan.key>
Address = 10.8.0.2/32

[Peer]
PublicKey = <contenido de server.pub>
Endpoint = IP_DEL_VPS:51820
AllowedIPs = 10.8.0.0/24
PersistentKeepalive = 25
```

`AllowedIPs = 10.8.0.0/24` = **split tunnel**: solo el tráfico hacia la herramienta va
por la VPN; el resto de su internet ni se entera. Para móviles: `qrencode -t ansiutf8 < pbi.conf`.

Prueba: con la VPN activada, `ping 10.8.0.1` y abrir `http://10.8.0.1`.

### Cerrar el sitio al público (el paso que importa)

Cuando TODOS entran bien por la VPN, restringí nginx a la subnet del túnel — agregá
dentro del `server { ... }`:

```nginx
allow 10.8.0.0/24;
allow 127.0.0.1;
deny all;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

y sacá **80/443** del firewall de Hetzner y de ufw (`sudo ufw delete allow 80/tcp` etc.).
Quedan abiertos al público solo **22 (SSH)** y **51820/udp (WireGuard)**. Si querés ir un
paso más, restringí también el SSH a la VPN — pero recién cuando la VPN esté probada de
verdad, y recordando que la consola web de Hetzner siempre te deja entrar.

## 9. Operación

**Deploy de actualizaciones** (`/opt/pbi/deploy.sh`, correr como `deploy`):

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /opt/pbi
git pull --ff-only
npm ci && npm run build
sudo rsync -a --delete dist/ /var/www/pbi-refresh-scheduler/
backend/.venv/bin/pip install -q -r backend/requirements.txt
sudo systemctl restart pbi-api
sleep 2 && curl -fsS localhost:8000/health && echo " deploy OK"
```

> Deployá fuera de los horarios de refresh si podés: si reiniciás con una actualización
> en vuelo, esa corrida queda marcada `Failed` con el motivo "el servidor se reinició…"
> (comportamiento esperado de `reconcile_orphans`, no un bug).

**Backups:** activá los **Backups de Hetzner** (snapshots automáticos, ~20% del costo
del server) y/o copiá `/var/lib/pbi/` (schedules + historial) y `/etc/wireguard/`.
`runs.jsonl` crece append-only pero despacio (~200 bytes por corrida).

**Monitoreo:** `GET /health` está pensado para esto — `scheduler.healthy: false`
significa que el worker no corre o se colgó (la UI también lo muestra en el pill del
header). Un cron simple que alerte:

```bash
# /etc/cron.d/pbi-health  (avisa por syslog si el scheduler no está sano)
*/5 * * * * root curl -fsS localhost:8000/health | grep -q '"healthy": *true' || logger -p user.err "pbi-api: scheduler NO healthy"
```

**Zona horaria:** dejá el server en UTC. Los horarios de la app son siempre ART por
`PBI_TZ_OFFSET_HOURS=-3` (config, no reloj del sistema), y Argentina no tiene DST.
