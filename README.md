### Eingebaut

Eingebaut is a JavaScript library, built to enable simple cross-browser video playback. Behind the scenes, the library will use either HTML5 `<video>` or Adobe Flash to display the video and its poster/thumbnail. As a programmer though, you will be able to interact with the video is a single JavaScript API exposing relevant methods and events.

The project requires `jQuery` and optionally makes use of `SWFObject`.

### Usage

To initialize an Eingebaut player, go...

   var eingebaut = new Eingebaut(container, device, swfLocation, callback);

`container` is either a jQuery object or a CSS selector for the element into which you want the player to be placed. 

`device` is your prefered display device. Options are `html5` and `flash`. If the prefered device is not support by the browser, the alternative is selected.

`swfLocation` is the relative location of the file `eingebaut.swf`, which is used for Flash fallback.

`callback` is a function called whenever a player event occurs. The function takes a single argument, `event`, which is (logically) a string describing the current event (see below).

### Example load


    <div id="video" style="width:640px; height:640px;"></div>
    <script>
      var eingebaut = new Eingebaut($('#video'), 'html5', 'eingebaut.swf', function(event){
          if(event=='loaded' && eingebaut.displayDevice=='none') {
            alert('Eingebaut could find no way of playing video in your browser');
          } else {
            console.debug('Eingebaut callback:', event);
          }
        });
      eingebaut.load();
      eingebaut.setSource('...');
    </script>
    

### Methods

* `.load()`: Load the video player of choice. This is separated out from the initialization because the Flash display required that the container the player is loaded in to has already been added to the DOM. There are use case where this might not be the case upon initilization, but it must be on load in order for Eingebaut to work.
* `.setSource(source)`: 
* `.getSource()`: 
* `.setPoster(poster)`: 
* `.getPoster()`: 
* `.setPlaying(playing)`: 
* `.getPlaying()`: 
* `.setPaused(paused)`: 
* `.getPaused()`: 
* `.setCurrentTime(currentTime)`: 
* `.getCurrentTime()`: 
* `.getEnded()`: 
* `.getSeeking()`: 
* `.getDuration()`: 
* `.getBufferTime()`: 
* `.setVolume(volume)`: 
* `.getVolume()`: 
* `.getIsLive()`: 
* `.canPlayType(type)`: 

### Callbacks

* `ready`
* `progress`
* `timeupdate`
* `seeked`
* `canplay`
* `play`
* `playing`
* `pause`
* `loadedmetadata`
* `ended`
* `volumechange` 
* `displaydevice`
* `loaded`

### Todo

* *Fill in information above* to detail methods and callbacks further.
* *Enable or disable pseudostreaming*: Add a property controlling whether or not to use HTTP Pseudo Streaming in Flash, this is currently always on.
* *Make SWFObject optional*: This is done by simply using `<object>` instead of SWFObject, although this approach will mean that we are not able to do Flash checking or even version testing.
* *seeking event in Flash*: 
