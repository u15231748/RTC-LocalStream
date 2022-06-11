const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const server = require('http').createServer(app);
const io = require('socket.io')(server)

const PORT = process.env.PORT || 5000

app.use(express.static(path.join(__dirname, 'public')))
app.use(cors());

app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))

let currentStream = null

io.on('connection', socket => {
    socket.on("isThereAStream", check => {
        if(currentStream) check(true);
        else check(false);
    })

    socket.on("joinRoom", (room) => {
        socket.join(room)
        socket.to(room).emit("MemberJoined", `${socket.id} joined the stream`)
        if(!currentStream) currentStream = socket;
    })

    socket.on("offer", (offer, room) => {
        socket.to(room).emit("offerRequest", offer)
    })

    socket.on("candidates", (candidate, room) => {
        socket.to(room).emit("newCandidates", candidate)
    })

    socket.on("answer", (answer, room) => {
        socket.to(room).emit("answered", answer)
    })

    socket.on("disconnect", () => {
        if(socket === currentStream) currentStream = null;
    })
})

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
