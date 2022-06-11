let localstream;
let remotetream;
const room = "rtc"
let socket = io.connect('/')
let servers = {
    iceServers: [
        {
            urls: [
                "stun:stun1.1.google.com:19302",
                "stun:stun2.1.google.com:19302"
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
const peerConnection = new RTCPeerConnection(servers);

socket.emit("isThereAStream", response => {
    videoscontainer.style.display = 'none';
    if(response){
        createstream.style.display = 'none'
    } else {
        connectstream.style.display = 'none';
    }
})

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

// const createLocalStream = async () => {
//     localstream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: false
//     })
//     user1.srcObject = localstream;
// }

let createPeerConnection = async () => {
    // // Local user adds their tracks to the peer connection
    localstream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localstream);
    });

    // Listening on when our remote user adds their tracks to the connection!
    peerConnection.ontrack = e => {
        if(remotestream){
            e.streams[0].getTracks().forEach((track) => {
                remotestream.addTrack(track)
            })
        }
    }

    // Listening for icecandidates when they generated
    // From the Stun servers triggered by the localdescription
    peerConnection.onicecandidate = async (e) => {
        if(e.candidate){
            // console.log("Icecandidate: ", e.candidate)
            socket.emit("candidates", e.candidate, room)
        }
    }
}

// const createOffer = async () => {
//     await createPeerConnection();
//     const offer = await peerConnection.createOffer();
//     await peerConnection.setLocalDescription(offer)
//     socket.emit("offer", offer, room)
// }

// const createAnswer = async (offer) => {
//     await createPeerConnection();
//     peerConnection.setRemoteDescription(offer)
//     const answer = await peerConnection.createAnswer();
//     peerConnection.setLocalDescription(answer)
//     socket.emit("answer", answer, room)
// }

socket.on("offerRequest", async (offer) => {
    console.log("\n\nOffer request", offer)
    
    await createPeerConnection();
    peerConnection.setRemoteDescription(offer)
    const answer = await peerConnection.createAnswer();
    peerConnection.setLocalDescription(answer)
    socket.emit("answer", answer, room)
})

socket.on("newCandidates", candidates => {
    console.log("\n\nNew candidates", candidates)
    peerConnection.addIceCandidate(candidates)
})

socket.on("answered", answer => {
    console.log(peerConnection.currentRemoteDescription)
    if(!peerConnection.currentRemoteDescription)
        peerConnection.setRemoteDescription(answer)
})

socket.on("MemberJoined", data => {
    console.log(data)
})

// init();

createstream.addEventListener("click", async () => {
    upload.click();
})

upload.addEventListener("change", async ({ target: { files } }) => {
    socket.emit("joinRoom", room)
    // localstream = await navigator.mediaDevices.getUserMedia({video: true, audio: false})
    user1.src = URL.createObjectURL(files[0])
    localstream = await user1.captureStream();
    videoscontainer.style.display = "block";
    streambtns.style.display = "none"
})

connectstream.addEventListener("click", async () => {
    socket.emit("joinRoom", room)
    localstream = new MediaStream([videoStream({height: 920, width: 640}), audioStream()])

    await createPeerConnection();
    streambtns.style.display = "none"
    videoscontainer.style.display = "block"

    remotestream = new MediaStream();
    user1.srcObject = remotestream;

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer)
    socket.emit("offer", offer, room)

})