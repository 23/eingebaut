package com.visual {
  import flash.display.Sprite;
  import flash.display.Loader;
  import flash.net.URLRequest;
  import flash.display.Bitmap;
  import flash.system.LoaderContext; 

  import flash.external.ExternalInterface;
  import flash.events.Event;
  import flash.events.ErrorEvent;

  public class VisualImage extends Sprite {
    private var loader:Loader;
    private var context:LoaderContext;
    private var image:Bitmap;

    // Logging
    private function trace(s:String):void {
      try {
        ExternalInterface.call("console.log", "FlashFallback", s);
      }catch(e:ErrorEvent){}
    }

    // Constructor method
    public function VisualImage() {}

    private var _inited:Boolean = false;
    private function init():void {
      if(_inited) return;
      _inited = true;

      context = new LoaderContext(); 
      context.checkPolicyFile = true; 

      loader = new Loader();
      loader.contentLoaderInfo.addEventListener(Event.COMPLETE,onLoadingComplete);
      this.stage.addEventListener(Event.RESIZE, onResize);
    }
    
    private function onLoadingComplete(e:Event):void {
      image = Bitmap(loader.content);
      image.smoothing=true;
      this.addChild(image);

      onResize(e);
      this.visible = true;
    }

    private function onResize(e:Event=null):void {
      var stageAspectRatio:Number = this.stage.stageWidth/this.stage.stageHeight;
      var x:int, y:int, w:int, h:int = 0;
      if(stageAspectRatio>this.imageAspectRatio) {
        h = this.stage.stageHeight;
        w = this.stage.stageHeight*this.imageAspectRatio;
        x = (this.stage.stageWidth-w)/2;
        y = 0;
      } else {
        w = this.stage.stageWidth;
        h = this.stage.stageWidth/this.imageAspectRatio;
        x = 0;
        y = (this.stage.stageHeight-h)/2;
      }
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
    }

    // PROPERTIES
    // Property: Source
    private var _source:String = "";
    public function set source(s:String):void {
      //s = "/large.jpg";
      if(_source==s) return;
      _source = s;

      // Hide the current image and show a new one
      init(); 
      this.visible = false;
      loader.load(new URLRequest(s), context);
    }
    public function get source():String {
      return _source;
    }

    // Property: Width
    public function get imageWidth():Number {
      return (loader && loader.contentLoaderInfo ? loader.contentLoaderInfo.width : 0);
    }
    // Property: Height
    public function get imageHeight():Number {
      return (loader && loader.contentLoaderInfo ? loader.contentLoaderInfo.height : 0);
    }
    // Property: Aspect ratio
    public function get imageAspectRatio():Number {
      try {
        return this.imageWidth/this.imageHeight;
      }catch(e:ErrorEvent) {}
      return 1;
    }
  }
}
