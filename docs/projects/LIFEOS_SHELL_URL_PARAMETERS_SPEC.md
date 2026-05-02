<!DOCTYPE html>
<html>
<head>
    <title>Query Parameter Specification</title>
</head>
<body>
<pre>
page
Canonical Name: page
SSR Limits: Not applicable (CSR only).
Bookmarks/Shareable URLs: Supported. Example: /overlay/lifeos-app.html?page=lifeos-dashboard.html

theme
Canonical Name: theme
SSR Limits: Not applicable (CSR only).
Bookmarks/Shareable URLs: Supported. Example: /overlay/lifeos-app.html?theme=light

layout
Canonical Name: layout
SSR Limits: Not applicable (CSR only).
Bookmarks/Shareable URLs: Planned. Example: /overlay/lifeos-app.html?layout=mini (forces collapsed sidebar).

CLI Line:
npm run lifeos:gate-change-run -- --preset my-preset-key
</pre>
</body>
</html>