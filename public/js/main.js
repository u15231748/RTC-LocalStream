let localstream;
let remotetream = null;
let socket = io.connect('/')
let servers = {
    iceServers: [
        {
            urls: [
                "stun:stun1.1.google.com:19302",
                "stun:stun2.1.google.com:19302"
            ]
        },
        {
            url: 'turn:turn.bistri.com:80',
            credential: 'homeo',
            username: 'homeo'
        },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: [
                "stun:openrelay.metered.ca:80"
            ]
        }
    ]
}

const user1 = document.getElementById('user-1')
const streambtns = document.getElementById('streambtns')
const createstream = document.getElementById('createstream')
const connectstream = document.getElementById('connectstream')
const videoscontainer = document.getElementById('videos')
const upload = document.getElementById('upload')
const room = document.getElementById('room')
const peerConnection = new RTCPeerConnection(servers);
let receiver;

videoscontainer.style.display = "none"

const audioStream = () => {
    const ctx = new AudioContext();
    const oscil = ctx.createOscillator();
    const dest = oscil.connect(ctx.createMediaStreamDestination());
    oscil.start();
    return Object.assign(dest.stream.getAudioTracks()[0], {enabled: false});
}

const videoStream = ({width = 920, height = 720} = {}) => {
    const canvas = Object.assign(document.createElement('canvas'), {width, height});
    canvas.getContext('2d').fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getTracks()[0], {enabled: false});
}

let createPeerConnection = async () => {
    // // Local user adds their tracks to the peer connection
    localstream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localstream);
    });
    
    remotestream = new MediaStream()

    // Listening on when our remote user adds their tracks to the connection!
    peerConnection.ontrack = e => {
        e.streams[0].getTracks().forEach((track) => {
            if(remotestream) remotestream.addTrack(track)
        })
    }

    // Listening for icecandidates when they generated
    // From the Stun servers triggered by the localdescription
    peerConnection.onicecandidate = async (e) => {
        if(e.candidate){
            if(receiver)
                socket.emit("candidates", e.candidate, receiver)
        }
    }
}

const createOffer = async () => {
    localstream = new MediaStream([videoStream({width: 920, height: 720}), audioStream()])
    await createPeerConnection();

    remotestream = new MediaStream();
    user1.srcObject = remotestream;
    user1.style.width = '100%';
    user1.style.height = '100%';

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer)
    socket.emit("offer", offer, room.value)
}

const createAnswer = async (offer, user) => {
    await createPeerConnection();
    peerConnection.setRemoteDescription(offer)
    const answer = await peerConnection.createAnswer();
    peerConnection.setLocalDescription(answer)
    receiver = user;
    socket.emit("answer", answer, receiver)
}

socket.on("offerRequest", async (offer, user) => {
    await createAnswer(offer, user)
})

socket.on("newCandidates", candidates => {
    peerConnection.addIceCandidate(candidates)
})

socket.on("answered", answer => {
    if(!peerConnection.currentRemoteDescription)
        peerConnection.setRemoteDescription(answer)
})

socket.on("MemberJoined", data => {
    console.log(data)
})

createstream.addEventListener("click", async () => {
    if((room.value).length > 0){
        socket.emit("checkRoom", room.value, exist => {
            if(exist) alert("Room Already Exist!!")
            else upload.click()
        })
    }
});

upload.addEventListener("change", async ({ target: { files } }) => {
    socket.emit("joinRoom", room.value)
    user1.src = URL.createObjectURL(files[0])
    localstream = await user1.captureStream();
    videoscontainer.style.display = "block";
    streambtns.style.display = "none"
})

connectstream.addEventListener("click", async () => {
    if((room.value).length > 0){
        socket.emit("joinRoom", room.value)
        await createOffer();
        streambtns.style.display = "none"
        videoscontainer.style.display = "block"
    } else alert("Which room do you want to connect to?")
})