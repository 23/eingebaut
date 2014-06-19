#!/bin/sh

rm *swf
/Applications/Adobe\ Flash\ Builder\ 4/sdks/4.1.0/bin/mxmlc -target-player 10.1 -static-link-runtime-shared-libraries=true -include-libraries+=OSMF.swc,../../../HLSProvider/lib/HLSProviderOSMF.swc -debug=true -runtime-shared-library-path=/ FlashFallback.as
mv FlashFallback.swf EingebautDebug.swf

/Applications/Adobe\ Flash\ Builder\ 4/sdks/4.1.0/bin/mxmlc -target-player 10.1 -static-link-runtime-shared-libraries=true -include-libraries+=OSMF.swc,../../../HLSProvider/lib/HLSProviderOSMF.swc -debug=false -runtime-shared-library-path=/ FlashFallback.as
mv FlashFallback.swf Eingebaut.swf

echo '' > ~/Library/Preferences/Macromedia/Flash\ Player/Logs/flashlog.txt 
tail -f ~/Library/Preferences/Macromedia/Flash\ Player/Logs/flashlog.txt
