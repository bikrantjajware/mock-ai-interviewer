import { BACKEND_URL } from "@/lib/config"
import { useEffect, useRef } from "react"
import { useParams } from "react-router"

export function Interview(){
    const { interviewId } = useParams()

    const audioElementRef:any = useRef(null)

    useEffect(()=>{
        (async () =>{
            const pc = new RTCPeerConnection();

            // Set up to play remote audio from the model
            // audioElement.current = document.createElement("audio");
            audioElementRef.current!.autoplay = true;
            pc.ontrack = (e) => (audioElementRef.current!.srcObject = e.streams[0]);

            // Add local audio track for microphone input in the browser
            const ms = await navigator.mediaDevices.getUserMedia({
            audio: true,
            });
            pc.addTrack(ms.getTracks()[0]!);

            // Set up data channel for sending and receiving events
            // const dc = pc.createDataChannel("oai-events"); #not needed as kirat said??

                        // Start the session using the Session Description Protocol (SDP)
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer); //sets local client's sdp

            const sdpResponse = await fetch(`${BACKEND_URL}/session`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    "Content-Type": "application/sdp",
                    "x-interview-id": interviewId || '1'
                },
            });

            const answer = {
                type: "answer" as "answer",
                sdp: await sdpResponse.text(),
            };
            await pc.setRemoteDescription(answer);

        })()

    },[interviewId])

    return <div>
        <h1>
            Interview for :<span>{interviewId}</span>
            <audio ref={audioElementRef} />
        </h1>
    </div>
}