# Glypheeeeee

```text
 @@@@@  @      @   @  @@@@@  @   @  @@@@@  @@@@@  @@@@@  @@@@@  @@@@@  @@@@@
@       @       @ @   @   @  @   @  @      @      @      @      @      @
@  @@@  @        @    @@@@@  @@@@@  @@@@   @@@@   @@@@   @@@@   @@@@   @@@@
@    @  @        @    @      @   @  @      @      @      @      @      @
 @@@@@  @@@@@    @    @      @   @  @@@@@  @@@@@  @@@@@  @@@@@  @@@@@  @@@@@
```

Turn photographs and words into detailed, copyable ASCII compositions directly in your browser.

Glypheeeeee analyzes luminance, color, edges, and transparency to reconstruct images with characters. It also includes local AI subject extraction, a multi-subject composition canvas, reusable subject instances, and an ASCII text generator.

## Features

- Monochrome and full-color ASCII rendering
- Multiple character-density ramps
- Detail, contrast, brightness, gamma, edge, saturation, and dithering controls
- Local AI foreground extraction with no image upload
- Up to five distinct subject types and ten positioned instances
- Adjustable composition canvas, subject scale, and X/Y placement
- Copyable ASCII text with plain, bold, italic, and 3D styles
- Destination-aware copying for HackMD, GitHub, source code, Word, and plain text
- PNG, HTML, and TXT export
- Responsive desktop and mobile interface

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Privacy

Images are processed locally in the browser. Subject extraction uses `@imgly/background-removal`; its model is downloaded and cached on first use.

## License note

The background-removal dependency is distributed under the AGPL. Review its licensing requirements before distributing Glypheeeeee under a different license.
