# Display advertisements only

Set NEXT_PUBLIC_AD_PROVIDER to adsense, adsterra or none and rebuild/redeploy.
Adsterra retains only responsive banner slots on the home and learning pages.
Popunder scripts, the page-level native script and the sponsored smartlink were
removed because page-level advertising code could attach handlers to game buttons.
Banner scripts run in sandboxed frames without same-origin access or top-level
navigation privileges. They cannot attach listeners to the game document. A user
can still intentionally open an advertisement by clicking the advertisement itself.
Frames load from `/ads/adsterra/[unit]` rather than `about:srcdoc`, so the loader has
a real page URL. Only the six configured unit names are accepted. These documents
are excluded from search indexing and do not contain private account information.
Provider approval, ad inventory, domain authorization and browser blocking can
still prevent delivery; installed code does not guarantee a filled impression.

For Google AdSense, disable Vignette ads in Ads ? Edit site ? Overlay formats,
then Apply to site. Alternatively turn off Auto ads to keep manual units only.
Those publisher settings are controlled in AdSense, not by this code change.

After deployment, fully reload or close old tabs to discard third-party handlers
loaded by the previous version. Development mode does not load real ads. Browser
regression checks stub ad traffic and simulate a banner trying to intercept clicks.

## Blank banner diagnosis (17 November 2026)

The deployed banner routes were reachable, but in a diagnostic browser run the
leaderboard and skyscraper provider scripts returned HTTP 200 with zero bytes.
That run contained no banner code to execute. Automated clients may receive
different provider responses from ordinary visitors; this observation does not
establish that every visitor receives an empty response or that the account is
unapproved. No reason such as account suspension or lack of inventory was inferred.

The newly supplied 320×50 banner is configured as `mobileBanner`, selected for
available widths 320–467px. The 300×250 unit remains available for widths 300–319px.
No popunder, Social Bar or Smartlink code is restored.

The frame reports when a creative element is inserted. If none appears within
15 seconds, its parent removes the empty frame and displays “Advertisement
unavailable.” This handles empty scripts instead of leaving large white rectangles;
it does not create ad inventory or manufacture a paid impression. The reported
status is a DOM rendering signal, not billing/measurement confirmation.

In Adsterra Websites, verify the exact domain and individual banner units, then
compare each unit's current GET CODE with the configured key and loader URL. If
real-browser Network responses are still empty, ask Adsterra support to inspect
delivery for `www.chessnexa.in` and the affected unit IDs.

## Confirmed SDK compatibility fix (18 November 2026)

The real banner loader was reproduced in an isolated fixture with all secondary
network requests stubbed. With the old top-level `var atOptions` declaration it
threw `Cannot delete property 'atOptions' of #<Window>`. With `window.atOptions`
assignment the error disappeared. The global var binding made that property
non-configurable; the SDK expects to delete it after reading its settings.

The wrapper now uses a configurable window property, as in the supplied publisher
snippet. The regression loader performs strict-mode deletion before rendering its
test banner, so this failure is no longer hidden by a simplified stub. Sandbox
protection and the removal of page-level click-ad scripts are unchanged. The
earlier empty-response observation in an automated browser was not a complete
diagnosis of banner rendering in a regular browser.
