package com.visual {
    /* Flash widgets */
    import flash.display.Sprite;
    import flash.external.ExternalInterface;
    import flash.events.Event;

    /* OSMF widgets */
    import org.osmf.media.MediaPlayerSprite;
    import org.osmf.media.MediaPlayer;
    import org.osmf.media.URLResource;
    import org.osmf.elements.VideoElement;
    import org.osmf.media.MediaElement;
    import org.osmf.utils.OSMFSettings;
    import org.osmf.events.LoadEvent;
    import org.osmf.layout.LayoutMetadata;
    import org.osmf.layout.ScaleMode;

    public class VisualVideo extends Sprite {
        // Create the container classes to displays media. 
        OSMFSettings.enableStageVideo = false;
        private var image:VisualImage = new VisualImage();
        private var videoContainer:MediaPlayerSprite = null;
        private var video:MediaPlayer = null;
        private var layout:LayoutMetadata = new LayoutMetadata();
        private var loadFired:Boolean = false;
        private var videoEnded:Boolean = false;
        private var queuePlay:Boolean = false;
        private var attachedEvents:Boolean = false;
        public var pseudoStreamingOffset:Number = 0;

        // Logging
        private function trace(s:String):void {
            try {
                ExternalInterface.call("console.log", "FlashFallback", s);
            }catch(e:Error){}
        }

        // Callback for events
        public var callback:Function = function():void{};
    
        // Constructor method
        public function VisualVideo() {}
        private var inited:Boolean = false;
        private function init():void {
            if(inited) return;

            // Alignment
            layout.scaleMode = ScaleMode.LETTERBOX;
            layout.verticalAlign = 'middle';
            layout.horizontalAlign = 'center';
            // Add video stage
            videoContainer = new MediaPlayerSprite();
            this.addChild(videoContainer); 
            // Size
            this.stage.addEventListener(Event.RESIZE, matchVideoSize);
            matchVideoSize();

            inited = true;
        }

        // PROPERTIES
        // Property: Source
        private var _source:String = null;
        public function set source(s:String):void {
            init();

            _source=s;
            //this really should be reset here, but we need to be able to overwrite with a property// this.pseudoStreamingOffset = 0;

            this.loadFired = false;
            this.videoEnded = false;
            var isPlaying:Boolean = (video && video.playing);
            var pseudoSource:String = '';
            if(this.pseudoStreamingOffset==0) {
                pseudoSource = _source;
            } else {
                pseudoSource = _source + (_source.match(new RegExp("\?")) ? '&' : '?') + 'start=' + this.pseudoStreamingOffset;
            }
            _duration = 0;

            // Load the stream and attach to playback
  	    var resource:URLResource = new URLResource(pseudoSource);
            video = videoContainer.mediaPlayer;
            video.autoPlay = isPlaying||queuePlay;
            queuePlay = false;
            video.autoRewind = false;
            videoContainer.resource = new URLResource(pseudoSource);
            videoContainer.media.addMetadata(LayoutMetadata.LAYOUT_NAMESPACE, layout);
            if (videoContainer.media is VideoElement) (videoContainer.media as VideoElement).smoothing = true;
            matchVideoSize();

            if(!this.attachedEvents) {
                this.video.addEventListener('durationChange', function():void{_duration=video.duration;});
                this.video.addEventListener('bytesLoadedChange', function():void{callback('progress');});
                this.video.addEventListener('complete', function():void{
                    videoEnded = true;
                    callback('ended');
                });
                this.video.addEventListener('volumeChange', function():void{callback('volumechange');});
                this.video.addEventListener('currentTimeChange', function():void{callback('timeupdate');});
                this.video.addEventListener('canPlayChange', function():void{
                    if(video.canPlay) {
                        callback('canplay');
                        if(queuePlay) {
                            playing = true;
                            queuePlay = false;
                        }
                    }
                });
                this.video.addEventListener('mediaPlayerStateChange', function():void{
                    if( !loadFired && (video.state=='playing'||video.state=='buffering'||video.state=='loading'||video.state=='ready')) {
                        callback('loadeddata');
                        callback('loadedmetadata');
                        loadFired = true;
                    }
                    if( video.state=='buffering'||video.state=='playbackError'||video.state=='loading' ) {
                        callback('stalled');
                    } else if( video.state=='playing' ) {
                        callback('play');
                        callback('playing');
                    } else if( video.state=='paused'||video.state=='ready' ) {
                        callback('pause');
                    }
                });
                this.attachedEvents = true;
            }
        }
        public function get source():String {
            return _source;
        }

        // Property: Poster
        private var _poster:String = null;
        public function set poster(p:String):void {
            init();

            if(_poster==p) return;
            this.addChildAt(image,0);
            image.source = p;
            _poster=p;
        }
        public function get poster():String {
            return _poster;
        }
        
        // Property: Playing
        public function set playing(p:Boolean):void {
            if(!this.video) return;
            try {
                if(p) {
                    if(this.videoEnded) this.currentTime = 0;
                    this.video.play();
                } else {
                    this.video.pause();
                }
            }catch(e:Error){
                queuePlay = p;
            }
        }
        public function get playing():Boolean {
          
            return this.video && this.video.playing;
        }
        
        // Property: Seeking
        public function get seeking():Boolean {
            return this.video && this.video.seeking;
        }
        
        // Property: Stalled
        public function get stalled():Boolean {
            return (this.video && (this.video.state=='buffering' || this.video.state=='loading' ||  this.video.state=='playbackError'));
        }
        
        // Property: Ended
        public function get ended():Boolean {
            return this.videoEnded;
        }
        
        // Property: Current time
        public function set currentTime(ct:Number):void {
            if(!this.video) return;
            if(ct<0||ct>duration) return;
            if(isLive) return;

            if(ct<this.pseudoStreamingOffset || ct>this.bufferTime) {
                _duration = duration - ct; // Guesstimate the duration of the new clip before changing the offset
                this.pseudoStreamingOffset = ct;
                trace('Pseudo streaming from ' + this.pseudoStreamingOffset);
                source = source; // switch source with new pseudo stream time
            } else {
                this.video.seek(ct-this.pseudoStreamingOffset);
            }
        }
        public function get currentTime():Number {
            return (this.video ? this.pseudoStreamingOffset + this.video.currentTime : 0);
        }
        
        // Property: Duration
        private var _duration:Number = 0; 
        public function get duration():Number {
            if(isLive) {
              return currentTime;
            } else {
              return (this.video ? this.pseudoStreamingOffset+_duration : 0);
            }
        }
        
        // Property: Buffer time
        public function get bufferTime():Number {
            if(!this.video) return 0;

            if(isLive) {
                return currentTime;
            } else {
                var bytesLoaded:int = (this.video ? this.video.bytesLoaded : 0);
                var bytesTotal:int = (this.video ? this.video.bytesTotal : 0);
                if(this.duration<=0 || bytesLoaded<=0 || bytesTotal<=0) {
                    return 0;
                } else {
                    return this.pseudoStreamingOffset+((bytesLoaded/bytesTotal)*_duration);
                }
            }
        }
    
        // Property: Volume
        public function set volume(v:Number):void {
            if(!this.video) return;
            this.video.volume = v;
        }
        public function get volume():Number {
            if(!this.video) return 1;
            return this.video.volume;
        }

        // Property: isLive
        public function get isLive():Boolean {
            return( /^rtmp:\/\//.test(_source.toLowerCase()) || /\.f4m$/.test(_source.toLowerCase()) );
        }


        private function matchVideoSize(e:Event=null):void {
            try {
                videoContainer.height = this.stage.stageHeight;
                videoContainer.width = this.stage.stageWidth;
                layout.height = this.stage.stageHeight;
                layout.width = this.stage.stageWidth;
            }catch(e:Error){}
       }
    }
}