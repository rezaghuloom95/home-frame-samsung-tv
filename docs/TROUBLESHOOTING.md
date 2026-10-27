# Troubleshooting

## `failed to connect to <TV-IP>:26101`

The TV only accepts a connection from the IP address saved in Developer Mode. Check:

```bash
curl -s http://<TV-IP>:8001/api/v2/ | grep -o '"developerIP":"[^"]*"'
```

That address must equal your computer's current IP (`ipconfig getifaddr en0` on macOS, `hostname -I` on Linux). Home routers hand out new addresses, so reserve one for your computer in the router (DHCP reservation). To fix it now: Apps, enter 12345, set Host PC IP, press OK, unplug the TV for 30 seconds.

Also: the TV must be on, and `sdb` loses the connection when the TV sleeps. Run `sdb connect <TV-IP>` again.

## `tizen install` says "Failed to install" with no reason

That is normal on many consumer TVs. `tools/deploy.sh` uses Samsung's own installer (`vd_appinstall`) instead, which works.

## The app icon did not change after a new deploy

The TV caches the icon. Redeploy once with `--clean` (it uninstalls first, which also resets saved settings).

## The signing step fails or the TV refuses the package

The certificate must contain this TV's device ID. Check: `sdb shell 0 getduid` should equal the `deviceid` inside your distributor certificate. If you created the certificate before connecting the TV, create a new one with the TV connected.

## Choppy, slow, or laggy remote

- Keep images around 1920 px and under about 600 KB.
- In Settings, switch off **Glass blur effect**, and leave **Slow zoom** off.
- Do not add very large azan or image files; they make loading slow.

## The azan does not play

- Put an `.mp3` in `azan/`, run `./tools/update-media.sh` (or just redeploy), then pick it in Settings > Azan > Azan sound.
- Use Settings > Azan > Test azan now. Raise the TV volume.
- The app only plays while it is the foreground app.

## Prayer times are a few minutes off

Times are computed on the TV from your city's coordinates. Use the fine-tune minutes in Settings > Prayer, or change the calculation method. Compare against your local mosque or ministry timetable. The Hijri date has a plus or minus day correction.

## An app tile shows "Could not open ..."

Samsung uses different IDs for the same app on different TVs. Run `./tools/fetch-home-apps.sh <TV-IP>` to copy your TV's own list, and report the app name if it still fails.

## The app list in Settings is long

By default only your TV's home-row apps are listed. The switch "Also list other installed apps" adds the rest.

## Deleting apps from the TV

Samsung does not allow removing store apps over the developer connection. Delete them on the TV: Apps, Settings gear, select the app, Delete.
