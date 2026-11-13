# Display advertisements only

Set NEXT_PUBLIC_AD_PROVIDER to adsense, adsterra or none and rebuild/redeploy.
Adsterra retains only responsive banner slots on the home and learning pages.
Popunder scripts, the page-level native script and the sponsored smartlink were
removed because page-level advertising code could attach handlers to game buttons.
Banner scripts run in sandboxed frames without same-origin access or top-level
navigation privileges. They cannot attach listeners to the game document. A user
can still intentionally open an advertisement by clicking the advertisement itself.

For Google AdSense, disable Vignette ads in Ads ? Edit site ? Overlay formats,
then Apply to site. Alternatively turn off Auto ads to keep manual units only.
Those publisher settings are controlled in AdSense, not by this code change.

After deployment, fully reload or close old tabs to discard third-party handlers
loaded by the previous version. Development mode does not load real ads. Browser
regression checks stub ad traffic and simulate a banner trying to intercept clicks.
