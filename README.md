# Hitchwiki Map extension for MediaWiki

Internal project extension to use at our wikis ([Hitchwiki](http://hitchwiki.org), [Nomadwiki](http://hitchwiki.org), [Trashwiki](http://trashwiki.org)).

Part of [Hitchwiki.org](https://github.com/Hitchwiki/hitchwiki) MediaWiki setup.

## Install manually

Note that normal Hitchwiki takes care of installing this extension.

Clone under `extensions`:
```bash
git clone https://github.com/Hitchwiki/HWMap-extension.git extensions/HWMap
```

Install assets running bower under HWMap folder
```bash
cd extensions/HWMap
bower install
```

Add to LocalSettings.php
```php
require_once "$IP/extensions/HWMap/HWMap.php";
```

[Contact us](http://hitchwiki.org/contact).

# License
MIT
