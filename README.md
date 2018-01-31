# xAmp
Cross platform youtube video player with an independent playlist from youtube.

The internal playlist isn't tied to playlist text files, modifying the internal playlist won't make any file changes unless you save them, but the current playlist will be saved separately.

Opening a playlist will overwrite the internal playlist, not add to it.

## Hotkeys
- `space`: play/pause the video
- `ctrl` + `arrow right`: next video
- `ctrl` + `arrow left`: previous video
- `ctrl` + `arrow up`: volume up 10%
- `ctrl` + `arrow down`: volume down 10%
- `ctrl` + `s`: save current playlist
- `ctrl` + `o`: open playlist
- `delete`: delete selected song from internal playlist
- `shift` + `arrow up`: move selected song up in internal playlist
- `shift` + `arrow down`: move selected song down in internal playlist
- `arrow up`: select the next song up, or the top/first song if no song is selected
- `arrow down`: select the next song down, or the bottom/last song if no song is selected

## Running in Windows x64

1. Go to the [releases](https://github.com/Skhmt/xAmp/releases) page and get the latest .zip
2. Extract everything and put it anywhere
3. Run `xAmp.exe`

## Building

1. Download [nw.js](https://nwjs.io/)
2. Place everything into a folder named `package.nw`
3. Place that folder into `nw.js`'s folder
4. Run it
