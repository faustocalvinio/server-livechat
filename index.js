const express = require("express");

const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require('dotenv');
const { createClient } = require('@libsql/client');


dotenv.config();

const allMessages=[];

const app = express();
const port = process.env.PORT || 3001;

const db = createClient({
  url: 'libsql://curso-live-chat-faustocalvinio.turso.io',
  authToken: process.env.DB_TOKEN
});

const initialMessages=[]

app.use(cors());

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", async  (socket) => {
  
  socket.on("join_room", (data) => {
    socket.join(data); 
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
 
  });
  socket.on('disconnect', () => {
    console.log('an user has disconnected')
  })   

  socket.on("send_message", async (data) => {


    try {
      result = await db.execute({
        sql: 'INSERT INTO messages (content, user) VALUES (:msg, :username)',
        args: { msg:data.message, username:data.user }
      })
    } catch (e) {
      console.error(e)
      return
    }




    console.log(`recibido ${JSON.stringify(data)}`);
    allMessages.push(data);
    socket.to(data.room).emit("new_message",allMessages)
  });
  
  if (!socket.recovered) { // <- recuperase los mensajes sin conexión
    try {
      const results = await db.execute({
        sql: 'SELECT id, content, user FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0]
      })

      results.rows.forEach(row => {
      // console.log( row.content, row.id.toString(), row.user)
      initialMessages.push({
        message:row.content,
        user:row.user,
        id:row.id.toString()
      })
      // console.log(initialMessages);
      socket.to(1).emit("recover_messages",initialMessages)
      })
    } catch (e) {
      console.error(e)
    }
  }
});

server.listen(port,()=>console.log('Server on port 3001'));
