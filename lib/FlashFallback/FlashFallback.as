package {
  import flash.display.Sprite;
  import flash.events.Event;
  import flash.external.ExternalInterface;
  import com.visual.VisualVideo;
  import flash.events.ErrorEvent;
  import flash.system.Security;

  public class FlashFallback extends Sprite {
    private var video:VisualVideo;
    
    private function trace(s:String):void {
      ExternalInterface.call("console.log", "FlashFallback", s);
    }
    public function FlashFallback() {
      stage.scaleMode = 'noScale'; //StageScaleMode.NO_SCALE
      stage.align = 'TL'; //StageAlign.TOP_LEFT;
      Security.allowDomain('*');

      video = new VisualVideo();
      addChild(video);
      
      if (ExternalInterface.available) {
        video.callback = function(ev:String):void {
          ExternalInterface.call("FlashFallbackCallback", ev);
        }
        ExternalInterface.addCallback("setSource", function(source:String):void {
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
        ExternalInterface.addCallback("setPlaying", function(playing:Boolean):void {
            video.playing = playing;
          });
        ExternalInterface.addCallback("getPlaying", function():Boolean{
            return video.playing;
          });
        ExternalInterface.addCallback("setPaused", function(paused:Boolean):void {
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
        trace('Loaded ExternalInterface');
        video.callback('flashloaded');
      } else {
        trace('Error loading FlashFallback: No ExternalInterface');
      }
    }
  }
}
