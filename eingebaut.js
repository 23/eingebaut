var Eingebaut = function(container, displayDevice, swfLocation, callback, options){
  var $ = jQuery;
  var $this = this;
  $this.container = $(container);
  $this.container.css({position:'relative'});
  $this.displayDevice = displayDevice||'html5';
  $this.swfLocation = swfLocation||'/eingebaut/lib/FlashFallback/EingebautDebug.swf';
  $this._callback = callback||function(){};
  $this.fullscreenContext = 'document'; // can be overwritten to 'video' if you prefer only the video to be in full screen, not the entire document
  $this.hlsjsConfig = {};
  $this.hlsjsFatalError = false;

  // Options with defaults
  $this.options = $.extend({
    inlinePlayback: true,
    startMuted: false
  }, options || {});

  $this.ready = false;
  $this.switching = false;
  $this.showPosterOnEnd = false;
  $this.playbackInited = false;

  if (navigator.appName != 'Microsoft Internet Explorer' || !/MSIE [1-8]\./.test(navigator.userAgent)) {
    // A floating poster, to be shown on top of the video in some cases
    $this.floatingPoster = $(document.createElement((/(MSIE|Trident)/.test(navigator.userAgent)) ? 'div' : 'img'));
    if ($this.floatingPoster.is('img')) {
      // We prefer doing this with <img crossorigin=anonymous> when object-fit is supported
      $this.floatingPoster.attr({ crossOrigin: 'anonymous', alt: '' }).css({ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }).hide();
    } else {
      // This is also handled in Flash, so since browser up to and including IE8
      // don't support `background-size`, these are excluded entirely
      $this.floatingPoster.css({ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundPosition: 'center center', backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }).hide();
    }
    $this.container.append($this.floatingPoster);
  }

  // Blind for click and overlay (1x1px transparent gif to force layout in IE8)
  $this.blind = $(document.createElement('div'))
    .css({position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundImage:'url(data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)', pointerEvents:'none'});
  $this.container.append($this.blind);

  // The callback
  $this.callback = function(e){
    if($this.switching && (e=='canplay'||e=='play')) $this.switching = false;
    // Handle floating poster, mostly compensating for Chrome not always showing the video poster
    // but also enabling a mode where the thumbnail is displayed when the video ends
    switch(e) {
      case 'play':
      case 'playing':
        if($this.floatingPoster) $this.floatingPoster.hide();
        $this.container.css({background:'none'});
        break;
      case 'ended':
        if($this.floatingPoster&&$this.showPosterOnEnd) $this.floatingPoster.show();
        break;
      case 'autoplayfailed':
        if($this.floatingPoster) $this.floatingPoster.show();
        break;
      case 'leavefullscreen':
      case 'enterfullscreen':
        $this.callback('fullscreenchange');
        break;
    }

    $this._callback(e);
  };

  /* HEAVY LIFTING */
  // Load either a html5 <video> element or something in Flash
  $this.loadDisplayDevice = function(displayDevice){
    $this.container.find("video, object").remove();
    $this.ready = false;
    $this.displayDevice = displayDevice;
    $this.playbackInited = false;
    if ($this.displayDevice=='html5') {
      if(/MSIE ([6-9])/.test(navigator.userAgent) && !/Windows.Phone/.test(navigator.userAgent)) {
        // Internet Explorer 10 does support HTML5 video, but with a number of caveats.
        // There are notable bugs in the playback quality. And support for Byte-Range
        // scrubbing is non-existant. Here, we simply opt out and fall back to Flash,
        // even is this may seem like a crude compromise. Windows Phone playback is
        // supported though.
        return false;
      }

      // Some versions of Windows (N-versions, server versions, etc.) do not
      // have the media framework to play back videos. Internet Explorer will
      // still happily create <video> elements, but trying to set 'preload' or
      // any other actual functionality results in a "Not Implemented" exception
      // Attempt to trigger it here
      $this.video = $(document.createElement('video'));
      try {
        $this.video.attr({preload: 'none'});
      } catch (e) {
        delete $this.video;
        return false;
      }

      // HTML5 Display
      $this.stalled = false;
      $this.progressFired = false;
      $this.loadedFired = false;
      $this.video
        .css({position:'absolute', top:0, left:0, width:'100%', height:'100%'})
        .attr({'x-webkit-airplay':'allow', tabindex:-1, preload:'none', crossOrigin:'anonymous'})
        .bind('error load loadstart loadeddata progress timeupdate seeked seeking waiting stalled canplay play playing pause loadedmetadata ended volumechange canplaythrough webkitbeginfullscreen webkitendfullscreen', function(e){
          // Handle stalled property (which is basically "waiting")
          if(e.type=='waiting') $this.stalled = true;
          if(e.type=='playing'||e.type=='seeked'||e.type=='canplay') $this.stalled = false;
          if(e.type=='play'||e.type=='playing') $this.playbackInited = true;
          // In some cases, iOS fails to preload content correctly; the progress event indicates that load was done
          if(e.type=='progress') $this.progressFired = true;
          if(e.type=='loaded') $this.loadedFired = true;
          if(e.type=='webkitbeginfullscreen') $this.callback("enterfullscreen");
          if(e.type=='webkitendfullscreen') $this.callback("leavefullscreen");
          if(e.type=='loadeddata') $this.handleProgramDate();
          if(!$this.ready && /loadedmetadata|canplay|canplaythrough/.test(e.type)) $this.setReady(true);

          if($this.video.prop('seekable').length>0 && _startTime>0) {
            try {
              // The iPad implementation of this seems to have a weird deficiency where setting currentTime is not allowed
              // on the DOM object immediately after the video is seekable. Catching the error here will simply rerun the
              // attemp over an over again for every even -- until it works and _startTime is reset.
              $this.video[0].currentTime = _startTime;
              _startTime = 0;
            }catch(e){}
          }
          $this.callback(e.type);
        });
      if($this.options.startMuted){
        $this.video.attr({
          'muted': "muted"
        });
      }
      if($this.options.inlinePlayback){
        $this.video.attr({
          'webkit-playsinline': "true",
          'playsinline': "true"
        });
      }

      // Hide the standard Chrome on iPhone
      if($this.allowHiddenControls()) {
        if(/iPhone|iPod|iPad/.test(navigator.userAgent)){
          var css = "video::-webkit-media-controls {opacity: 0;pointer-events:none;width:5px;}";
          var head = document.head || document.getElementsByTagName("head")[0];
          var stylesheet = document.createElement("style");
          stylesheet.type = "text/css";
          head.appendChild(stylesheet);
          if(stylesheet.styleSheet){
            stylesheet.styleSheet.cssText = css;
          }else{
            if(stylesheet.childNodes.length > 0){
              stylesheet.removeChild( stylesheet.childNodes[0] );
            }
            stylesheet.appendChild(document.createTextNode(css));
          }
        }
      } else {
         $this.video.css({width:1,height:1});
      }

      if(!$this.video[0].canPlayType) {
        return false; // no html5 video
      }
      $this.container.prepend($this.video);
      $this.setReady(true);
      $this.callback('ready');
      $this.callback('progress');
      $this.callback('timeupdate');
      $this.supportsVolumeChange();
    } else if ($this.displayDevice=='flash') {
      return false;  // no flash support
    } else if ($this.displayDevice=='mischung') {
      if(typeof(Mischung)=='undefined') {
        console.log('Mischung library is required.');
        return false;
      }

      var mischungContainer = $(document.createElement('div'));
      mischungContainer.css({width:'100%', height:'100%', visibility:'hidden'})
      $this.container.append(mischungContainer);
      $this.mischung = new Mischung.Mischung(mischungContainer[0], function(event){
        //console.log('mischung callback, event =', event);
      });

      // Emulate enough of the jQuery <video> object for our purposes
      $this.video = {
        queue:[],
        0: {
          canPlayType: function(t){return t=='video/mischung; codecs="avc1.42E01E"';},
          play:function(){$this.video.prop('playing', true);},
          pause:function(){$this.video.prop('playing', false);}
        },
        prop:function(key,value,param){
          //console.log('prop', key,value,param);
          switch(key) {
          case "poster":
          case "isLive":
            return;
          case "src":
            return (typeof(value)!='undefined' ? $this.mischung.setSourceURL(value,param) : $this.mischung.getSourceURL());
          case "playing":
          case "paused":
            var isPlaying = ($this.mischung.state=='playing' || $this.mischung.getPlaying()) && $this.mischung.state!='paused' && $this.mischung.state!='ended' && $this.mischung.state!='error';
            if(key=='playing') {
              return (typeof(value)!='undefined' ? (value ? $this.mischung.play() : $this.mischung.pause()) : isPlaying);
            } else {
              return (typeof(value)!='undefined' ? (value ? $this.mischung.pause() : $this.mischung.play()) : !isPlaying);
            }
          case "ended":
            return (typeof(value)!='undefined' ? $this.mischung.setEnded(value) : $this.mischung.getEnded());
          case "currentTime":
            return (typeof(value)!='undefined' ? $this.mischung.setCurrentTime(value) : $this.mischung.getCurrentTime());
          case "seeking":
            return (typeof(value)!='undefined' ? $this.mischung.setSeeking(value) : $this.mischung.getSeeking());
          case "stalled":
            return (typeof(value)!='undefined' ? $this.mischung.setStalled(value) : $this.mischung.getStalled());
          case "duration":
            return (typeof(value)!='undefined' ? $this.mischung.setDuration(value) : $this.mischung.getDuration());
          case "bufferTime":
            return $this.mischung.getBufferTime();
          case "volume":
            return (typeof(value)!='undefined' ? $this.mischung.setVolume(value) : $this.mischung.getVolume());
          }
        },
        call:function(){},
        element:$this.container.find('video')
      };

      $.each('error loaded ready canplay progress timeupdate seeked play playing pause loadedmetadata ended volumechange'.split(' '), function(index, eventName){
          $this.mischung['on'+eventName] = function(e){
            $this.callback(eventName, e);

            if(eventName=='playing'||eventName=='play') mischungContainer.css({visibility:'visible'});
            if(eventName=='playing') $this.callback('play', e);
          };
        });

      $this.setReady(true);
      $this.callback('loaded');
      $this.callback('ready');
    } else {
      console.log('Invalid display device');
      return false;
    }
    return true;
  }

  /* METHODS */
  _startTime = 0;
  _delayedSource = null;
  _seekingStatusUntilFirstHLSFragmentLoad = false;
  _activateDelayedSource = function () {
    if (_delayedSource) {
      $this.setSource(_delayedSource.source, _delayedSource.startTime, null, false);
    }
  };
  $this.getStartTime = function(){
    return _startTime;
  };
  $this.setSource = function(source, startTime, poster, delay) {
    _delayedSource = null;
    $this.switching = true;
    if($this.hls && $this.hls.destroy) $this.hls.destroy();
    $this.hls = null;
    if ($this.displayDevice=='html5') {
      if(!delay) {
        if(/\.m3u8/.test(source) && !$this.video[0].canPlayType("application/vnd.apple.mpegurl")){
          $this.setReady(false);
          _seekingStatusUntilFirstHLSFragmentLoad = true;
          $this.hls = new Hls($this.hlsjsConfig);
          $this.hls.config.maxBufferLength = 30;
          $this.hls.config.maxMaxBufferLength = 60;
          $this.callback("hlsjsload");
          $this.hls.on(Hls.Events.FRAG_LOADED, function () {
            _seekingStatusUntilFirstHLSFragmentLoad = false;
          });
          $this.hls.on(Hls.Events.ERROR, function (event, data) {
            console.log('HLS.js Error:', event, data);
            if(data.type=='mediaError' && data.details=='bufferFullError') {
              $this.hls.recoverMediaError();
              $this.setPlaying(true);
            }
            $this.hlsjsFatalError = data.fatal;
          });
          $this.hls.on(Hls.Events.MANIFEST_PARSED, function() {
            $this.hlsjsFatalError = false;
          });
          $this.hls.loadSource(source);
          $this.hls.attachMedia($this.video[0]);
          $this.video[0].load();
          $this.callback("seeking");
        } else {
          $this.video.attr({'src': source, tabindex : 0, 'data-tabindex' : 0});
        }
        _startTime = startTime;
      }else{
        _delayedSource = {
          source: source,
          startTime: startTime
        };
      }
    } else {
      $this.video.prop('src', source, startTime);
    }
    if(poster){
      $this.setPoster(poster);
    }
  };
  $this.getSource = function(){
    if(_delayedSource){
      return _delayedSource.source;
    }
    if($this.hls && $this.hls.url){
      return $this.hls.url;
    }
    return $this.video.prop('src')||'';
  };

  $this.getPlaybackRate = function() {
    return !!$this.video && !!$this.video[0] && !!$this.video[0].playbackRate
      ? $this.video[0].playbackRate
      : 1
  };

  $this.setPlaybackRate = function(rate) {
      if (!!$this.video && !!$this.video[0] && !!$this.video[0].playbackRate) {
        $this.video[0].playbackRate = rate;
        return $this.video[0].playbackRate
      }

      return 1;
  };

  $this.setPoster = function(poster) {
    if ($this.floatingPoster) {
      if ($this.floatingPoster.is('img')) {
        $this.floatingPoster.attr({ src: poster });
      } else {
        $this.floatingPoster.css({ backgroundImage: 'url(' + poster + ')' })
      }
      $this.floatingPoster.show();
    }
    if ($this.displayDevice == 'mischung') {
      $this.video.poster = poster;
      $this.container.css({backgroundImage:'url('+poster+')', backgroundPosition:'center center', backgroundSize:'contain', backgroundRepeat:'no-repeat'});
    } else if ($this.displayDevice=='html5' && /Safari|iPhone/.test(navigator.userAgent) && !/(iPad|Android|Chrome)/.test(navigator.userAgent)) {
      // Safari on Mac OS X has buggy rendering of the poster image,
      // when the video doesn't cover the entire video element.
      // Here, we give the video element a transparent poster
      // and set the real poster on the parent element instead.
      $this.video.prop('poster', 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==');
      $this.container.css({backgroundImage:'url('+poster+')', backgroundPosition:'center center', backgroundSize:'contain', backgroundRepeat:'no-repeat'});
    }else{
      window.setTimeout(function(){
        try {
          $this.video.prop('poster', poster);
        }catch(e){}
      }, 1);
    }
  };
  $this.getPoster = function() {
    return $this.video.prop('poster');
  };

  $this.setReady = function(ready){
    $this.ready = ready;
    if(ready){
      if($this.queuedContext){
        $this.setContext($this.queuedContext);
        $this.queuedContext = null;
      }
      if($this.queuedPlay){
        $this.setPlaying(true);
        $this.queuedPlay = false;
      }
    }
  };

  $this.setContext = function(context){
    if(!$this.originalContext&&$this.getSource()!=""&&!context.preventBackup){
      $this.originalContext = {
        source: $this.getSource(),
        poster: $this.getPoster(),
        callback: $this._callback,
        displayDevice: $this.displayDevice
      };
    }
    if(context.displayDevice&&context.displayDevice!=$this.displayDevice){
      $this.loadDisplayDevice(context.displayDevice);
    }
    if(!$this.ready) {
      $this.queuedContext = context;
      return;
    }
    $this._callback = context.callback;
    $this.setSource(context.source, context.startTime, context.poster, true);
  };
  $this.restoreContext = function(){
    if($this.originalContext){
      $this.setContext($this.originalContext);
    }
    $this.originalContext = null;
  };

  $this.streamStartDate = 0;
  $this.getProgramDate = function() {
    if($this.displayDevice=="html5"){
      if($this.streamStartDate>0){
        return $this.streamStartDate + ($this.getCurrentTime()*1000);
      }else{
        return 0;
      }
    }else{
      var programDate = 0;
      try {
        programDate = $this.video.prop('programDate')||0;
      } catch(e) {}
      if($this.streamStartDate>0 && programDate==0) {
        programDate = $this.streamStartDate + ($this.getCurrentTime()*1000);
      }
      return programDate;
    }
  };
  // Program date handling for HTML5 playback of HLS streams
  // Parses the playlist and chunklist to get ahold of the Program Date
  $this.programDateHandling = false;
  $this.setProgramDateHandling = function(handle){
    $this.programDateHandling = handle;
  };
  $this.handleProgramDate = function(){
    $this.streamStartDate = (new Date()).getTime();
    if($this.programDateHandling&&/\.m3u8/.test($this.getSource())){
      $.ajax({
        url: $this.getSource(),
        cache: true,
        success: function(res){
          if(!/chunklist[^ ]*\.m3u8/.test(res)) return;
          $.ajax({
            url: $this.getSource().split("/").slice(0,-1).join("/")+"/"+res.match(/chunklist[^ \n]*\.m3u8/),
            cache: true,
            success: function(data){
              if(!/DATE-TIME:([^#\n]*)/.test(data)) return;
              var date = Date.parse(data.match(/DATE-TIME:([^#\n]*)/)[1]);
              if(!isNaN(date)){
                $this.streamStartDate = date;
              }
            }
          });
        }
      });
    }
  };
  $this.setPlaying = function(playing) {
    if (playing) {
      if(_delayedSource){
        _activateDelayedSource();
      }
      if(!$this.ready){
        $this.queuedPlay = true;
        return;
      }
      if(!/iPhone|iPod|iPad/.test(navigator.userAgent)){
        // iOS sometimes hiccups when changing the preload attribute right before starting playback,
        // so we only do this on other platforms
        $this.video[0].preload = "auto";
      }
      if($this.displayDevice=='html5' && /(iPhone|iPod|iPad)/.test(navigator.userAgent) && !$this.progressFired) {
        // In a few weird cases, iOS fails to preload content correctly; when this fails, try re-setting the source
        $this.setSource($this.getSource(), null, null, false);
      }
      // Android's standard internet browser (aptly called Internet) doesn't works too well with poster
      // So we use the trick of showing an image thumbnail and then scaling up the video device on play
      // This only covers a subset of the problem, but at least approaches it.
      // (This is not the case for Chrome on Android, which is pretty perfect.)
      if($this.displayDevice=='html5' && !$this.allowHiddenControls() && /Android/.test(navigator.userAgent)) {
        $this.video.css({width:'100%',height:'100%'});
      }
      window.setTimeout(function(){
        var playPromise = $this.video[0].play();
        if (playPromise !== undefined && playPromise['catch'] !== undefined) {
          playPromise['catch'](function(err){
            if(err.name=='NotAllowedError') {
              // Auto-play was prevented, see https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/
              $this.autoPlayHasFailed = true;
              $this.setPlaying(false);
              $this.callback('autoplayfailed');
            }
          });
        }
      }, 1);
    } else {
      $this.video[0].pause();
      $this.queuedPlay = false;
    }
  };
  $this.getPlaying = function() {
    try {
      return !$this.video.prop('paused') && !$this.video.prop('ended');
    }catch(e){
      return false;
    }
  };
  $this.canAutoplay = function(){
    if(!/iPhone|iPad|iPod|Android/.test(navigator.userAgent) || $this.playbackInited) {
      return true;
    } else if( /iPhone|iPad|iPod/.test(navigator.userAgent) && parseInt( navigator.userAgent.match(/Version\/([0-9]*)\./)[1] ) > 9  && $this.video.get(0).muted ){
      return true;
    }
    return false;
  };
  $this.setPaused = function(paused) {
    $this.setPlaying(!paused);
  };
  $this.getPaused = function() {
    return $this.video.prop('paused') || $this.video.prop('ended');
  };
  $this.setCurrentTime = function(currentTime) {
    if($this.displayDevice=='html5'&&$this.video[0].readyState<3) _startTime = currentTime;
    try {
      currentTime = +(currentTime).toFixed(1); // round off the number due to bug in iOS 3.2+
      currentTime = Math.max(0,currentTime||0);
      $this.video.prop('currentTime', currentTime);
    }catch(e){}
  };
  $this.getCurrentTime = function() {
    try {
      return ($this.video.prop('currentTime')||0);
    }catch(e){return 0;}
  };
  $this.getEnded = function() {
    return $this.video.prop('ended');
  };
  $this.getSeeking = function() {
    if ($this.displayDevice == 'html5' && _seekingStatusUntilFirstHLSFragmentLoad) {
      return true;
    }
    return $this.video.prop('seeking');
  };
  $this.getStalled = function() {
    if ($this.displayDevice=='html5') {
      if($this.video.prop('ended')) return false;
      var stalled = $this.stalled || ($this.video[0].readyState<3 && $this.video[0].currentTime>0); // secondary measure for stalled
      return stalled && !$this.video[0].paused;
    } else {
      return $this.video.prop('stalled');
    }
  };
  $this.getDuration = function() {
    try {
      return Math.max($this.video.prop('duration'),$this.getCurrentTime());
    }catch(e){return 0;}
  };
  $this.getBufferTime = function() {
    if ($this.displayDevice=='html5') {
      var b = $this.video.prop('buffered');
      return(b && b.length ? b.end(b.length-1)||0 : 0);
    } else {
      return $this.video.prop('bufferTime')||0;
    }
  };
  $this.setVolume = function(volume) {
    if(volume<0) volume = 0;
    if(volume>1) volume = 1;
    try {
      volume = Math.round(volume*10)/10.0;
      $this.video.prop('volume', volume);
      if ($this.displayDevice=='html5') {
        try {
          $this.video[0].muted = (volume==0);
        }catch(e){}
        if(volume==0) {
          $this.video[0].setAttribute('muted', 'muted');
        } else {
          $this.video[0].removeAttribute('muted');
        }
      }
    }catch(e){}
  };
  $this.getVolume = function() {
    if($this.video.prop('muted')) {return 0;}
    return $this.video.prop('volume');
  };
  $this.getIsLive = function() {
    return($this.video.prop('isLive')||/.m3u8/.test($this.getSource())||/\/http$/.test($this.getSource())||false);
  };
  $this.canPlayType = function(type) {
    if(!!$this.video[0].canPlayType(type)){
      return true;
    }
    if(type.toLowerCase() == 'application/vnd.apple.mpegurl' && typeof Hls != "undefined"){
      return !!Hls.isSupported();
    }
    return false;
  };

  // iPhone in particular doesn't allow controls in <video> to be hidden entirely, meaning that we
  // shouldn't show the <video> element, but instead a thumbnail, when the video is paused.
  $this.allowHiddenControls = function() {
    if ($this.displayDevice=='html5'&&/Windows.Phone/.test(navigator.userAgent)) {
      return false;
    } else if ($this.displayDevice=='html5'&&/Android/.test(navigator.userAgent)&&!/Chrome/.test(navigator.userAgent)) {
      return false;
    } else {
      return true;
    }
  }

  // HTML5 fullscreen for either the full document or the video itself (depending on the value of $this.fullscreenContext, default is 'document')
  var _hasHTML5Fullscreen = function(){
    // First fullscreen mode: Full document, including all UI
    if($this.fullscreenContext=='document') {
      var de = document.body;
      if(de.requestFullScreen&&document.fullScreenEnabled) return true;
      if(de.mozRequestFullScreen&&document.mozFullScreenEnabled) return true;
      if(de.webkitRequestFullScreen) {
        // Safari 5.x does not support webkitFullscreenEnabled - assume it's allowed
        if (/Safari/.test(navigator.userAgent)&&document.webkitFullscreenEnabled==undefined) {
          return true;
        } else if (document.webkitFullscreenEnabled) {
          return true;
        }
      }
      if(de.msRequestFullscreen&&document.msFullscreenEnabled) return true;
    }
    // Second fullscreen mode: Only the video element, relavant mostly for iPad
    if (
      ($this.fullscreenContext=='video' || /iPad|iPhone|Android/.test(navigator.userAgent))
      &&
      $this.displayDevice!='mischung'
    ) {
      var ve = $this.video[0];
      if(ve.requestFullscreen||ve.webkitEnterFullscreen||ve.mozRequestFullScreen||ve.msRequestFullscreen) return true;
    }
    return false;
  };
  $this.hasFullscreen = function() {
    if (_hasHTML5Fullscreen()) return true;
    if ($this.displayDevice=='none') return false;
    return false;
  };
  $this.isFullscreen = function() {
    ve = $this.video[0];
    if (document.fullscreenElement || document.webkitFullscreenElement || document.webkitIsFullScreen || document.mozFullScreenElement || document.msFullscreenElement) {
      return true;
    } else {
      return false;
    }
  };
  $(document).bind("fullscreenchange mozfullscreenchange webkitfullscreenchange MSFullscreenChange", function(e){
    var cb = $this.isFullscreen() ? "enterfullscreen" : "leavefullscreen";
    $this.callback(cb);
  });
  $this.enterFullscreen = function() {
    if ($this.displayDevice=='html5' || _hasHTML5Fullscreen()) {
      var de = document.body;
      var ve = $this.video[0];
      if($this.fullscreenContext=='document' && de.requestFullScreen) {
        de.requestFullScreen();
      } else if($this.fullscreenContext=='document' && de.mozRequestFullScreen) {
        de.mozRequestFullScreen();
      } else if($this.fullscreenContext=='document' && de.webkitRequestFullScreen) {
        if(/Safari/.test(navigator.userAgent)) {
          de.webkitRequestFullScreen();
        } else {
          de.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
      } else if($this.fullscreenContext=='document' && de.msRequestFullscreen) {
        de.msRequestFullscreen();
      } else if(ve.webkitEnterFullscreen) {
        ve.webkitEnterFullscreen();
      } else if(ve.mozRequestFullScreen) {
        ve.mozRequestFullScreen();
      } else if(ve.msRequestFullscreen) {
        ve.msRequestFullscreen();
      } else {
        return false;
      }
      return true;
    }
  };
  $this.leaveFullscreen = function() {
    if ($this.displayDevice=='html5' || _hasHTML5Fullscreen()) {
      var ve = $this.video[0];
      if(document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if(document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if(document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      } else if(document.msExitFullscreen) {
        document.msExitFullscreen();
      } else if(ve.webkitCancelFullscreen) {
        ve.webkitCancelFullscreen();
      } else if(ve.mozCancelFullScreen) {
        ve.mozCancelFullScreen();
      } else if(ve.msExitFullscreen) {
        ve.msExitFullscreen();
      } else {
        return false;
      }
      return true;
    }
  };

  // This is not complete, but better than doing nothing
  $this.autoPlayHasFailed = false;
  $this.supportsAutoPlay = function(){
    if($this.autoPlayHasFailed) return false;
    if(
        /Safari\/[6789]/.test(navigator.userAgent)
        &&
        !/(Chrome|OPR)/.test(navigator.userAgent)
    ) {
      return false;
    } else {
      return true;
    }
  }

  // We will test whether volume changing is support on load an fire a `volumechange` event
  var _supportsVolumeChange;
  $this.supportsVolumeChange = function(){
    if(typeof(_supportsVolumeChange) != 'undefined') return _supportsVolumeChange;
    if($this.displayDevice!='html5') {
      _supportsVolumeChange = true;
    } else {
      // functional test of volume on html5 devices (iPad, iPhone as the real target)
      var v = document.createElement('video');
      v.volume = .5;
      _supportsVolumeChange = (v.volume==.5);
      v = null;
    }
    $this.callback('volumechange');
    return _supportsVolumeChange;
  };

  /* LOAD! */
  $this.load = function(){
    if($this.displayDevice=='flash') $this.displayDevice = 'html5';
    if(!$this.loadDisplayDevice($this.displayDevice)) {
      $this.displayDevice = 'none';
    }
    $this.callback('loaded');
  }
  return $this;
};
