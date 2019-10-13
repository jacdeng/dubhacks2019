import redis from 'redis';
import http from 'http';
import socketio from 'socket.io';

const PORT = 8080;
const REDIS_IP = '175.0.0.3';

var sessions = {};

/**
 * Helper functions
 */
function hash(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}


/**
 * REDIS
 **/
 const client = redis.createClient({
     host: REDIS_IP
 });
client.on("error", (err) => {
    console.log("Redis error: " + err);
});


/**
 * HTTP Server
 **/
const requestHandler = (request, response) => {
  console.log("New request: " + request.url)
  response.end('Hello World!');
}
const server = http.createServer(requestHandler);

server.listen(PORT, () => {
    console.log("Socketio server listening on port " + PORT);
});


/**
 * SOCKET IO
 **/
const io = socketio(server);

/**
 * Top level socket communication code.
 */
io.on('connection', function (socket) {
  console.log("[SocketIO] New socket connection.");
});

/**
 * Recognition service communication code (Backend <--> Recognition Service)
 */
const recognition_socket = io.of('/service_recognition');
recognition_socket.on('connection', function(socket){
  console.log('Recognition service connected.');

});

/**
 * Client communication code (Backend <--> Recognition Service)
 */
const client_socket = io.of('/client');
client_socket.on('connection', function(socket){
  console.log('Client connected.');

  //Generate new session and session ID.
  var session_id = hash(6);
  sessions[session_id] = {
    session_id: session_id,
    connected_at: Math.floor(Date.now() / 1000),
  };
  console.log("[SocketIO] Assigned session ID: " + session_id);

  console.log("[SocketIO] Active sessions:");
  console.log(JSON.stringify(sessions, null, 2));

  socket.emit('session_id', session_id); //Return session id back.

  io.emit('this', { will: 'be received by everyone'});

  /**
   * Receives a new image from device.
   * @param image_string {String}      Base64 of image file.
   */
  socket.on('new-image', function (image_string) {
    console.log("[SocketIO "+session_id+"] New image data!");

    //TODO do some basic image validation here.

    //Send to recognition service.
    recognition_socket.emit('process-image', image_string);
  });

  socket.on('disconnect', function () {
    io.emit('user disconnected');
    delete sessions[session_id];
    console.log("[SocketIO] Client disconnected.");
    console.log("[SocketIO] Active sessions:");
    console.log(JSON.stringify(sessions, null, 2));
  });
});
