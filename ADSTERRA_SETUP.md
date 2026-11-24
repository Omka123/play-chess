# Adsterra display advertising

Updated: 18 November 2026

Set `NEXT_PUBLIC_AD_PROVIDER=adsterra` before rebuilding/deploying. `adsense`
selects the separate Google integration; `none` disables both. Development mode
does not request live ads.

## Active placement

Public home and learning pages use exactly one async native-banner container:

```html
<div id="container-1d589910dbc993bba5edb9c597ce4a5f"></div>
<script async data-cfasync="false" src="https://bauval.org/21/1d589910dbc993bba5edb9c597ce4a5f"></script>
```

The component creates the container before loading the supplied script. It runs
as normal third-party page code and can access browser cookies, as its SDK expects.
It is not sandbox-isolated. Only the native unit is loaded: the Popunder, Social
Bar and Smartlink snippets remain excluded. Game controls contain no ad redirects
or `window.open` calls. An intentional click on an advertisement can visit its
advertiser.

The active integration mounts only on home and learning routes. Cleanup removes
its script element and rendered container content when leaving those routes.
Third-party globals/handlers are controlled by the SDK and may persist until a
full-page reload. The publisher network controls the delivered creative behavior.

The component detects inserted content and reports a loader error or unavailable
ad when nothing is inserted after 15 seconds. This is a DOM signal, not a paid
impression guarantee. Late content can still replace the unavailable message.

## Confirmed compatibility findings

1. The real sync-banner loader threw `Cannot delete property 'atOptions' of
   #<Window>` when our wrapper used top-level `var atOptions`. Assigning
   `window.atOptions` instead makes the property configurable and allows the
   SDK's cleanup. The retained sync route uses the corrected assignment.
2. Testing the supplied native SDK inside the sandbox reproduced `Failed to read
   the 'cookie' property from 'Document': The document is sandboxed and lacks the
   'allow-same-origin' flag.` Testing its original inline embed, with all secondary
   advertising requests blocked, produced no such error. The active native unit
   therefore uses its original page/container integration rather than an iframe.
3. An earlier automated browser received HTTP 200 responses with zero bytes for
   banner scripts. Other browser configurations received script bodies. That was
   not proof that all visitors lacked inventory or that the account was unapproved.

## Retained sync-banner units

All six supplied banner definitions, including 320×50, remain in `lib/adsterra.js`.
Their `/ads/adsterra/[unit]` routes remain available with noindex and sandbox
headers for explicit testing/manual use. They are no longer automatically requested
by public pages. The iframe restrictions are preserved on those legacy routes;
do not combine same-origin privileges with a same-origin ad iframe and assume
that it still isolates the parent page.

## Delivery verification

Unit tests and browser fixtures cover the native container, normal cookie access,
single-instance mounting, public-route selection, narrow screens and Start game
without a new tab. All provider requests in those regression tests are stubbed.
The real-loader comparisons block secondary requests, so they do not prove paid
ad delivery. Confirm real display after deployment in an ordinary browser.

Provider approval, unit status, domain settings, blockers and inventory can still
affect ad delivery. Compare the individual unit's current GET CODE with this
configuration and ask Adsterra support to inspect delivery if no creative arrives.

Google Vignette ads, when using the separate AdSense provider, are controlled in
AdSense → Ads → Edit site → Overlay formats. Disable them there if click-triggered
overlays are unwanted, then Apply to site.
