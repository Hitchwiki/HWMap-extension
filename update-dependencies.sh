#!/bin/bash

#
# Update extension's dependencies. Working directory must be the directory
# where this script is located
#
# This could be in composer.json but it won't understand custom repositories from sub packages...
# https://getcomposer.org/doc/04-schema.md#repositories
# https://getcomposer.org/doc/faqs/why-can%27t-composer-load-repositories-recursively.md
#

if [ -d "lib/SphericalGeometry" ]; then # if repo is in place, pull its updates
	cd "lib/SphericalGeometry"
	git pull origin master
	git checkout tags/1.1.1
	cd ../..
else # clone fresh repo
	git clone -b master 'https://github.com/tubalmartin/spherical-geometry-php.git' "lib/SphericalGeometry"
	cd "lib/SphericalGeometry"
	git checkout tags/1.1.1
	cd ../..
fi

bower install --config.interactive=false
