### Eingebaut

Eingebaut is a JavaScript library, built to enable simple cross-browser video playback. It supports the vast majority of both desktop and mobile browsers. And it does both on-demand and live video.

Behind the scenes, the library will use either HTML5 `<video>` or Adobe Flash to display the video and its poster/thumbnail. As a programmer though, you will be able to interact with the video is a single JavaScript API exposing relevant methods and events.

### How can I use it?

To play back video, initialize an Eingebaut object:

```javascript
  var eingebaut = new Eingebaut(container, device, swfLocation, callback);
```

The simple example to start playing video might look like this:

```html
<div id=“video” style=“width:640px; height:360px”></div>
<script>
  var eingebaut = new Eingebaut('#video', 'html5', ‘Eingebaut.swf', function(event){
          if(event=='loaded' && eingebaut.displayDevice=='none') {
            alert('Eingebaut could find no way of playing video in your browser');
          } else {
            console.debug('Eingebaut callback:', event);
          }
        });
  eingebaut.load();
  eingebaut.setSource(‘my-video.mp4’);
  eingebaut.setPoster(‘my-video-poster.jpg’);
  eingebaut.setPlaying(true);
</script>
```

### Boostrapping Eingebaut

The initialization through `new Eingebaut(...)` takes for arguments:

* `container`: A jQuery object or a CSS selector for the element into which you want the video display to be placed. 
* `device`: Your prefered display device. Options are `html5` and `flash`. If the prefered device is not support by the browser, the alternative is selected.
* `swfLocation`: The relative location of the file `Eingebaut.swf`, which is used for Flash fallback.
* `callback`: A function called when an event occurs during video load and playback. The function takes a single argument, `event`, which is (logically) a string describing the current event (see below).

### Methods

* `.load()`: Load the video player of choice. (This is separated out from the initialization because the Flash display required that the container the player is loaded in to has already been added to the DOM. There are use case where this might not be the case upon initilization, but it must be on load in order for Eingebaut to work.)
* `.setSource(source, startTime)`: Set the URL of a video source and optionally a `startTime` in seconds if you want to jump in to the video. The latter option may require support for HTTP pseudo-streaming through `?start=<startTime>` by the server.
* `.getSource()`: Get the video source.
* `.setPoster(poster)`: Set a thumbnail/poster for the video to display before playback.
* `.getPoster()`: Get the URL of the thumbnail/poster.
* `.setPlaying(playing)`: Set the play back status. If `playing` is true, the video will start playing.
* `.getPlaying()`: Returns a boolean value indicating whether the video is currently playing.
* `.setPaused(paused)`: Set the play back status. If `paused` is true, the video will pause.
* `.getPaused()`: Returns a boolean value indicating whether the video is currently paused.
* `.setCurrentTime(currentTime)`: Seek to `currentTime`.
* `.getCurrentTime()`: Returns the current playhead time.
* `.getEnded()`: Returns a boolean value indicating whether the video has been played to its end. 
* `.getSeeking()`: Returns a boolean value indicating whether the video is currently seeking.
* `.getStalled()`: Returns a boolean value indicating whether the video is currently stalled.
* `.getDuration()`: Get the duration, in seconds, of the video.
* `.getBufferTime()`: Get the buffer time, in scconds, of where the video has buffered to. (This is different from the usual `bufferTime` value in Flash, which specifies the programmer’s preference for the optimal length of the buffer. For HTML5, Eingebaut doesn’t expose the entirety of different buffer ranges, and opts for just showing the currently relevant one.)
* `.setVolume(volume)`: Set the volume, between 0 (mute) and 1 (maximum rock and roll).
* `.getVolume()`: Get the volume.
* `.getIsLive()`: Returns a boolean value indicating whether the video source is a live stream.
* `.canPlayType(type)`: Tests whether a give mime type can be played by the current `displayDevice` (see below)
* `.hasFullscreen()`: Does the playback device support switching to full screen?
* `.isFullscreen()`: Is the video currently being displayed in full screen?
* `.enterFullscreen()`: Switch to full screen, if available. 
* `.leaveFullscreen()`: Leave full screen, if available. 
* `.supportsVolumeChange()`: Does the playback device support changing volume through JavaScript?
* `.allowHiddenControls()`: Does the playback device support showing the `<video>` element without any native user interface? This covers the case of the iPhone, where HTML5 video elements will always have native play button overlayed. Eingebaut handles this annoyance by hiding the <video> element until playback, and is instead just showing the specified poster through a normal `<img>`.

### Video Codecs
Generally, HTML5 (`displayDevice=“html5”`) will be able to play:

* `video/mp4; codecs="avc1.42E01E”`: On-demand mpeg-4/h.264 video, supported Safari, Chrome and IE if you’re lucky.
* `video/webm`: On-demand WebM/VP8 video, supported by Chrome, Firefox and Opera.
* `application/vnd.apple.mpegurl`: Apple HTTP Live Streaming, usually mpeg-4/h.264 live video, supported by Safari.

Flash/OSMF (`displayDevice=“flash”`) will play:

* `video/mp4; codecs="avc1.42E01E”`: On-demand mpeg-4/h.264 video, supported by Flash 10.1 (actually by 9.0.115, but Eingebaut requires 10.2 due to it use of OSMF behind the scenes.)
* `application/f4m+xml`: Adobe HTTP Dynamic Streaming, usually also mpeg-4/h.264 live video, supported by Adobe Flash.


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
* `loaded`

### Dependencies and Supported Browsers

Eingebaut has been tested and work in Internet Explorer 6+, Safari 4+, Opera 9+ and Firefox 3+ along with Mobile Safari on all recent versions of iOS for iPad and iPhone.

The project depends on [`jQuery`](http://jquery.com/) and [`SWFObject`](http://code.google.com/p/swfobject/).
