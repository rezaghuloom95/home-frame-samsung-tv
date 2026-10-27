# Installing the Tizen command-line tools

Home Frame is installed with Samsung's free Tizen command-line tools. You do not need the full Tizen Studio IDE.
Everything installs into your home folder (`~/tizen-studio`) and does not need `sudo`.

Tested on macOS (Apple silicon) with Tizen Studio CLI 6.1. Linux uses the same steps with the `ubuntu-64` installer. On Windows, use WSL.

## 1. Java

The installer needs a JDK on your computer (JDK 17 works, for example Eclipse Temurin 17). Check with `java -version`.

## 2. Download and run the installer

Source: Samsung's official host, `download.tizen.org`. About 280 MB.

```bash
# macOS
curl -L -O https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_macos-64.bin
# Linux
# curl -L -O https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_ubuntu-64.bin

chmod +x web-cli_Tizen_Studio_6.1_*.bin
./web-cli_Tizen_Studio_6.1_*.bin --accept-license ~/tizen-studio
```

On Apple silicon the tools are Intel binaries. If something refuses to start, run `softwareupdate --install-rosetta` once.

## 3. Install the TV packages

```bash
~/tizen-studio/package-manager/package-manager-cli.bin install --accept-license \
  TV-SAMSUNG-Public-WebAppDevelopment Certificate-Manager cert-add-on TV-SAMSUNG-Extension-Tools
```

If it says "Java Development Kit (JDK) was not found", an empty folder from an earlier attempt is in the way:

```bash
rmdir ~/.package-manager/jdk
```

then run the command again. Do not point `~/tizen-studio/sdk.info` at JDK 17: the package manager needs its own bundled Java 8 and fails with a `JAXBException` otherwise.

## 4. Check the tools

```bash
export PATH=$PATH:~/tizen-studio/tools:~/tizen-studio/tools/ide/bin
tizen version
sdb connect <TV-IP>
sdb devices         # the TV must show as "device"
```

Add the `export PATH` line to your shell profile if you want it permanent. `tools/deploy.sh` sets the path itself.

## 5. Create the Samsung certificate

The TV only accepts apps signed with a certificate that contains its device ID. Connect the TV first (`sdb connect <TV-IP>`), then open Certificate Manager:

```bash
open ~/tizen-studio/tools/certificate-manager/certificate-manager.app     # macOS
# ~/tizen-studio/tools/certificate-manager/certificate-manager.sh          # Linux
```

1. Click **+** and choose **Samsung**, then **TV**.
2. Sign in with your Samsung account (free: account.samsung.com).
3. Create an **author certificate** (any name), then a **distributor certificate** (privilege level Public, type Individual).
4. When the device list appears, select your connected TV.
5. Finish. Check it exists:

```bash
tizen security-profiles list     # one profile must be marked "O" (active)
```

Certificates are valid for a year. If the TV changes (new TV, or after a factory reset), create a new one that includes its device ID.
