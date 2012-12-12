var Eingebaut = function(container, displayDevice, swfLocation, callback){
  var $ = jQuery;
  var $this = this;
  $this.container = $(container);
  $this.container.css({position:'relative'});
  $this.displayDevice = displayDevice||'html5';
  $this.swfLocation = swfLocation||'/eingebaut/lib/FlashFallback/EingebautDebug.swf';
  $this._callback = callback||function(){};
  $this.ready = false;
  $this.switching = false;

  // Blind for click and overlay (1x1px transparent gif to force layout in IE8)
  $this.blind = $(document.createElement('div'))
    .css({position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundImage:'url(data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)'});
  $this.container.append($this.blind);

  // The callback
  $this.callback = function(e){
    if($this.switching && e=='canplay') $this.switching = false;
    $this._callback(e);
  };

  /* HEAVY LIFTING */
  // Load either a html5 <video> element or something in Flash
  $this.loadDisplayDevice = function(displayDevice){
    $this.displayDevice = displayDevice;
    if ($this.displayDevice=='html5') {
      // HTML5 Display
      $this.video = $(document.createElement('video'))
        .css({position:'absolute', top:0, left:0, width:'100%', height:'100%'})
        .attr({'x-webkit-airplay':'allow', tabindex:0})    
        .bind('loadeddata progress timeupdate seeked seeking waiting stalled canplay play playing pause loadedmetadata ended volumechange', function(e){
            console.debug('html5 event', e.type);
            if(e.type=='canplay'&&_startTime>0) {
              $this.setCurrentTime(_startTime);
              _startTime = 0;
            }
            $this.callback(e.type);
          });
      if(!$this.video[0].canPlayType) {
        return false; // no html5 video
      }
      $this.container.prepend($this.video);
      this.ready = true;
      $this.callback('ready');
    } else {
      if(!swfobject.hasFlashPlayerVersion('10.0.0')) {
        return false;  // no flash support
      }
      
      // Flash Display
      window.FlashFallbackCallback = function(e){
        if(!$this.ready) {
          $this.ready = true;
          $this.callback('ready');
        }
        $this.callback(e);
      };
      
      // Start the Flash application up using swfobject
      // (if we should want to eliminate the swfobject dependency, that's doable: 
      //  make a simple <object> include with innerHTML after the containing object has been 
      //  placed in DOM. Only caveat is that classid must be set in IE, and not in other browsers.)
      $this.container.prepend($(document.createElement('div')).attr({'id':'FlashFallback'}));
      swfobject.embedSWF($this.swfLocation, 'FlashFallback', '100%', '100%', '10.0.0', '', {}, {allowscriptaccess:'always', allowfullscreen:'true', wmode:'opaque', bgcolor:'#000000'}, {id:'FlashFallback', name:'FlashFallback'}); 
      
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
    $this.video.prop('poster', poster);
  };
  $this.getPoster = function() {
    return $this.video.prop('poster');
  };
  $this.setPlaying = function(playing) {
    if (playing)
      $this.video[0].play();
    else 
      $this.video[0].pause();
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
      return $this.readyState>=3;
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
