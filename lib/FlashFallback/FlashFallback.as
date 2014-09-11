package {
  import flash.display.Sprite;
  import flash.text.TextField;
  import flash.text.TextFormat;
  import flash.events.Event;
  import flash.events.FullScreenEvent;
  import flash.events.MouseEvent;
  import flash.external.ExternalInterface;
  import com.visual.VisualVideo;
  import flash.system.Security;
  import flash.utils.setTimeout;
  import flash.utils.clearTimeout;

  public class FlashFallback extends Sprite {
    private var video:VisualVideo;

    private var fullscreenBackground:Sprite = null;
    private var fullscreenMessage:TextField = null;
    private var fullscreenClick:Sprite = null;
    private var fullscreenTimeout:int = 0;
    private var isFullscreen:Boolean = false;
    
    private function trace(s:String):void {
      try {
        ExternalInterface.call("console.log", "FlashFallback", s);
      }catch(e:Error){}
    }
    public function FlashFallback() {
      stage.scaleMode = 'noScale'; //StageScaleMode.NO_SCALE
      stage.align = 'TL'; //StageAlign.TOP_LEFT;
      Security.allowDomain('*');

      video = new VisualVideo();
      addChild(video);

      // Handle full screen popup message
      this.stage.addEventListener(Event.RESIZE, this.clearFullscreenMessage);
      stage.addEventListener('fullScreen', function(event:FullScreenEvent):void {
        if(event.fullScreen) {
          isFullscreen = true;
          video.callback('enterfullscreen');
        } else {
          isFullscreen = false;
          video.callback('leavefullscreen');
        }
        clearFullscreenMessage();
      });

      // Interact with JavaScript
      if (ExternalInterface.available) {
        video.callback = function(ev:String):void {
          //trace('FlashFallbackCallback: ' + ev);
          ExternalInterface.call("FlashFallbackCallback", ev);
        }

        ExternalInterface.addCallback("setSource", function(source:String, startTime:Number=0):void {
            video.pseudoStreamingOffset = startTime;
            video.source = source;
          });
        ExternalInterface.addCallback("getSource", function():String{
            return video.source;
          });
        ExternalInterface.addCallback("setPoster", function(poster:String):void {

            // This is specific for 23 Video where flash is not allowed to access the root
            // folder on the server; but it is allowed to read in thumbnails and videos
            // from a specific list of subfolders. To do so, we will need to read the 
            // specific policy files for each folder though.
            var res:Array = poster.match(new RegExp('^https?://[^/]+/[0-9]+\/'));
            if(res.length>0) {
              var crossdomainPolicyURL:String = res[0] + 'crossdomain.xml';
              trace('Loading policy file, ' + crossdomainPolicyURL);
              Security.loadPolicyFile(crossdomainPolicyURL);
            }
            // (end)

            video.poster = poster;
          });
        ExternalInterface.addCallback("getPoster", function():String{
            return video.poster;
          });
        ExternalInterface.addCallback("getProgramDate", function():Number{
            return video.programDate;
          });
        ExternalInterface.addCallback("setPlaying", function(playing:Boolean):void {
            if(isFullscreen&&!playing) return;
            video.playing = playing;
          });
        ExternalInterface.addCallback("getPlaying", function():Boolean{
            return video.playing;
          });
        ExternalInterface.addCallback("setPaused", function(paused:Boolean):void {
            if(isFullscreen&&paused) return;
            video.playing = !paused;
          });
        ExternalInterface.addCallback("getPaused", function():Boolean{
            return !video.playing;
          });
        ExternalInterface.addCallback("setCurrentTime", function(currentTime:Number):void {
            video.currentTime = currentTime;
          });
        ExternalInterface.addCallback("getCurrentTime", function():Number{
            return video.currentTime;
          });
        ExternalInterface.addCallback("getEnded", function():Boolean{
            return video.ended;
          });
        ExternalInterface.addCallback("getSeeking", function():Boolean{
            return video.seeking;
          });
        ExternalInterface.addCallback("getStalled", function():Boolean{
            return video.stalled;
          });
        ExternalInterface.addCallback("getDuration", function():Number{
            return video.duration;
          });
        ExternalInterface.addCallback("getBufferTime", function():Number{
            return video.bufferTime;
          });
        ExternalInterface.addCallback("setVolume", function(volume:Number):void {
            video.volume = volume;
          });
        ExternalInterface.addCallback("getVolume", function():Number{
            return video.volume;
          });
        ExternalInterface.addCallback("getIsLive", function():Boolean{
            return video.isLive;
          });
        ExternalInterface.addCallback("enterFullscreen", function():void{
            drawFullscreenMessage();
          });
        ExternalInterface.addCallback("getIsFullscreen", function():Boolean{
            return isFullscreen;
          });
        ExternalInterface.addCallback("leaveFullscreen", function():void{
            stage.displayState = 'normal';
          });
        trace('Loaded ExternalInterface');
        video.callback('flashloaded');
      } else {
        trace('Error loading FlashFallback: No ExternalInterface');
      }
    }

    private function clearFullscreenMessage(e:Object = null):void {
      if(fullscreenBackground) {
        this.removeChild(fullscreenBackground);
        this.removeChild(fullscreenMessage);
        this.removeChild(fullscreenClick);
        fullscreenBackground = null;
        fullscreenClick = null;
        fullscreenMessage = null;
        if(fullscreenTimeout) {
          clearTimeout(fullscreenTimeout);
          fullscreenTimeout = 0;
        }
        video.callback('clearfullscreenprompt');
      }
    }

    private function drawFullscreenMessage(width:int = 240, height:int = 46):void {
      clearFullscreenMessage();

      var x:Number = (stage.stageWidth - width) / 2.0;
      var y:Number = (stage.stageHeight - height) / 2.0;

      // Background
      fullscreenBackground = new Sprite;
      fullscreenBackground.graphics.beginFill(0x000000);
      fullscreenBackground.graphics.drawRoundRect(0, 0, width, height, height/2, height/2);
      fullscreenBackground.graphics.endFill();
      fullscreenBackground.alpha = 0.8;
      fullscreenBackground.x = x;
      fullscreenBackground.y = y;
      
      // Text display
      fullscreenMessage = new TextField;
      var fmt:TextFormat = new TextFormat();
      fullscreenMessage.text = 'Click to enter full screen';
      fmt.color = 0xFFFFFF;
      fmt.font="Arial";
      fmt.size = 18;
      fullscreenMessage.selectable = false;
      fullscreenMessage.setTextFormat(fmt); 
      fullscreenMessage.autoSize = 'center';
      fullscreenMessage.x = x + ((width-fullscreenMessage.width)/2.0);
      fullscreenMessage.y = y + ((height-fullscreenMessage.height)/2.0);

      // Click container, mostly to be sure about buttonMode
      fullscreenClick = new Sprite;
      fullscreenClick.graphics.beginFill(0x000000);
      fullscreenClick.graphics.drawRoundRect(0, 0, width, height, height/2, height/2);
      fullscreenClick.graphics.endFill();
      fullscreenClick.alpha = 0;
      fullscreenClick.x = x;
      fullscreenClick.y = y;
      fullscreenClick.buttonMode = true;

      this.addChild(fullscreenBackground);
      this.addChild(fullscreenMessage);
      this.addChild(fullscreenClick);

      fullscreenClick.addEventListener(MouseEvent.CLICK, function():void {stage.displayState = 'fullScreen';});
      fullscreenTimeout = flash.utils.setTimeout(clearFullscreenMessage, 10000);
      video.callback('fullscreenprompt');
    }
  }
}
