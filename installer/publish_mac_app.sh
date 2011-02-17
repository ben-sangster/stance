#!/bin/sh

DEPTH=../../..

CHANNEL=$1

if [ "$CHANNEL" = "" ] ; then
   CHANNEL=devel
fi

VERSION_XML=$DEPTH/bin/macos-opt/STANCE.app/Contents/Resources/config/version.xml
UPDATE=STANCE-`cat $DEPTH/tmp/macos-opt/stanceapp/versionnumber.txt`-`cat $DEPTH/tmp/macos-opt/stanceapp/buildnumber.txt`
OLD_UPDATE=STANCE-`cat $DEPTH/tmp/macos-opt/stanceapp/buildnumber.txt`
INSTALLER=$DEPTH/installers/$UPDATE.dmg

echo "publishing $INSTALLER..."

echo "scp $VERSION_XML update.dmzdev.org:/home/update.dmzdev.org/public/latest/macos-$CHANNEL/STANCE.xml"
scp $VERSION_XML update.dmzdev.org:/home/update.dmzdev.org/public/latest/macos-$CHANNEL/STANCE.xml

echo "scp ./changelog.html update.dmzdev.org:/home/update.dmzdev.org/public/downloads/$UPDATE.html"
scp ./changelog.html update.dmzdev.org:/home/update.dmzdev.org/public/downloads/$UPDATE.html

echo "scp ./changelog.html update.dmzdev.org:/home/update.dmzdev.org/public/downloads/$OLD_UPDATE.html"
scp ./changelog.html update.dmzdev.org:/home/update.dmzdev.org/public/downloads/$OLD_UPDATE.html

echo "scp $INSTALLER update.dmzdev.org:/home/update.dmzdev.org/public/downloads"
scp $INSTALLER update.dmzdev.org:/home/update.dmzdev.org/public/downloads

echo "ssh update.dmzdev.org sudo ln -s /home/update.dmzdev.org/public/downloads/$UPDATE.dmg /home/update.dmzdev.org/public/downloads/$OLD_UPDATE.dmg"
ssh update.dmzdev.org sudo ln -s /home/update.dmzdev.org/public/downloads/$UPDATE.dmg /home/update.dmzdev.org/public/downloads/$OLD_UPDATE.dmg

echo "ssh update.dmzdev.org sudo chown www-data.admin -R /home/update.dmzdev.org/public"
ssh update.dmzdev.org sudo chown www-data.admin -R /home/update.dmzdev.org/public

echo "ssh update.dmzdev.org sudo chmod -R g+w /home/update.dmzdev.org/public"
ssh update.dmzdev.org sudo chmod -R g+w /home/update.dmzdev.org/public

echo "done!"
