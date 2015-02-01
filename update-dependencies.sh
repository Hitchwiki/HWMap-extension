#!/bin/bash

#
# Update extension's dependencies. Working directory must be the directory
# where this script is located
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
