# homelab-iot

Code for ESP and Raspberry Pi devices in the homelab.
To start, clone this Git repository


## 🧭 Setting Up Chromium Kiosk Mode on Raspberry Pi


Your directory should now contain the scripts, for example:

```bash
~/raspberry-pi/kiosk.sh
~/raspberry-pi/kiosk.desktop
```

Make sure the kiosk script is executable

```bash
chmod +x ~/raspberry-pi/kiosk.sh
```

Install required packages

```bash
sudo apt update
sudo apt install -y chromium-browser unclutter x11-xserver-utils
```

Create a symbolic link so the system automatically launches the kiosk script at startup:

```bash
mkdir -p ~/.config/autostart
ln -sf ~/raspberry-pi/kiosk.desktop ~/.config/autostart/kiosk.desktop
```

Reboot to confirm autostart

```bash
sudo reboot
```