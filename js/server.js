/*jshint
  esversion: 6,
  node: true
*/

let port = 65432;

let server;
server = require('http').createServer(reqHandler);

server.listen(port, () => {
    // console.log('Server listening at port: ' + port);
}).on('error', err => {
    if (err.code === 'EADDRINUSE') {
        console.error('Port ' + err.port + ' already in use!');
    } else {
        console.error('Error: ' + err.code);
    }
});

function reqHandler(req, res) {
    // https://developers.google.com/youtube/iframe_api_reference
    // https://developers.google.com/youtube/player_parameters?playerVersion=HTML5

    let page = `
    <html style="padding: 0; margin: 0;">
        <body style="width: 100vw; height: 100vh; padding: 0; margin: 0;">
        <div id="ytPlayerContainer" style="width: 100%; height: 100%"></div>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
            var ytPlayer;
            function onYouTubeIframeAPIReady() {
                ytPlayer = new YT.Player('ytPlayerContainer', {
                    videoId: 'XIMLoLxmTDw', // 10 hr black screen
                    playerVars: {
                        fs: 0,
                        rel: 0,
                        modestbranding: 1,
                        iv_load_policy: 3,
                        controls: 0,
                        showinfo: 0,
                    },
                    events: {},
                });
            }
        </script>
        </body>
    </html>`;

    res.setHeader('Content-type', 'text/html');
    res.statusCode = 200;
    res.end(page);
}