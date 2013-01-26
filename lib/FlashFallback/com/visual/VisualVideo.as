package com.visual {
    /* Flash widgets */
    import flash.display.Sprite;
    import flash.external.ExternalInterface;
    import flash.events.Event;

    /* OSMF widgets */
    import org.osmf.containers.MediaContainer; 
    import org.osmf.elements.VideoElement; 
    import org.osmf.media.MediaPlayer;
    import org.osmf.media.URLResource;
    import org.osmf.net.httpstreaming.HTTPStreamingNetLoader;
    import org.osmf.utils.OSMFSettings;
    import org.osmf.events.LoadEvent;

    public class VisualVideo extends Sprite {
        // Create the container classes to displays media. 
        OSMFSettings.enableStageVideo = false;
        private var image:VisualImage = new VisualImage();
        private var videoContainer:MediaContainer = new MediaContainer(); 
        private var video:MediaPlayer = new MediaPlayer(); 
        private var videoElement:VideoElement = null;
        private var loadFired:Boolean = false;
        private var videoEnded:Boolean = false;
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

            // Add the MediaContainer instance to the stage
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
            var isPlaying:Boolean = video.playing;
            var pseudoSource:String = '';
            if(this.pseudoStreamingOffset==0) {
                pseudoSource = _source;
            } else {
                pseudoSource = _source + (_source.match(new RegExp("\?")) ? '&' : '?') + 'start=' + this.pseudoStreamingOffset;
            }
            _duration = 0;
            var resource:URLResource = new URLResource(pseudoSource); 
            videoElement = new VideoElement(resource, new HTTPStreamingNetLoader()); 
            videoElement.smoothing = true;
            videoContainer.addMediaElement(videoElement); 
            video.autoRewind = false;
            video.autoPlay = isPlaying;

            if(!this.attachedEvents) {
                this.video.addEventListener('durationChange', function():void{_duration=video.duration;});
                this.video.addEventListener('bytesLoadedChange', function():void{callback('progress');});
                this.video.addEventListener('complete', function():void{
                    videoEnded = true;
                    callback('ended');
                });
                this.video.addEventListener('volumeChange', function():void{callback('volumechange');});
                this.video.addEventListener('currentTimeChange', function():void{callback('timeupdate');});
                this.video.addEventListener('canPlayChange', function():void{if(video.canPlay) callback('canplay');});
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

            video.media = videoElement; 
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
            if(p) {
                if(this.videoEnded) this.currentTime = 0;
                this.video.play();
            } else {
                this.video.pause();
            }
        }
        public function get playing():Boolean {
            return this.video.playing;
        }
        
        // Property: Seeking
        public function get seeking():Boolean {
            return this.video.seeking;
        }
        
        // Property: Stalled
        public function get stalled():Boolean {
            return (this.video.state=='buffering' || this.video.state=='loading' ||  this.video.state=='playbackError');
        }
        
        // Property: Ended
        public function get ended():Boolean {
            return false;
        }
        
        // Property: Current time
        public function set currentTime(ct:Number):void {
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
            return this.pseudoStreamingOffset + this.video.currentTime;
        }
        
        // Property: Duration
        private var _duration:Number = 0; 
        public function get duration():Number {
            return this.pseudoStreamingOffset+_duration;
        }
        
        // Property: Buffer time
        public function get bufferTime():Number {
            var bytesLoaded:int = (this.video ? this.video.bytesLoaded : 0);
            var bytesTotal:int = (this.video ? this.video.bytesTotal : 0);
            if(this.duration<=0 || bytesLoaded<=0 || bytesTotal<=0) {
                return 0;
            } else {
                return this.pseudoStreamingOffset+((bytesLoaded/bytesTotal)*_duration);
            }
        }
    
        // Property: Volume
        public function set volume(v:Number):void {
            this.video.volume = v;
        }
        public function get volume():Number {
            return this.video.volume;
        }

        // Property: isLive
        public function get isLive():Boolean {
            return( /^rtmp:\/\//.test(_source.toLowerCase()) || /\.f4m$/.test(_source.toLowerCase()) );
        }


        private function matchVideoSize(e:Event=null):void {
            try {
                this.videoContainer.width = this.stage.stageWidth;
                this.videoContainer.height = this.stage.stageHeight;
            }catch(e:Error){}
       }
    }
}