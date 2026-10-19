import type { LegalDoc } from "./types";

/**
 * Privacy Policy for ShrinkIt. All prose is original writing.
 * Effective date: 19 October 2026.
 */
export const privacyDoc: LegalDoc = {
  title: "Privacy Policy",
  lastUpdated: "19 October 2026",
  summary: [
    "ShrinkIt is a free image resizer and compressor available as a website and as an Android app. Both run entirely on your own device. When you resize, compress, or convert an image with ShrinkIt, your image stays on your own device. It is never uploaded to ShrinkIt, never sent to a server operated by ShrinkIt, and never shared with a third party by the app. There is no account, no sign-up, no payment, and no newsletter, so ShrinkIt does not hold a profile about you.",
    "There are two honest qualifications to that headline, and this policy explains both in full. First, the website is served by hosting infrastructure. That provider necessarily sees the ordinary request-level information that any web host sees, such as your IP address and browser details, even though the app itself sends it nothing about your images. The site's font is self-hosted — it comes from the same server as the rest of the site, so no font provider is involved. Second, your device itself keeps a small amount of local data: the website keeps a theme choice and a cache of its own files, and the Android app keeps a local history of your processed images, your settings, and your preferences. Your images themselves are never uploaded, and the Android app's history contains only metadata such as file names and dimensions, never the image content.",
    "This document is provided for information only. It is not legal advice, and it is not a substitute for advice from a qualified lawyer. If any part of this policy is unclear, you can write to hello@shrinkit.dusrel.com and we will explain it in plain language.",
  ],
  sections: [
    {
      id: "how-to-read",
      heading: "1. How to read this policy, who operates ShrinkIt, and how to contact us",
      blocks: [
        {
          kind: "p",
          text: "This Privacy Policy explains what happens to your information when you use ShrinkIt, the free image resizing and compression service available at https://shrinkit.dusrel.com and as an Android app. It is written to be read from beginning to end, but it is also designed so that each section stands on its own. If you only have a minute, the summary at the top gives you the essential picture. If you want the complete picture, the sections below describe the service feature by feature, explain exactly what stays on your device, and set out your rights under the laws of India and of other places around the world. Where the website and the Android app differ, this policy says so explicitly.",
        },
        {
          kind: "p",
          text: "ShrinkIt is operated under the name Dusrel. In this policy, when we say ShrinkIt, we, us, or our, we mean the operator of this service. When we say you or your, we mean the person using the service. The service is offered on the web and as an Android app, free of charge, and it is designed so that the work of resizing and compressing your images happens on your own device, in your own browser or in the app on your phone, rather than on a computer somewhere else.",
        },
        {
          kind: "p",
          text: "The effective date of this policy is 19 October 2026, and the last-updated date shown at the top of this page is the date from which this version applies. If we change this policy in the future, we will update the last-updated date and publish the new version on this page. Section 15 explains how changes work. Because ShrinkIt does not collect contact details from its users, we cannot send you a personal notice of a change. The published page is the record of the current policy, and you can check it at any time.",
        },
        {
          kind: "p",
          text: "The only way to contact us is by email at hello@shrinkit.dusrel.com. There is no contact form on the site, no chat window, no phone line, and no postal address published for the service. If you write to us, you will be sharing whatever you choose to include in your email, and our reply will come back to you by email. Section 9 explains what happens when you write in, including what we do with your message and how long we keep it.",
        },
        {
          kind: "p",
          text: "This policy applies to the ShrinkIt website, to every tool on it, and to the ShrinkIt Android app, including the main image resizer and the tools listed in Section 4. It applies whether you visit from India or from anywhere else in the world, and whether you use a computer, a tablet, or a phone. It does not apply to any other website, app, or service that you might reach by following a link from ShrinkIt, because ShrinkIt does not control those services. If you follow a link to another service, that service's own policy will govern what it does with your information.",
        },
        {
          kind: "p",
          text: "A word about language. This policy is written in English, and the English version governs. The site is also available in Spanish and Portuguese, and the translated pages display this same English text with a short notice explaining that the English version governs. That is deliberate: privacy promises should not drift between translations, so one version is authoritative and every visitor reads the same words.",
        },
        {
          kind: "p",
          text: "Finally, a word about what this document is. It is an honest description of how the service works, written in plain language. It is not legal advice, and it does not create a lawyer-client relationship between you and anyone. If you need legal advice about your own situation, please speak to a qualified lawyer. If anything in this policy conflicts with the law that applies to you, the law prevails, and Section 12 explains how your rights are preserved even where this policy does not mention a particular rule.",
        },
      ],
    },
    {
      id: "what-shrinkit-is",
      heading: "2. What ShrinkIt is: a client-side service that works on your device",
      blocks: [
        {
          kind: "p",
          text: "Most online tools work by sending your file to a remote computer, processing it there, and sending the result back. ShrinkIt works the other way around. ShrinkIt is a client-side service, which means the program that does the work is delivered to your browser as part of the web page, and then it runs on your own device. Your image is read into your browser's memory, decoded, resized, compressed, or converted there, and the result is offered to you as a download. At no point does the app transmit your image to ShrinkIt or to any third party, because there is no server component in the service that could receive it.",
        },
        {
          kind: "p",
          text: "It helps to picture the service in two layers. The first layer is the delivery of the web page itself. When you visit https://shrinkit.dusrel.com, your browser asks the hosting infrastructure for the page, and the page, including the code that performs the resizing, is sent to your browser. That delivery step involves the ordinary network traffic that every website visit involves, and Section 7 explains what the hosting provider and the font provider can necessarily see at that step. The second layer is everything that happens after the page has loaded. From that point on, the work happens locally: opening an image, resizing it, adjusting its quality, stripping all of its metadata, building a ZIP file of a batch, and saving the result. None of that second-layer activity involves the network at all, except for the font files described in Section 7 and the service worker behaviour described in Section 6.",
        },
        {
          kind: "p",
          text: "Because the work happens locally, the service has no backend, no database of users, and no account system. There is nothing to sign up for, nothing to log into, and no password to remember. There is also no payment system, because the service is free, and no advertising system, because the service carries no advertising and uses no advertising trackers. The absence of those systems is not an accident or a temporary state. It is a consequence of the architecture: a tool that processes images entirely in the browser does not need to know who you are in order to work.",
        },
        {
          kind: "p",
          text: "The image processing itself uses standard browser capabilities. Images are drawn and transformed with the browser's Canvas features, and the heavier work is handed to Web Workers so the page stays responsive while a batch is processed. The resizing step uses the pica library, which runs in the browser. ZIP files for batch downloads are built in the browser with the JSZip library. Photo orientation is read with the exifr library so rotated photos display correctly. No library writes metadata into outputs: every output is stripped of all metadata segments before download. HEIC images are decoded in the browser with a decoder described in Section 4. All of these libraries run locally, on your device, as part of the page. They do not send your images anywhere, and the app's own code does not make network requests carrying your images or your content.",
        },
        {
          kind: "p",
          text: "One practical consequence of this architecture is that closing the tab ends the processing. Your images live in the browser's memory only for as long as the page is open and you are working with them. When you close the tab or navigate away, that in-memory copy goes away with the page. There is no server copy to delete, because no server copy ever existed, and there is no way for ShrinkIt to recover an image after you have closed the page. This is why the service always asks you to download the result yourself: the download is the only copy of the output that exists, and it lives wherever you choose to save it.",
        },
        {
          kind: "p",
          text: "Another consequence is that ShrinkIt cannot see what you do with the tools. It cannot see which images you open, what sizes you choose, how many images you process, or what the outputs look like. It cannot count your images, review them, or moderate them, because they never leave your device. Your responsibility for the images you process is set out in the Terms and Conditions, and it follows directly from this design: since only you ever see the images, only you are responsible for having the right to use them and for how the outputs are used.",
        },
        {
          kind: "p",
          text: "This section has described the architecture in general terms. The next section walks through what happens to an image step by step, and Section 4 goes through each tool one by one, so that you can check the general claim against the specific behaviour of the feature you actually use.",
        },
      ],
    },
    {
      id: "image-journey",
      heading: "3. What happens to your images, step by step",
      blocks: [
        {
          kind: "p",
          text: "When you use ShrinkIt, your image goes through a short journey that stays entirely inside your browser. Understanding each step makes the privacy promise concrete, because you can see that there is no step at which the image leaves your device. The journey is the same in outline for every tool, and the differences between tools are described in Section 4.",
        },
        {
          kind: "h3",
          text: "Step 1: You choose an image",
        },
        {
          kind: "p",
          text: "You provide an image in one of the ways the page offers: by selecting a file from your device, by dragging and dropping a file onto the page, or by pasting an image from your clipboard. In each case, the file is read by your browser from your device into the browser's memory. The browser's file-reading features do this locally. ShrinkIt does not receive a copy, a link, or a preview of the file from anywhere else, and it does not ask your device for any file you did not choose.",
        },
        {
          kind: "h3",
          text: "Step 2: The image is decoded in your browser",
        },
        {
          kind: "p",
          text: "Once the file is in memory, the browser decodes it, which means it turns the compressed file into the grid of pixels that the image represents. For most formats, the browser's own image decoding is used. For HEIC and related formats, the app first tries the browser's native decoding where the browser supports it, and if that does not succeed it uses a decoder that runs in the browser as a WebAssembly module. Either way, the decoding happens on your device. If the file is corrupt or in a form the decoder cannot understand, the decode fails and the app shows an error. A failed file is not sent anywhere for a second opinion, and no part of it is retained by ShrinkIt.",
        },
        {
          kind: "h3",
          text: "Step 3: The image is transformed in your browser",
        },
        {
          kind: "p",
          text: "With the pixels available, the app applies the settings you chose: a new width or height, a stretch, crop, or fit behaviour, a new format, a quality level, a background colour, or the target-size compression of one of the specialised tools. The transformation is performed by code running in your browser, using Canvas and Web Workers as described in Section 2. Nothing about the transformation requires a network request, and none is made. The original file on your device is not modified. The app works on the in-memory copy, so the file you started with stays exactly as it was until and unless you choose to overwrite it yourself when saving.",
        },
        {
          kind: "h3",
          text: "Step 4: All metadata is stripped",
        },
        {
          kind: "p",
          text: "All metadata embedded in your image, often called EXIF data, is stripped from the output. That metadata can include details such as the camera model, the date and time the photo was taken, and, in some photos, the location where it was taken. Stripping it means the downloaded file does not carry those details. There is no option to keep metadata: every output is stripped, always. The DPI setting is used only to convert centimetres and inches to pixels; it is never written into an output file. The metadata is never extracted, read by ShrinkIt, or transmitted anywhere. Section 4 explains the metadata behaviour of each feature in more detail.",
        },
        {
          kind: "h3",
          text: "Step 5: You download the result, or you copy it",
        },
        {
          kind: "p",
          text: "When the result is ready, the app offers it to you as a download, or, if you click the Copy button, places it on your clipboard. Downloading saves the file to the location your browser uses for downloads, or to the location you choose. Copying writes the image to your clipboard only when you click the button. Neither action sends the image anywhere. The downloaded file is an ordinary file on your device from that point on, and it is yours to keep, share, or delete as you wish.",
        },
        {
          kind: "h3",
          text: "Step 6: The in-memory copy goes away",
        },
        {
          kind: "p",
          text: "The in-memory copy of your image, and of the result, lasts only as long as the page is open. When you close the tab, navigate away, or refresh the page, the browser releases that memory. ShrinkIt does not keep a copy, a thumbnail, or a cache entry of your images. The service worker cache described in Section 6 stores only the site's own files, such as the page itself and its icons. It never stores your images. There is therefore no deletion request you need to make for your images, because there is nothing on ShrinkIt's side to delete. If you want to remove all traces from your own device, you delete the downloaded files yourself, and Section 12 explains the self-help steps for clearing the small amount of local data the site does keep.",
        },
        {
          kind: "p",
          text: "One point deserves emphasis because it is easy to misunderstand. When a tool shows you a preview or a before-and-after comparison, that preview is also generated locally. The comparison slider does not upload your image to a server to generate the two views. It displays the in-memory images side by side in your browser. Everything you see on the page, including previews, thumbnails, and progress indicators, is produced on your device.",
        },
      ],
    },
    {
      id: "per-feature",
      heading: "4. What each feature does with your data",
      blocks: [
        {
          kind: "p",
          text: "The general journey in Section 3 applies to every feature. This section lists each feature and its specific data behaviour, so that you can see precisely what happens when you use it. In every row of the table, the answer to the question Does this feature send your image anywhere? is no.",
        },
        {
          kind: "table",
          headers: ["Feature", "What it does", "What happens to your data"],
          rows: [
            [
              "Main resizer",
              "Resizes by percentage (1 to 500), pixels (1 to 12000), centimetres, or inches; width and height with an optional aspect lock; Stretch, Crop, or Fit behaviour; output format JPG, PNG, GIF, or WebP; quality 1 to 100 for JPEG and WebP; background white or black; DPI 1 to 1200.",
              "The image is processed in browser memory and offered as a download. Nothing is uploaded. Maximum input is 120 megapixels, maximum input side is 16000 pixels, and maximum output side is 12000 pixels. Files beyond those limits are refused locally with an error.",
            ],
            [
              "Batch processing and ZIP download",
              "Processes up to 50 images in one batch and bundles the results into a single ZIP file for download.",
              "The ZIP file is built in your browser with the JSZip library. Your images are never uploaded to create the ZIP, and no ZIP file is stored anywhere by ShrinkIt. The ZIP exists on your device only once you download it.",
            ],
            [
              "Compress to 50KB",
              "Compresses an image towards a target size of about 50 kilobytes using a binary search over quality settings, with the longest side capped at 1200 pixels.",
              "All compression attempts happen locally in your browser. Only the final result is offered for download. Intermediate attempts are discarded in memory and are never sent anywhere.",
            ],
            [
              "Compress to 20KB",
              "Compresses an image towards a target size of about 20 kilobytes using a binary search, with a black-and-white mode, and the longest side capped at 2400 pixels.",
              "All attempts happen locally. The black-and-white conversion happens in your browser. Nothing is uploaded, and the result is yours to download.",
            ],
            [
              "Passport Photo Maker",
              "Offers size presets for identity photos, including a 35 by 45 millimetre preset at 300 dots per inch for India, a 2 by 2 inch preset for the United States, and 35 by 45 millimetre presets for Schengen and United Kingdom formats, and crops and resizes your photo to the chosen preset.",
              "The photo is processed locally and downloaded to your device. The presets are size templates only. ShrinkIt does not check, certify, or guarantee that any authority will accept the result. See Section 5 of the Terms and Conditions.",
            ],
            [
              "Social Media Resizer",
              "Offers size presets for social platforms, including 1080 by 1080 for Instagram posts, 1080 by 1920 for stories, 1280 by 720 for YouTube thumbnails, and 1584 by 396 for LinkedIn banners, and resizes your image to the chosen preset.",
              "The image is processed locally. The presets are size templates only. Platforms change their specifications over time, and ShrinkIt does not guarantee that a preset matches a platform's current requirements.",
            ],
            [
              "Before/After Compare",
              "Shows a slider comparison between an original and a processed version of an image.",
              "The comparison is rendered in your browser from images already in memory. No upload is involved, and no comparison image is stored by ShrinkIt.",
            ],
            [
              "Paste",
              "Lets you paste an image from your clipboard into the tool with Ctrl+V or the paste command.",
              "The paste is read only from your own paste event, at the moment you paste. The app does not read your clipboard at any other time and has no background clipboard access.",
            ],
            [
              "Copy",
              "Copies the processed result to your clipboard when you click the Copy button, converting to PNG if the clipboard requires it.",
              "The copy happens only when you click. The app does not write to your clipboard at any other time.",
            ],
            [
              "HEIC, HEIF, and HIF input",
              "Accepts HEIC, HEIF, and HIF files as input. The browser's native decoding is tried first where supported, and if that does not succeed, a decoder running in the browser as a WebAssembly module is used. The decoder code is loaded from the same site, not from a third-party service.",
              "Decoding happens on your device. HEIC is input only: the service cannot produce HEIC output. A corrupt or undecodable file produces a local error and is not sent anywhere.",
            ],
            [
              "Metadata (EXIF) handling",
              "Always strips all metadata from outputs. There is no option to keep metadata. Image orientation is honoured when decoding.",
              "Outputs carry no metadata at all: no EXIF, no colour profile, no DPI record, no text chunks. The DPI setting is used only to convert cm/inches to pixels. Metadata is never transmitted to ShrinkIt.",
            ],
          ],
        },
        {
          kind: "p",
          text: "A note on file names. When you choose a file, the browser makes the file's name available to the page so that the interface can show it and so that the output can be given a sensible name. The file name is used locally for display and naming. It is not sent to ShrinkIt, and ShrinkIt does not build any record from it. If a processing error occurs, the browser's console, which is local to your device, may record the failed file's name as part of the diagnostic message. That console record is visible only to someone using your device with the developer tools open. It is never transmitted to ShrinkIt, and it disappears when the console is cleared or the page is closed.",
        },
        {
          kind: "p",
          text: "A note on input formats. The service accepts JPG, JPEG, PNG, GIF, WebP, BMP, AVIF, HEIC, HEIF, and HIF files as input, and it produces JPG, PNG, GIF, and WebP files as output. Matching is done by file name, but the decoder is the real authority: a file whose contents do not decode as an image will fail with an error, even if its name ends in an accepted extension. Output formats are limited to the four listed. In particular, there is no HEIC output, even if the input was HEIC.",
        },
      ],
    },
    {
      id: "what-we-do-not-collect",
      heading: "5. What ShrinkIt does not collect",
      blocks: [
        {
          kind: "p",
          text: "Because the service has no accounts, no backend, and no analytics, the list of things ShrinkIt does not collect is long, and it is worth stating plainly. ShrinkIt does not collect, receive, store, or have access to any of the following through the service:",
        },
        {
          kind: "list",
          items: [
            "Your images, whether originals or processed outputs, in any format, at any stage of processing.",
            "The metadata inside your images, including location data, camera details, timestamps, or any other EXIF information. Downloads carry no metadata at all.",
            "Your name, email address, phone number, or any other contact detail, unless you choose to write to us by email, which is covered in Section 9.",
            "Any account information, password, or profile, because there are no accounts.",
            "Any payment information, because the service is free and takes no payments.",
            "Any record of which images you processed, what settings you chose, how many images you processed, or how often you used the service.",
            "Any analytics, usage statistics, error reports, or crash reports. If something goes wrong, the error stays in your browser. Nothing is reported back to ShrinkIt.",
            "Any advertising identifier, tracking identifier, or cross-site tracking data. The service carries no advertising and uses no advertising trackers.",
            "Any information from your clipboard except the image you deliberately paste, and any information written to your clipboard except the result you deliberately copy.",
            "Any information about other files on your device. The app sees only the files you deliberately choose, drag, or paste.",
            "Any information about your location beyond what the hosting and font infrastructure necessarily sees at the network level when serving the page, which is covered separately in Section 7.",
          ],
        },
        {
          kind: "p",
          text: "It is important to understand what this list does and does not mean. It means that ShrinkIt itself, as a service, does not receive these things. It does not mean that no information of any kind is involved in visiting a website. When any browser visits any website, the network exchange itself involves request-level information, and the hosting and font providers described in Section 7 necessarily see that request-level information. That is a property of how the web works, not something ShrinkIt adds, and this policy keeps the two things separate so that you can see exactly where each piece of information goes.",
        },
        {
          kind: "p",
          text: "It also does not mean that your own device keeps nothing. Your browser keeps the small items described in Section 6, and your downloads remain on your device until you delete them. Those items are under your control, on your device, and ShrinkIt cannot see or reach them.",
        },
        {
          kind: "p",
          text: "If you believe that any part of this policy is inaccurate, please write to hello@shrinkit.dusrel.com and say what you found. We would rather correct a statement than leave a wrong one standing, and a specific report about a specific feature is the fastest way to get it checked.",
        },
      ],
    },
    {
      id: "what-stays-on-device",
      heading: "6. What stays on your device",
      blocks: [
        {
          kind: "p",
          text: "Although ShrinkIt keeps nothing on a server, your browser keeps a small amount of local data connected with the site. This section lists each item, explains what it is for, and explains how long it lasts. None of these items is visible to ShrinkIt, and none of them contains your images.",
        },
        {
          kind: "h3",
          text: "Theme preference in localStorage",
        },
        {
          kind: "p",
          text: "If you change the site's theme, the browser stores your choice under the key shrinkit-theme in localStorage, which is a small storage area that websites can use to remember settings on your device. The stored value records only the theme you chose: light, dark, or system. It is written only when you change the theme. If you never change the theme, nothing is written. The value stays on your device until you clear it, and it is used only to apply the same theme when you return. It contains no personal information, and it is not sent to ShrinkIt.",
        },
        {
          kind: "h3",
          text: "Service worker cache",
        },
        {
          kind: "p",
          text: "The site registers a service worker, which is a small script that the browser runs in the background for the site. The service worker keeps a cache, named shrinkit-v2, containing the site's own files: the pages, the manifest, the favicons, and the icons. The purpose of the cache is to let the site load reliably, including when the network is slow or briefly unavailable. When the browser requests one of the site's own pages or files, the service worker first tries the network, and if the network is unavailable it serves the cached copy. This cache stores only the site's own files. It never stores the images you process. Your images are held in memory only and are never placed in the cache, so clearing the cache or unregistering the service worker cannot delete your images, and your images cannot leak into the cache.",
        },
        {
          kind: "h3",
          text: "Downloads",
        },
        {
          kind: "p",
          text: "Every file you download from ShrinkIt is saved on your device, in the location your browser uses for downloads or in the location you choose. Those files are ordinary files. They remain there until you delete them, move them, or share them. ShrinkIt has no access to them after the download, cannot see whether you kept them, and cannot delete them. Downloaded files contain no metadata.",
        },
        {
          kind: "h3",
          text: "In-memory processing data",
        },
        {
          kind: "p",
          text: "While you are using the tools, the browser holds the images you are working with in memory, along with the intermediate results of processing. This data exists only while the page is open. Closing the tab, navigating away, or refreshing the page releases it. It is not written to disk by the app, it is not placed in the service worker cache, and it is not stored in localStorage or in any database on your device. There is no IndexedDB database used by the service, and the app does not keep a history of your work between visits.",
        },
        {
          kind: "h3",
          text: "Android app: local history, settings, and app data",
        },
        {
          kind: "p",
          text: "The Android app keeps more on your device than the website does, because an app can offer features a web page cannot. All of the following stays on your phone. None of it is uploaded to ShrinkIt.",
        },
        {
          kind: "h3",
          text: "Processing history (Android app only)",
        },
        {
          kind: "p",
          text: "The Android app keeps a local history of the images you process, so that you can see what you worked on and share or delete past results. For each processed image, the app stores the file name, the original and processed file sizes, the image dimensions, the output format, and the date and time of processing. It does not store the image content itself in the history database. The history is kept in a database on your device that only the app can access. You can delete individual entries or clear the entire history from within the app, and uninstalling the app deletes the history database.",
        },
        {
          kind: "h3",
          text: "App settings and preferences (Android app only)",
        },
        {
          kind: "p",
          text: "The app stores your settings on your device: the theme mode (light, dark, or system), the app language, your default quality and format choices, whether batch-completion notifications are enabled, and whether you have completed the onboarding. These are stored in the app's private preferences on your device. They are never transmitted anywhere. Clearing the app's data in your phone's settings removes them, and uninstalling the app deletes them.",
        },
        {
          kind: "h3",
          text: "Notifications (Android app only)",
        },
        {
          kind: "p",
          text: "If you allow notifications, the app can notify you when a batch of images finishes processing. Notifications are generated on your device by the app itself. No notification content is sent to ShrinkIt or to any third party. You can turn notifications off in the app's settings or in your phone's system settings for the app.",
        },
        {
          kind: "h3",
          text: "Camera and saved images (Android app only)",
        },
        {
          kind: "p",
          text: "The app can open your phone's camera so that you can take a photo and process it directly, and it can save processed images to your phone's Pictures folder. The camera is used only when you tap the camera option, and the app sees only the photo you take. Saved images are ordinary files in your Pictures/ShrinkIt folder. They remain there until you delete them. The app does not upload photos taken with the camera and does not share your saved images with anyone.",
        },
        {
          kind: "h3",
          text: "Browser console messages",
        },
        {
          kind: "p",
          text: "If something fails, your browser may record diagnostic messages in its console, which is a tool for developers that lives inside the browser on your device. Those messages may include the name of a file that failed to process. Console messages are local to your device. They are never transmitted to ShrinkIt, and they are visible only to someone who opens the developer tools on that device. They disappear when the console is cleared or the page is closed.",
        },
        {
          kind: "p",
          text: "Taken together, the local footprint of ShrinkIt is small. On the website: one theme setting if you change the theme, a cache of the site's own files, the downloads you chose to save, and temporary in-memory data that vanishes when the page closes. On the Android app: a local history of processed images (metadata only, no image content), your settings and preferences, and the images you chose to save to your Pictures folder. If you want to remove the local footprint, Section 12 explains the self-help steps. On the website, clear the site's data in your browser and delete any downloads you no longer want. On the Android app, clear the history from within the app, clear the app's data in your phone's settings, or uninstall the app.",
        },
      ],
    },
    {
      id: "infrastructure",
      heading: "7. What the hosting and font infrastructure necessarily sees",
      blocks: [
        {
          kind: "p",
          text: "This section is deliberately separate from the sections about what the app does, because the two are different. The app itself sends nothing about your images anywhere. But the app is delivered over the web, and the delivery involves infrastructure that necessarily sees the ordinary request-level information that any web visit involves. This section explains that infrastructure honestly, so that the statement that the app sends nothing is not mistaken for a claim that no information of any kind is involved in visiting the site.",
        },
        {
          kind: "h3",
          text: "Hosting on Cloudflare Pages",
        },
        {
          kind: "p",
          text: "The ShrinkIt website is hosted on Cloudflare Pages, and the pages are delivered through Cloudflare's content delivery network. When your browser asks for a page, that request passes through Cloudflare's infrastructure, which serves the static files. As the host and delivery network, Cloudflare necessarily sees the standard request-level information for that request, such as your IP address, your browser's user-agent string, and the address of the page you asked for. That is true of any website served through a hosting provider and a delivery network. ShrinkIt does not receive that request-level information from Cloudflare as part of the service, and the app does not add any of your content to those requests. We do not control Cloudflare's own logging or retention practices, and Cloudflare's handling of request-level data is governed by Cloudflare's own policies, not by this policy.",
        },
        {
          kind: "h3",
          text: "Self-hosted fonts",
        },
        {
          kind: "p",
          text: "Every page on the site uses the Poppins typeface, and the font files are served from the same host as the rest of the site — they are bundled with the site's own files when the site is built. No request goes to Google Fonts or any other font provider, so no font provider sees anything about your visit. The only party that sees the request for a font file is the hosting provider described above, in exactly the same way it sees the request for any other file on the site. The tools do not depend on the font: if the font files fail to load for any reason, the site's text falls back to a local font and the tools continue to work.",
        },
        {
          kind: "h3",
          text: "What this means in practice",
        },
        {
          kind: "p",
          text: "In practice, the infrastructure picture is this: the hosting provider sees that a device at a given IP address requested a page or a file, at a given time, with a given browser. It does not see your images, your settings, your outputs, or anything you do after the page has loaded, because none of that is ever sent over the network. The distinction matters. A claim that ShrinkIt logs nothing at all would be false, because the hosting infrastructure necessarily handles request-level data. A claim that the app collects your images would also be false, because the app sends nothing. This policy makes the first claim nowhere, and it makes the second claim everywhere it is relevant, because that is the accurate picture.",
        },
        {
          kind: "p",
          text: "There are no other third-party requests made by the app. In particular, the app does not load analytics scripts, advertising scripts, social media widgets, or tracking pixels. The only network requests involved in using ShrinkIt are the requests that fetch the site's own files (including the font files, which are part of the site) and the service worker's requests for the site's own files. If you inspect the network activity of the page in your browser's developer tools, you will see that pattern: requests for the site's own files, and nothing carrying your images.",
        },
      ],
    },
    {
      id: "cookies",
      heading: "8. Cookies and similar technologies",
      blocks: [
        {
          kind: "p",
          text: "A cookie is a small piece of data that a website asks your browser to store and send back on later visits. ShrinkIt does not set cookies in normal use. The app's code contains no cookie-setting behaviour for analytics, advertising, tracking, or personalisation, and there is no login session to maintain, because there are no accounts. The app sets no language cookie either: the language is carried in the page address, not in a cookie.",
        },
        {
          kind: "p",
          text: "That statement deserves a careful qualification. Saying that the app sets no cookies is not the same as saying that no storage technology of any kind is involved. Two similar technologies are involved, and they are described in Section 6: localStorage, which holds your theme choice under the key shrinkit-theme if you change the theme, and Cache Storage, which holds the service worker's cache of the site's own files under the name shrinkit-v2. Neither is a cookie. Neither is sent to a server on later visits. Neither contains your images or any personal information. They exist to remember a display setting and to let the site load reliably.",
        },
        {
          kind: "p",
          text: "It is also possible that infrastructure beyond the app's control sets or reads something at the network level. The hosting and font providers described in Section 7 handle requests according to their own practices, and this policy does not make promises about their internal behaviour. If you want to be certain about what is stored for this site in your own browser, the reliable check is your browser's own site-data view, which shows what is actually stored for shrinkit.dusrel.com on your device.",
        },
        {
          kind: "h3",
          text: "How to clear what the site stores",
        },
        {
          kind: "p",
          text: "Because the site stores so little, clearing it is straightforward, and you do not need to write to us to do it. In general terms, every modern browser provides site-data controls that let you remove the data stored for a particular site. The usual route is through the browser's settings, in the privacy or site-data area, where you can find the entry for this site and clear its stored data, which removes the theme preference and the service worker cache. You can also unregister the service worker from the same site-data controls. The exact labels vary between browsers and between versions, so use your browser's help pages if the controls have moved. The following general guidance covers the major browsers.",
        },
        {
          kind: "list",
          items: [
            "Chrome and other Chromium-based browsers such as Edge, Brave, and Opera: use the browser's privacy and security settings to view site data, find this site, and clear its stored data. This removes the theme preference and the service worker cache.",
            "Firefox: use the privacy settings to manage cookies and site data, find this site, and remove its stored data. This removes the theme preference and the service worker cache.",
            "Safari: use the privacy settings to manage website data, find this site, and remove its stored data. On mobile Safari, the same controls appear in the device's Settings app under the Safari section.",
            "In every browser: deleting your downloaded files is a separate step, done in your file manager or downloads folder, because downloads are ordinary files on your device and are not part of the browser's site data.",
          ],
        },
        {
          kind: "p",
          text: "Clearing the site's stored data does not affect your images or your originals. It only removes the theme preference and the cached copy of the site's files. The next time you visit, the site will load fresh and the theme will follow your system setting until you change it again.",
        },
      ],
    },
    {
      id: "contact-by-email",
      heading: "9. Contact by email: what happens when you write to us",
      blocks: [
        {
          kind: "p",
          text: "The only way to contact us is by email at hello@shrinkit.dusrel.com. There is no contact form, so nothing you type into a form on the site is ever transmitted. When you write to us, you are using your own email service, and your message travels through the ordinary email system. You choose what to include in your message. The practical advice that follows from this is simple: do not include anything in your email that you would not want us to read, and in particular do not attach images containing personal information unless the attachment is necessary for the question you are asking.",
        },
        {
          kind: "p",
          text: "When your email arrives, it is read so that we can understand your question, suggestion, or complaint, and so that we can reply. Our reply comes back to you by email. We do not add your address to any mailing list, because there is no mailing list. We do not send newsletters, and we do not send marketing emails. If you write to us more than once, the later messages are part of the same correspondence, and they are handled in the same way.",
        },
        {
          kind: "p",
          text: "We keep correspondence for as long as it is useful for dealing with the matter you raised. A question that has been answered and needs no follow-up does not need to be kept indefinitely, and a complaint that has been resolved does not need a permanent file. We do not publish a fixed retention period for correspondence, because the appropriate period depends on the matter: a simple question needs a short period, while a complaint about a persistent problem may need to be kept longer so that the thread is not lost. If you want a message deleted, write to us from the same address and ask for it to be deleted, and we will delete the copy we hold.",
        },
        {
          kind: "p",
          text: "Your email service provider will also have its own handling of your message, including whatever copies it keeps in your sent folder and in its systems. That handling is governed by your provider's own policy, not by this policy. Similarly, if you include an attachment, the attachment travels with the email and is stored wherever the email is stored. ShrinkIt does not extract attachments into any other system, and it does not use attachments for any purpose other than understanding your message.",
        },
        {
          kind: "p",
          text: "If you are exercising a privacy right, reporting a problem with the service, or making a complaint, you can use the same email address. Section 12 explains how rights requests work, and Section 16 explains how complaints are handled. In each case, writing from the address connected with the matter, and describing clearly what you are asking for, will help us respond without unnecessary back-and-forth.",
        },
      ],
    },
    {
      id: "children",
      heading: "10. Children",
      blocks: [
        {
          kind: "p",
          text: "ShrinkIt is a general-purpose image tool. It is not directed at collecting information from children, and it does not collect information from anyone, child or adult, as Sections 2 and 5 explain. There are no accounts, no profiles, no messaging, no user-generated content feeds, and no features designed to attract or retain children. The service does not ask for anyone's age, and there is no age gate, because there is no information to gate: a visitor of any age uses the same local, account-free tool.",
        },
        {
          kind: "p",
          text: "Because the service collects nothing from anyone, it also engages in no tracking of children, no targeted advertising to children, and no profiling of children. There is no behavioural advertising on the service at all, to any visitor. If a child uses the service, the only data involved is the same as for any visitor: the request-level information that the hosting and font infrastructure necessarily sees when serving the page, as described in Section 7, and any local data described in Section 6 if the child changes the theme or downloads a file.",
        },
        {
          kind: "p",
          text: "Parents and guardians should supervise children's use of the service, as they would supervise any use of the internet. Two points are worth a parent's attention. First, the tool processes whatever image is given to it, so a child could process an image containing personal information, and the output file would then exist on the device. The stripping of metadata by default, described in Section 4, reduces one kind of exposure, but it does not make an image safe to share publicly. Second, a child who writes to us by email will be sharing whatever they include in the message, so a parent should be aware of that before a child sends an email.",
        },
        {
          kind: "p",
          text: "If you are a parent or guardian and you believe a child has shared information with us by email that you would like removed, write to hello@shrinkit.dusrel.com from your own address, explain the situation, and ask for the message to be deleted. We will handle the request as a correspondence deletion under Section 9. If you have a broader concern about a child's use of the service, the same address is the right place to raise it.",
        },
      ],
    },
    {
      id: "security",
      heading: "11. Security: what the architecture does and does not protect against",
      blocks: [
        {
          kind: "p",
          text: "Security is often described as a list of measures. For ShrinkIt, the most important security fact is architectural: there is no server store of your images or personal information to be breached, because the service keeps no such store. Many of the risks that people worry about with online tools, such as a database of uploaded images being leaked, a backup being exposed, or an employee looking at your files, do not apply here, because the database, the backup, and the employee access do not exist. The images never leave your device, so there is no copy elsewhere to protect.",
        },
        {
          kind: "p",
          text: "The delivery of the site is protected by the ordinary security of the hosting infrastructure, including encrypted connections between your browser and the hosting provider. That encryption protects the page and its code while they travel to your browser. It does not encrypt anything on your device, and it is not a feature of the app itself. It is part of how the web works when a site is served over a secure connection, and it means that the code you receive is the code the site published, delivered without being readable or modifiable in transit by a casual observer.",
        },
        {
          kind: "p",
          text: "It is equally important to be clear about what this architecture does not protect against, because an honest policy should not leave a reader with a false sense of safety. The following risks are not addressed by the service's design, and they are risks you manage yourself:",
        },
        {
          kind: "list",
          items: [
            "Anyone with access to your device can see what is on it, including your originals, your downloads, and anything visible on screen. ShrinkIt does not lock your device, hide your files, or require a password to open the tool.",
            "Anyone who can see your screen can see the images you are working with. Screenshots, screen recording, and looking over your shoulder are outside the service's control.",
            "Malware on your device, or a browser extension with broad permissions, can observe or capture what happens in your browser. ShrinkIt cannot detect or prevent that, and no web tool can fully protect against a compromised device or a malicious extension.",
            "If you share a downloaded file, the recipient receives a file with no metadata in it. If you share the file publicly, anyone who obtains it can keep it, copy it, and use it.",
            "If you lose your device, or if you give it away without wiping it, your downloads go with it. ShrinkIt has no remote wipe and no way to reach your device.",
            "If you send us an email containing personal information, that email is handled by the email system, and its security depends on your provider and ours, not on the image tool.",
          ],
        },
        {
          kind: "p",
          text: "The practical advice that follows from those limits is the same advice that applies to any work on a personal device. Keep your device's operating system and browser up to date. Be careful about which extensions you install and what permissions you grant them. Do not process sensitive images on a shared or public computer, and do not leave processed files on a device you are about to lend or sell. Keep your originals backed up somewhere you trust, because ShrinkIt keeps no backup and cannot recover a file after the tab is closed. If you believe you have found a security problem in the service itself, please report it to hello@shrinkit.dusrel.com with enough detail for us to reproduce it, and we will look into it.",
        },
        {
          kind: "p",
          text: "We do not promise that the service is invulnerable, and no service can honestly make that promise. What we do promise is that the design avoids an entire class of risk by keeping your images on your device, and that this policy describes the design accurately, including its limits.",
        },
      ],
    },
    {
      id: "your-rights",
      heading:
        "12. Your rights: India, Europe, the United Kingdom, California, Brazil, and everywhere else",
      blocks: [
        {
          kind: "p",
          text: "Privacy laws around the world give people rights over their personal information, and the details differ from place to place. This section describes the rights that matter for ShrinkIt under the laws of India, the European Union, the United Kingdom, California, and Brazil, and then explains how to exercise them. The central point to understand first is that ShrinkIt holds no server copy of your images or personal information, so most rights are exercised either by a confirmation from us that nothing is held, or by the self-help steps on your own device described below. That is not a way of avoiding your rights. It is the direct consequence of a service that never collected the information in the first place.",
        },
        {
          kind: "h3",
          text: "How to exercise your rights",
        },
        {
          kind: "p",
          text: "You can exercise any of the rights described in this section in two ways. The first is to write to us at hello@shrinkit.dusrel.com, describe clearly what you are asking for, and give us enough information to understand the request. Because the service has no accounts, there is no account identifier to quote. A description of the request itself, such as asking for confirmation of what, if anything, ShrinkIt holds about you, is enough. The second way is self-help on your own device: clear the site's stored data in your browser to remove the theme preference and the service worker cache, unregister the service worker, and delete any downloads you no longer want. Section 8 explains how to clear the stored data. Self-help is immediate and does not depend on anyone else, and for most requests it is the complete answer, because the only data the site keeps is the local data on your device.",
        },
        {
          kind: "p",
          text: "When you write to us, we will respond to your request. We will not charge you for making a request, and we will not discriminate against you for exercising a right. If a request is unclear, we may ask you to clarify what you are asking for, so that we can answer the right question. If a request is repeated, excessive, or manifestly unfounded, we will still respond, and we will explain our reasoning. Because there is no account system, we generally do not need to verify your identity to answer a question about whether anything is held. If a request asks us to delete correspondence, we may need to confirm that the request comes from the address that sent the correspondence, so that one person cannot ask us to delete another person's messages.",
        },
        {
          kind: "h3",
          text: "India: rights under the Digital Personal Data Protection Act, 2023",
        },
        {
          kind: "p",
          text: "India's Digital Personal Data Protection Act, 2023, received the President's assent on 11 August 2023. Under that Act, ShrinkIt acts as a Data Fiduciary when it determines the purpose and means of processing personal data, and you act as a Data Principal when your personal data is processed. The Act requires that consent, where it is relied on, be free, specific, informed, unconditional, and unambiguous, given with a clear affirmative action. ShrinkIt's architecture means that the service does not collect personal data from you through the tool itself, so in practice the consent question rarely arises for the tool. Where you choose to write to us by email, your message is handled as correspondence under Section 9.",
        },
        {
          kind: "p",
          text: "The Act gives Data Principals rights that include the right to obtain information about what personal data is being processed, the right to correction of inaccurate or misleading personal data, the right to erasure of personal data that is no longer necessary for the purpose for which it was collected, and the right to grievance redressal. It also provides for nomination, under which a Data Principal may nominate another individual to exercise their rights on their behalf in the event of the Data Principal's death or incapacity. ShrinkIt honours each of these rights. Because the service holds no server copy of your images or personal information, a request for information will ordinarily be answered by confirming that nothing is held, and a request for correction or erasure will ordinarily be answered by confirming that there is nothing on our side to correct or erase, together with guidance on the self-help steps for the local data on your device. A grievance can be raised by writing to hello@shrinkit.dusrel.com, and it will be read and answered.",
        },
        {
          kind: "p",
          text: "The Act also requires Data Fiduciaries to protect personal data with reasonable security safeguards, to notify affected persons and the competent authority in the event of a personal data breach, and to erase personal data when the purpose for which it was collected has ended or consent has been withdrawn. ShrinkIt meets those obligations through its architecture: there is no server store of personal data to breach, and there is no retained personal data whose purpose could expire. If a breach ever did affect personal data handled by ShrinkIt, we would notify the affected persons and the competent authority as the Act requires. The Act also contains special provisions for children's data, including verifiable parental consent and a prohibition on tracking and targeted advertising directed at children. ShrinkIt does not track or target advertising to anyone, including children, and Section 10 explains the position for children in full.",
        },
        {
          kind: "p",
          text: "Separately, the Information Technology Act, 2000 and the Intermediary Guidelines Rules, 2021 require intermediaries to publish their rules, privacy policy, and user agreement prominently, and to provide a grievance redressal mechanism. This policy and the accompanying Terms and Conditions are published on the site for that reason, and the email address given in Section 1 is the channel through which grievances can be raised.",
        },
        {
          kind: "h3",
          text: "European Union and European Economic Area: rights under the GDPR",
        },
        {
          kind: "p",
          text: "The General Data Protection Regulation sets out seven principles for the processing of personal data: lawfulness, fairness, and transparency; purpose limitation; data minimisation; accuracy; storage limitation; integrity and confidentiality; and accountability. ShrinkIt's design follows those principles by collecting nothing through the tool, by limiting the local data it keeps to a theme preference and a cache of its own files, and by being transparent about the infrastructure that necessarily handles request-level data. The Regulation also sets out six lawful bases for processing: consent, contract, legal obligation, vital interests, public task, and legitimate interests. Where ShrinkIt processes any personal data at all, such as handling an email you send, the basis is the purpose for which you sent it: to answer you.",
        },
        {
          kind: "p",
          text: "The Regulation gives data subjects eight rights: the right to be informed, the right of access, the right to rectification, the right to erasure, the right to restriction of processing, the right to data portability, the right to object, and rights relating to automated decision-making and profiling. ShrinkIt honours each of these rights. The right to be informed is met by this policy. The right of access is met by confirming what, if anything, is held. The rights to rectification and erasure are met by confirming that there is nothing on our side to rectify or erase, together with the self-help steps for your device. The right to restriction and the right to object are met in the same way, because there is no processing on our side to restrict or object to. The right to data portability has nothing to port, because there is no dataset held about you. The rights relating to automated decision-making and profiling do not arise, because ShrinkIt makes no decisions about you and builds no profiles.",
        },
        {
          kind: "p",
          text: "Requests under the Regulation are answered without undue delay, and normally within one month. That period can be extended for requests that are complex or numerous, and if an extension is needed we will explain why. You also have the right to lodge a complaint with your local supervisory authority if you believe your request has not been handled properly. Section 16 lists the complaint routes in general terms.",
        },
        {
          kind: "h3",
          text: "United Kingdom: rights under the UK GDPR and the Data Protection Act 2018",
        },
        {
          kind: "p",
          text: "The United Kingdom's data protection law, comprising the UK GDPR and the Data Protection Act 2018, carries the same core principles and the same core rights as the European regime described above. The position for ShrinkIt is the same: the service collects nothing through the tool, the rights described above are honoured, and a request is answered by confirming what, if anything, is held and by pointing to the self-help steps for the local data on your device. If you are in the United Kingdom and you are not satisfied with the handling of your request, you may complain to the Information Commissioner's Office, as described in Section 16.",
        },
        {
          kind: "h3",
          text: "California: rights under the CCPA as amended by the CPRA",
        },
        {
          kind: "p",
          text: "The California Consumer Privacy Act, as amended by the California Privacy Rights Act, gives California residents rights that include the right to know what personal information is collected, the right to delete personal information, the right to correct inaccurate personal information, the right to opt out of the sale or sharing of personal information, the right to limit the use and disclosure of sensitive personal information, and the right to non-discrimination for exercising those rights. The Act applies to for-profit businesses that meet its statutory thresholds. ShrinkIt does not sell or share personal information, because it collects none through the tool. There is no sale or sharing to opt out of, and no sensitive personal information held to limit. A California resident can still exercise the rights to know, delete, and correct by writing to us, and the answer will be a confirmation that nothing is held, together with the self-help steps for the local data on the device. The CPRA created the California Privacy Protection Agency, which is the enforcement body for the Act, and complaints may be directed to the Agency or to the Attorney General as described in Section 16.",
        },
        {
          kind: "h3",
          text: "Brazil: rights under the LGPD",
        },
        {
          kind: "p",
          text: "Brazil's General Data Protection Law, Law 13,709 of 2018, gives data subjects nine rights in its Article 18: confirmation of the existence of processing; access to the data; correction of incomplete, inaccurate, or out-of-date data; anonymisation, blocking, or deletion of unnecessary, excessive, or unlawfully processed data; portability of the data to another provider; deletion of personal data processed with consent; information about the public and private entities with which the data has been shared; information about the possibility of refusing consent and the consequences of refusal; and revocation of consent. ShrinkIt honours each of these rights. Because the service collects nothing through the tool, a request for confirmation will ordinarily be answered by confirming that there is no processing of the requester's data on our side, and the remaining rights will ordinarily be answered by confirming that there is nothing to correct, block, delete, port, or revoke, together with the self-help steps for the local data on the device. The regulator for the Law is the National Data Protection Authority, known as the ANPD, and complaints may be directed to it as described in Section 16.",
        },
        {
          kind: "h3",
          text: "Everywhere else",
        },
        {
          kind: "p",
          text: "Many other countries and states have privacy laws with similar rights, and new ones continue to be enacted. ShrinkIt honours the rights described in this section for all users, regardless of where they are located. You do not need to prove that a particular law applies to you in order to ask us a question, to ask for confirmation of what is held, or to ask for correspondence to be deleted. Write to hello@shrinkit.dusrel.com and describe what you are asking for, and we will answer. Where the law of your location gives you a right that cannot be excluded by agreement, that right is not excluded by this policy or by the Terms and Conditions, and nothing in either document should be read as limiting it.",
        },
        {
          kind: "p",
          text: "One more point about rights and architecture. Some privacy rights are framed around the idea of a controller holding a dataset about you, and they are straightforward to exercise when such a dataset exists. ShrinkIt has no such dataset. That means the most useful answer we can give to most rights requests is a clear confirmation that nothing is held, plus the practical steps for clearing the local data on your device. If that answer ever seems incomplete for your situation, tell us what is missing, and we will address the specific point rather than repeating the general answer.",
        },
      ],
    },
    {
      id: "international-transfers",
      heading: "13. International transfers",
      blocks: [
        {
          kind: "p",
          text: "A service that sends personal data across borders needs rules for those transfers. ShrinkIt does not send your images or personal information across borders at the application level, because the app sends nothing at all. Your images never leave your device, so they are never transferred to another country, region, or server. There is no application-level transfer to describe, restrict, or safeguard.",
        },
        {
          kind: "p",
          text: "The infrastructure layer is different, and it is described honestly here rather than glossed over. The hosting and delivery network and the font provider described in Section 7 operate globally. When your browser requests a page or a font file, that request is handled by infrastructure that may route and process the request-level data through systems in more than one country, according to how those providers run their networks. ShrinkIt does not control that routing, does not choose the countries involved, and does not receive a record of it. The request-level data involved is the ordinary data of a web request, such as an IP address and a user-agent string, and it does not include your images or your content.",
        },
        {
          kind: "p",
          text: "If you write to us by email, your message will travel through the email system, which may also route it through systems in more than one country, depending on the providers involved. That routing is a property of email, and it is governed by the providers that carry the message. ShrinkIt does not direct the routing of email.",
        },
        {
          kind: "p",
          text: "Because there is no application-level transfer, there is no transfer mechanism, such as a standard contractual clause or an adequacy arrangement, that ShrinkIt needs to put in place for your images. The honest statement is simpler: the app transfers nothing, and the infrastructure that delivers the page operates globally under its own arrangements, which ShrinkIt does not control. If you have a question about a specific provider's arrangements, the provider's own published policies are the authoritative source, and this policy does not attempt to summarise them, because a summary could become out of date without notice.",
        },
      ],
    },
    {
      id: "retention",
      heading: "14. Retention: how long information is kept",
      blocks: [
        {
          kind: "p",
          text: "Retention is the question of how long information is kept. For ShrinkIt, the answer is shaped by the same architecture as everything else in this policy. At the application level, nothing is retained, because nothing is collected. Your images are held in memory only while the page is open, and they are released when the page closes. Your settings are not retained on a server. Your outputs are not retained on a server. There is no retention period for a server copy, because there is no server copy.",
        },
        {
          kind: "p",
          text: "On your own device, retention is in your hands. The theme preference stays until you clear it. The service worker cache stays until you clear it or until the site updates its files. Your downloads stay until you delete them. The in-memory data lasts only while the page is open. Those are the only retention periods that apply to the service, and each of them is under your control. Section 8 explains how to clear the stored data, and Section 12 explains the self-help steps in the context of your rights.",
        },
        {
          kind: "p",
          text: "Correspondence by email is the one category of information that ShrinkIt does hold, and Section 9 explains its retention. Correspondence is kept for as long as it is useful for dealing with the matter you raised, and no longer than that. A message that has been answered and needs no follow-up does not need to be kept indefinitely. If you ask for a message to be deleted, the copy we hold will be deleted. The email will also remain in your own sent folder and in your provider's systems, which are outside our control.",
        },
        {
          kind: "p",
          text: "The hosting and font providers described in Section 7 have their own retention practices for the request-level data they handle. ShrinkIt does not control those practices, and this policy does not state a retention period on their behalf. If you need to know how long a provider keeps request logs, the provider's own published policies are the authoritative source.",
        },
      ],
    },
    {
      id: "changes",
      heading: "15. Changes to this policy",
      blocks: [
        {
          kind: "p",
          text: "This policy may change from time to time. The service may gain new features, the infrastructure may change, or the law may change, and the policy will be updated to reflect the new position. When the policy changes, the new version will be published on this page, and the last-updated date at the top will be changed to the date from which the new version applies. The published page is the current policy, and you can check it at any time.",
        },
        {
          kind: "p",
          text: "Because ShrinkIt does not collect contact details from its users, we cannot send you a personal notice of a change, and we do not promise to do so. If a change is significant, we will make it visible on the site by updating the published page. Continued use of the service after a change means that you have read the updated policy and accept it. If you do not accept a change, you can stop using the service, clear the site's stored data as described in Section 8, and delete any downloads you no longer want.",
        },
        {
          kind: "p",
          text: "Older versions of this policy are not published as an archive. The version on this page is the one that applies. If you need to know what a previous version said, write to hello@shrinkit.dusrel.com and describe the question, and we will answer it as best we can from the records we hold.",
        },
        {
          kind: "p",
          text: "If a change to the service alters the privacy picture in a material way, for example if the service were ever to add an account system, an upload feature, or analytics, this policy would be updated before or at the same time as the change, and the new behaviour would be described in full. A change of that kind would be a fundamental change to the service, and it would not be introduced silently. As of the last-updated date, no such change is planned, and the architecture described in this policy is the architecture of the service you are using.",
        },
      ],
    },
    {
      id: "contact-complaints",
      heading: "16. Contact and complaints",
      blocks: [
        {
          kind: "p",
          text: "If you have a question about this policy, if you want to exercise a right described in Section 12, or if you want to make a complaint about how your information has been handled, write to hello@shrinkit.dusrel.com. Describe clearly what you are asking for, and include enough detail for us to understand the matter. If you are complaining, tell us what happened, when it happened, and what outcome you are looking for. We will read your message and reply by email.",
        },
        {
          kind: "p",
          text: "We aim to answer correspondence promptly and helpfully. If your message raises a complex question, or if we need to check a technical point before answering, the reply may take longer, and we will explain the reason if there is a significant delay. We will not charge you for raising a question or a complaint, and we will not treat you less favourably for having raised one.",
        },
        {
          kind: "p",
          text: "If you are not satisfied with our response, you may also complain to a regulator or supervisory authority. The routes are listed below in general terms only. We do not publish regulator addresses or web addresses in this policy, because those details change and an out-of-date address would be worse than no address. Your regulator's official website will carry its current contact details and its complaint procedure.",
        },
        {
          kind: "list",
          items: [
            "India: the Data Protection Board of India is the authority established under the Digital Personal Data Protection Act, 2023.",
            "European Union and European Economic Area: the supervisory authority of the member state in which you live, work, or in which the matter arose.",
            "United Kingdom: the Information Commissioner's Office.",
            "California: the California Privacy Protection Agency, or the Attorney General.",
            "Brazil: the National Data Protection Authority, known as the ANPD.",
            "Elsewhere: the privacy or data protection authority of your country or region, if one exists.",
          ],
        },
        {
          kind: "p",
          text: "Before going to a regulator, we would ask you to give us a chance to resolve the matter directly, because most questions about this service have a short and concrete answer, and a direct conversation is usually the fastest route to it. That is a request, not a condition. Your right to complain to a regulator is not affected by whether you wrote to us first, and nothing in this policy limits that right.",
        },
        {
          kind: "p",
          text: "This policy is provided for information only. It is not legal advice, and it does not create a lawyer-client relationship. If you need legal advice about your own situation, please speak to a qualified lawyer.",
        },
      ],
    },
  ],
};
