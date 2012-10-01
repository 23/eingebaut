#!/bin/sh

rm *swf
/Applications/Adobe\ Flash\ Builder\ 4/sdks/4.1.0/bin/mxmlc -static-link-runtime-shared-libraries=true -debug=true FlashFallback.as
mv FlashFallback.swf EingebautDebug.swf

/Applications/Adobe\ Flash\ Builder\ 4/sdks/4.1.0/bin/mxmlc -static-link-runtime-shared-libraries=true -debug=false FlashFallback.as
mv FlashFallback.swf Eingebaut.swf

#echo '' > ~/Library/Preferences/Macromedia/Flash\ Player/Logs/flashlog.txt 
#tail -f ~/Library/Preferences/Macromedia/Flash\ Player/Logs/flashlog.tx
