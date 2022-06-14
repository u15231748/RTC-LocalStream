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

let currentStream = []

io.on('connection', socket => {
    socket.on("joinRoom", (room) => {
        socket.join(room)
        socket.to(room).emit("MemberJoined", `${socket.id} joined the stream`)
        if(!currentStream.find(conn => conn.room === room)){
            currentStream.push({
                user: socket.id,
                room: room
            });
        }
    })

    socket.on("checkRoom", (data, cb) => {
        if(currentStream.find(conn => conn.room === data)) cb(true);
        else cb(false);
    })

    socket.on("offer", (offer, room) => {
        const offee = currentStream.filter((conn) => conn.room === room)
        socket.to(offee[0].room).emit("offerRequest", offer, socket.id)
    })

    socket.on("candidates", (candidate, room) => {
        socket.to(room).emit("newCandidates", candidate)
    })

    socket.on("answer", (answer, room) => {
        socket.to(room).emit("answered", answer)
    })

    socket.on("disconnect", () => {
        currentStream.forEach((conn, index) => {
            if(conn.user === socket.id){
                currentStream.splice(index, 1);
                return;
            }
        })

        console.log(currentStream)
    })
})

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
