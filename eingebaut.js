var Eingebaut = function(container, displayDevice, swfLocation, callback){
  var $ = jQuery;
  var $this = this;
  $this.container = $(container);
  $this.container.css({position:'relative'});
  $this.displayDevice = displayDevice||'html5';
  $this.swfLocation = swfLocation||'/eingebaut/lib/FlashFallback/EingebautDebug.swf';
  $this._callback = callback||function(){};
  $this.fullscreenContext = 'document'; // can be overwritten to 'video' if you prefer only the video to be in full screen, not the entire document
  $this.ready = false;
  $this.switching = false;

  // Blind for click and overlay (1x1px transparent gif to force layout in IE8)
  $this.blind = $(document.createElement('div'))
    .css({position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundImage:'url(data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)'});
  $this.container.append($this.blind);

  // The callback
  $this.callback = function(e){
    if($this.switching && (e=='canplay'||e=='play')) $this.switching = false;
    $this._callback(e);
  };

  /* HEAVY LIFTING */
  // Load either a html5 <video> element or something in Flash
  $this.loadDisplayDevice = function(displayDevice){
    $this.displayDevice = displayDevice;
    if ($this.displayDevice=='html5') {
      if(/MSIE/.test(navigator.userAgent)) {
        // Internet Explorer 10 does support HTML5 video, but with a number of caveat. 
        // There are notable bugs in the playback quality. And support for Byte-Range 
        // scrubbing is non-existant. Here, we simply opt out and fall back to Flash, 
        // even is this may seem like a crude compromise.
        return false;
      }

      // HTML5 Display
      $this.video = $(document.createElement('video'))
        .css({position:'absolute', top:0, left:0, width:'100%', height:'100%'})
        .attr({'x-webkit-airplay':'allow', tabindex:0, preload:'none'})    
        .bind('loadeddata progress timeupdate seeked seeking waiting stalled canplay play playing pause loadedmetadata ended volumechange', function(e){
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

      // Hide the standard Chrome on iPhone
      if(!$this.allowHiddenControls()) $this.video.css({width:1,height:1});

      if(!$this.video[0].canPlayType) {
        return false; // no html5 video
      }
      $this.container.prepend($this.video);
      this.ready = true;
      $this.callback('ready');
      $this.callback('progress');
      $this.callback('timeupdate');
      $this.supportsVolumeChange();
    } else {
      if(!swfobject.hasFlashPlayerVersion('10.1.0')) {
        return false;  // no flash support
      }
      
      // Flash Display
      window.FlashFallbackCallback = function(e){
        if(e=='flashloaded'&&!$this.ready) {
          $this.ready = true;
          $this.callback('flashloaded');
          $this.callback('ready');
          $this.supportsVolumeChange();
        } else {
          $this.callback(e);
        }
      };
            
      // Emulate enough of the jQuery <video> object for our purposes
      $this.video = {
        queue:[],
        0: {
          canPlayType: function(t){return t=='video/mp4; codecs="avc1.42E01E"';},
          play:function(){$this.video.call('setPlaying', true);},
          pause:function(){$this.video.call('setPlaying', false);}
        },
        prop:function(key,value,param){
          if(key=='src') key='source';
          key = key.substring(0,1).toUpperCase() + key.substring(1);
          return (typeof(value)!='undefined' ? $this.video.call('set' + key, value, param): $this.video.call('get' + key));
        },
        call:function(method,arg1,arg2){
          if($this.video.element) {
            if(typeof(arg2)!='undefined') {
              return $this.video.element[method](arg1,arg2);
            } else if(typeof(arg1)!='undefined') { 
              return $this.video.element[method](arg1);
            } else {
              return $this.video.element[method]();
            }
          } else {
            $this.video.element = document['FlashFallback']||window['FlashFallback'];
            if($this.video.element) {
              // Run queue
              $.each($this.video.queue, function(i,q){
                  $this.video.call(q[0],q[1],q[2]);
                });
              $this.video.queue = [];
              // Run the calling method
              $this.video.call(method,arg1,arg2);
            } else {
              // Enqueue
              $this.video.queue.push([method,arg1,arg2]);
            }
          }
        },
        element:undefined
      };

      // Start the Flash application up using swfobject
      // (if we should want to eliminate the swfobject dependency, that's doable: 
      //  make a simple <object> include with innerHTML after the containing object has been 
      //  placed in DOM. Only caveat is that classid must be set in IE, and not in other browsers.)
      $this.container.prepend($(document.createElement('div')).attr({'id':'FlashFallback'}));
      swfobject.embedSWF($this.swfLocation, 'FlashFallback', '100%', '100%', '10.0.0', '', {}, {allowscriptaccess:'always', allowfullscreen:'true', wmode:'opaque', bgcolor:'#000000'}, {id:'FlashFallback', name:'FlashFallback'}); 

    }
    return true;
  }

  /* METHODS */
  _startTime = 0;
  $this.setSource = function(source, startTime) {
    $this.switching = true;
    if ($this.displayDevice=='html5') {
      $this.video.prop('src', source);
      _startTime = startTime;
    } else {
      $this.video.prop('src', source, startTime);
    }
  };
  $this.getSource = function(){
    return $this.video.prop('src')||'';
  };
  $this.setPoster = function(poster) {
    if(!$this.allowHiddenControls()) {
      $this.container.css({backgroundImage:'url('+poster+')', backgroundPosition:'center center', backgroundSize:'contain'});
    }
    $this.video.prop('poster', poster);
  };
  $this.getPoster = function() {
    return $this.video.prop('poster');
  };
  $this.setPlaying = function(playing) {
    if (playing) {
      $this.video[0].preload = 'preload';
      $this.video[0].play();
    } else {
      $this.video[0].pause();
    }
  };
  $this.getPlaying = function() {
    return !$this.video.prop('paused');
  };
  $this.setPaused = function(paused) {
    $this.setPlaying(!paused);
  };
  $this.getPaused = function() {
    return $this.video.prop('paused');
  };
  $this.setCurrentTime = function(currentTime) {
    if($this.displayDevice=='html5'&&$this.video[0].readyState<3) _startTime = currentTime;
    try {      
      $this.video.prop('currentTime', Math.max(0,currentTime||0));
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
    return $this.video.prop('seeking');
  };
  $this.getStalled = function() {
    if ($this.displayDevice=='html5') {
      return $this.video[0].readyState<3 && $this.video[0].readyState>0;
    } else {
      return $this.video.prop('stalled');
    }
  };
  $this.getDuration = function() {
    return $this.video.prop('duration');
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
    }catch(e){}
  };
  $this.getVolume = function() {
    return $this.video.prop('volume');
  };
  $this.getIsLive = function() {
    return($this.video.prop('isLive')||/.m3u8/.test($this.getSource())||/\/http$/.test($this.getSource())||false);
  };
  $this.canPlayType = function(type) {
    return $this.video[0].canPlayType(type);
  };

  // iPhone in particular doesn't allow controls in <video> to be hidden entirely, meaning that we
  // shouldn't show the <video> element, but instead a thumbnail, when the video is paused.
  $this.allowHiddenControls = function() {
      if ($this.displayDevice=='html5'&&/iPhone/.test(navigator.userAgent)) {
          return false;
      } else {
          return true;
      }
  }

  // HTML5 fullscreen for either the full document or the video itself (depending on the value of $this.fullscreenContext, default is 'document')
  $this.hasFullscreen = function(type) {
      if ($this.displayDevice!='html5') return false;
      try {
          if(window.frameElement && !window.frameElement.hasAttribute('allowFullScreen')) return(false);
      }catch(e){}
      
      // First fullscreen mode: Full document, including all UI
      if($this.fullscreenContext=='document') {
          var de = document.documentElement;
          if(de.requestFullScreen&&document.fullScreenEnabled) return true;
          if(de.mozRequestFullScreen&&document.mozFullScreenEnabled) return true;
          if(de.webkitRequestFullScreen&&document.webkitFullscreenEnabled) return true;
      }
      // Second fullscreen mode: Only the video element, relavant mostly for iPad
      if($this.fullscreenContext=='video' || /iPad/.test(navigator.userAgent)) {
          var ve = $this.video[0];
          if(ve.requestFullscreen||ve.webkitEnterFullscreen||ve.mozRequestFullScreen) return true;
      }

      return false;
  };
  $this.switchedToFullscreen = false;
  $this.isFullscreen = function(type) {
      if ($this.displayDevice!='html5') return false;
      return $this.switchedToFullscreen;
      //if($this.video[0].mozFullScreen) return $this.video[0].mozFullScreen();
      //if($this.video[0].webkitFullscreenEnabled) return $this.video[0].webkitFullscreenEnabled();
      //return false;
  };
  $this.enterFullscreen = function(type) {
      if ($this.displayDevice!='html5') return false;
      var de = document.documentElement;
      var ve = $this.video[0];
      if($this.fullscreenContext=='document' && de.requestFullScreen) {
          de.requestFullScreen();
      } else if($this.fullscreenContext=='document' && de.mozRequestFullScreen) {
          de.mozRequestFullScreen();
      } else if($this.fullscreenContext=='document' && de.webkitRequestFullScreen) {
          de.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
      } else if(ve.webkitEnterFullscreen) {
          $this.setPlaying(true);
          ve.webkitEnterFullscreen();
      } else if(ve.mozRequestFullScreen) {
          $this.setPlaying(true);
          ve.mozRequestFullScreen();
      } else {
          $this.switchedToFullscreen = false;
          return false;
      }
      $this.switchedToFullscreen = true;
      return true;
  };
  $this.leaveFullscreen = function(type) {
      if ($this.displayDevice!='html5') return false;
      $this.switchedToFullscreen = false;
      var ve = $this.video[0];
      if(document.cancelFullScreen) {
          document.cancelFullScreen();
      } else if(document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
      } else if(document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
      }else if(ve.webkitCancelFullscreen) {
          ve.webkitCancelFullscreen();
      } else if(ve.mozCancelFullScreen) {
          ve.mozCancelFullScreen();
      } else {
          return false;
      }
      return true;
  };

  // We will test whether volume changing is support on load an fire a `volumechange` event
  var _supportsVolumeChange = false; 
  $this.supportsVolumeChange = function(){
      if(_supportsVolumeChange) return true;
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
    if(!$this.loadDisplayDevice($this.displayDevice)) {
      if(!$this.loadDisplayDevice($this.displayDevice=='html5' ? 'flash' : 'html5')) {
        $this.displayDevice = 'none';
      }
    }
    $this.callback('loaded');
  }
  return $this;
};
