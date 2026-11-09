# Adsterra advertising

The supplied Adsterra units are configured in `lib/adsterra.js`. These are separate
from Google AdSense. Set `NEXT_PUBLIC_AD_PROVIDER=adsterra` in the deployment and
rebuild; `adsense` selects the existing Google units, and `none` disables both
integrations. Adsterra is the default when this variable is absent.

Ads run in production builds. `npm run dev` does not request real advertisements.
For a local ad preview use `npm run build` and `npm start` with an available port.
Ad blockers, publisher/domain authorization and network availability can affect
delivery. Code installation does not establish provider approval or ad fill.

- Home page: responsive banner, desktop vertical banner, native widget and clearly
  labelled sponsored link.
- Learning pages: responsive banner, native widget and sponsored link.
- Responsive banners select 728×90, 468×60 or 300×250 according to available width.
  Containers narrower than 300px omit the banner rather than overflow.
- The desktop vertical slot selects 160×600 on tall windows or 160×300 otherwise.
- Each banner uses its own iframe so the supplied `atOptions` configurations do
  not overwrite each other.
- The two additional supplied scripts load on public play/learning routes. These
  execute third-party code and can attach page-level advertising behavior.
- The integration does not mount on login, admin or account routes. Third-party
  scripts already loaded during a public-page visit can retain their own handlers
  until a full-page navigation/reload; Adsterra controls that behavior.

The native widget uses the supplied container ID. Its loader mounts with the widget
and is re-created after returning from an excluded route during client navigation.

The existing AdSense publisher verification metadata and ads.txt remain available.
The Google ad loader is loaded only when the AdSense provider is selected.
