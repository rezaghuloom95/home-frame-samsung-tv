# Setup guide for AI assistants

You are helping a person install **Home Frame** on their Samsung Tizen TV. Follow these steps in order, one at a time.
Talk in plain language, wait for the person's answer before moving on, and explain what each command does before you run it.

## Ground rules

- **Never ask for or type the person's Samsung password.** They sign in themselves in Samsung's Certificate Manager window (step 5).
- **Ask before downloading anything.** State the file name, the source and the size. The Tizen CLI installer is about 280 MB.
- **Never delete or overwrite the person's own photos or audio.** Resize copies, or ask first.
- The person's photos, azan files, fonts and TV icons stay on their computer. They are git-ignored on purpose. Do not commit or upload them.
- Nothing here changes TV system settings, and nothing deletes TV apps. The only thing installed on the TV is the Home Frame app.
- If a step fails, read `docs/TROUBLESHOOTING.md` before improvising.

## Step 1: Find out which TV it is (do this first)

Ask for the **model name** (Settings > Support > About This TV, or the sticker on the back), for example `UA55AU7000`, `QN65Q80B`, `UE43TU7100`.

Work out the year from the letter in the model code and map it to the Tizen version:

| Year | Model code hint | Tizen | Support |
|---|---|---|---|
| 2018 | `...NU7100`, `...N5300`, `Q6FN` | 4.0 | Should work. Untested. No glass blur. |
| 2019 | `...RU7100`, `Q60R` | 5.0 | Should work. Untested. No glass blur. |
| 2020 | `...TU7100`, `Q60T` | 5.5 | Should work. Untested. |
| **2021** | `...AU7000`, `Q60A`, `QN90A` | **6.0** | **Tested** on a UA55AU7000 |
| 2022 | `...BU8000`, `QN90B` | 6.5 | Should work. Untested. |
| 2023 | `...CU7000`, `QN90C` | 7.0 | Should work. Untested. |
| 2024 / 2025 | `...DU7000`, `QN90D`, `...F` | 8.0+ | Untested. Samsung tightened developer rules. |

Older than 2018 (2015 to 2017) is unlikely to work well: say so and let the person decide.
Non-Samsung TVs are not supported.

After Developer Mode is on (step 3) you can confirm exactly: `sdb capability | grep platform_version`.

Also ask:
1. Which computer they use: macOS, Linux, or Windows (Windows: use WSL, the scripts are bash).
2. Whether they have a Samsung account (needed once, to create a certificate). If not, they create a free one at account.samsung.com.
3. Whether the TV and computer are on the same Wi-Fi or network.

## Step 2: Check the app runs on the computer (optional, 1 minute)

```bash
./tools/update-media.sh
python3 -m http.server 8099   # open http://localhost:8099/index.html
```

Press the arrow keys and Enter in the browser. Stop the server afterwards.

## Step 3: Turn on Developer Mode on the TV

Tell the person to do this on the TV:

1. Press Home and open **Apps**.
2. With the Apps screen showing, enter **1 2 3 4 5** on the remote, about a second between digits. If the remote has no number pad, use the SmartThings phone app's remote.
3. Switch **Developer Mode** to **On**.
4. In **Host PC IP**, enter the **IP address of the computer** (not the TV). Find it with `ipconfig getifaddr en0` (macOS), `hostname -I` (Linux).
5. Press OK, then **unplug the TV for 30 seconds** and plug it in again. The setting only applies after a full power cycle.

Find the **TV's IP**: Settings > General > Network > Network Status > IP Settings, or the router's device list.

Verify, without installing anything:

```bash
curl -s http://<TV-IP>:8001/api/v2/ | grep -o '"developerMode":"[^"]*"\|"developerIP":"[^"]*"\|"modelName":"[^"]*"'
```

`developerMode` must be `1` and `developerIP` must equal the computer's IP. If the computer's IP changes later, deployment fails: suggest a DHCP reservation in the router.

## Step 4: Install the Tizen command-line tools

Follow `docs/INSTALL-TIZEN-TOOLS.md`. Ask permission before the download. Afterwards verify:

```bash
~/tizen-studio/tools/sdb connect <TV-IP>
~/tizen-studio/tools/sdb devices            # the TV must show as "device"
~/tizen-studio/tools/sdb capability | grep platform_version
```

## Step 5: Create the Samsung certificate (the person does this)

Open Certificate Manager (command in `docs/INSTALL-TIZEN-TOOLS.md`) and tell the person to:

1. Click **+**, choose **Samsung**, then **TV**.
2. Sign in with their Samsung account. **They type the password; you never do.**
3. Create an author certificate (any name), then a distributor certificate (Public, Individual).
4. When it lists devices, **select the connected TV** so its device ID goes into the certificate.
5. Finish. Check: `~/tizen-studio/tools/ide/bin/tizen security-profiles list` shows a profile marked active.

## Step 6: Ask the setup questions and set the defaults

Ask, then write the answers into `data/settings.js` (uncomment the lines):

1. **Prayer times for Muslims?** Many people do not want them.
   - No: set `prayerEnabled: false`. The apps card moves down into that spot. Skip the rest of this step.
   - Yes: ask the school (`madhab: 'sunni'` for 5 prayers or `'shia'` for 3 prayers: Fajr, Dhuhr, Maghrib) and the city (`city: '<id from js/cities.js>'`, or `'custom'` with `lat`/`lng`). Tell them demo azan files are included and ask whether they want to add their own (step 8).
2. **Time format:** `timeFormat: 12` or `24`.
3. **Theme:** `theme: 'dark'` or `'light'`.
4. **Caption** under the family-memories frame: `memTitle`.
5. Whether to show the memories frame at all (they can turn it off in the TV settings later).

Then copy the TV's real home-row apps and their icons (the TV must be connected):

```bash
./tools/fetch-home-apps.sh <TV-IP>
```

## Step 7: First deploy with the demo photos

The repo ships three demo memory photos and five demo backgrounds, so the person can see it working first.

```bash
./tools/deploy.sh <TV-IP>
```

The script packages, signs, installs and launches the app. If it says the profile is missing, pass `--profile <name>`. Ask the person to look at the TV and confirm:
- The clock, background and apps card appear.
- Arrow keys move through the apps; OK opens an app.
- The gear (Up from the apps) opens Settings.

## Step 8: Ask the person to attach their own images (always end with this)

Ask the person to **attach or drop in their images**:

- **Background photos**: landscape, ideally 1920x1080 or larger. Put them in `images/background/`.
- **Family memories**: portrait photos (9:16 works best). Put them in `images/memories/`.
- **Azan** (only if prayer is on): two demo azan recordings ship in `azan/` (`demo-azan-*`). If they have a preferred `.mp3`, put it in `azan/`. They choose it in TV Settings > Azan.

Prepare them (use copies, not the originals):
- Resize to about 1920 px on the long side, JPEG quality ~72, aiming for 300 to 600 KB each. TVs are slow at decoding big files.
  macOS: `sips -Z 1920 -s format jpeg -s formatOptions 72 "in.png" --out "images/background/name.jpg"`.
  Linux: `mogrify -resize 1920x1920\> -quality 72 -path images/background *.jpg` (ImageMagick).
- Use simple file names: letters, digits, dashes. Avoid Arabic or emoji in names.
- Delete the `demo-*` files from `images/` once they have their own (ask first).

Then:

```bash
./tools/deploy.sh <TV-IP>
```

Finish by telling the person about the remote keys and the TV setting **Autorun Last App** (General > Smart Features, wording varies), so the TV can start in Home Frame.

## Useful facts

- Re-run `./tools/deploy.sh <TV-IP>` after any change. Add `--clean` if the app icon looks old (this also resets saved settings).
- The app cannot draw over Smart Hub or other apps. It runs only while it is the foreground app.
- Saved settings live in the TV app's local storage. `data/settings.js` only sets the starting values.
- Prayer times are computed on the TV. Suggest comparing a few days against their local timetable and using the fine-tune minutes.
