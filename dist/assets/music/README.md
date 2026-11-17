# Europa Chronica music recording audit

Checked: 2026-11-17. The three final MP3 assets total 13,930,370 bytes (13.3 MiB). All are complete recordings, transcoded using FFmpeg/libmp3lame VBR quality 4 with metadata removed. No cuts, speed changes, pitch changes, or musical edits were made. Original and output SHA-256 checksums, source/download URLs and media properties are recorded in `manifest.json`. This directory distributes the MP3s, attribution and concise licence evidence. The recordings keep their individual permissions alongside the GPL-3.0 application code.

## Bach — Goldberg Variations, BWV 988: Aria

- Composer: Johann Sebastian Bach.
- Performer: Kimiko Ishizaka; Open Goldberg Variations, 2012.
- Recording licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- [Recording source](https://commons.wikimedia.org/wiki/File:Goldberg_Variations_01_Aria.ogg) separates composition and performance rights, explicitly applying CC0 to the performance.
- [Original project](https://opengoldbergvariations.org/) independently describes a public-domain recording and states “free of copyright (all uses allowed)”.

## Mozart — Piano Sonata No. 13 in B-flat major, K. 333: II. Andante cantabile

- Composer: Wolfgang Amadeus Mozart.
- Performer: Brendan Kinsella, identified in both the original Ogg metadata and the source-page metadata.
- Publisher/credit: Musopen.
- [Source recording and rights](https://commons.wikimedia.org/wiki/File:Wolfgang_Amadeus_Mozart_-_sonata_no._13_in_b_flat_major,_k.333_-_ii._andante_cantabile.ogg#Licensing) separately labels the recording as a worldwide public-domain release by Musopen, with an unrestricted permission fallback where relinquishing copyright is unavailable. This is not based solely on the composition’s age or US expiry.
- Wikimedia VRT permission ticket 2008012110017088 is stated on that page as confirmation of copyright-holder correspondence. The private ticket itself was not accessed.
- The page additionally specifies Musopen attribution and allows redistribution, derivatives and commercial use. Keep Musopen credit in the player/details and third-party notices. Do not label this as CC0: the actual basis is the named recording release and attribution permission.

## Kevin MacLeod — Angevin

- Composer and recording artist: Kevin MacLeod; Incompetech.
- This is a modern Renaissance-inspired composition, released in 2012. Do not describe it as a historical Renaissance recording or composition.
- Recording/composition licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Author’s track page](https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1200110) renders selected catalogue metadata with the author's CC BY 4.0 attribution template. Its current JavaScript template and official `pieces.json` were read directly.
- [Official catalogue](https://incompetech.com/music/royalty-free/pieces.json) identifies title Angevin, file Angevin.mp3, ISRC USUAN1200110, date 2012-12-23, and flute/lute/choir/percussion instrumentation.
- [Author’s licensing page](https://incompetech.com/music/royalty-free/licenses/) confirms no-charge Creative Commons use with credit.
- The file was downloaded from the author’s own `mp3-royaltyfree/Angevin.mp3` directory, rather than an unattributed mirror.
- Keep title, creator, author/source link, CC BY 4.0 licence link and the MP3 transcoding notice. Do not imply endorsement or relabel the recording GPL.

## Playback and attribution

The player initially selects Bach and remains silent. Audio is loaded only after an explicit play or track-selection action. The player shows the performer and publisher, including Musopen; an expandable credit lists source, licence and conversion details. Volume, selected track and repeat are remembered, but playback never resumes automatically on reload. Angevin is described as a modern Renaissance-inspired piece.
