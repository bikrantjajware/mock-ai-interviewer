import { BACKEND_URL } from "@/lib/config";
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "./ui/button";

export function Interview() {
    const { interviewId } = useParams();

    const audioElementRef: any = useRef(null);
    const streamRef = useRef<MediaStream | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const endingInterviewRef = useRef(false);
    const navigate = useNavigate();

    if (!interviewId){
        return <div>
            <h3>Sorry! no Interview Id found</h3>
        </div>
    }


    const cleanupInterview = () => {
        if (mediaRecorderRef.current?.state !== "inactive") {
            mediaRecorderRef.current?.stop();
        }
        mediaRecorderRef.current = null;

        if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
            socketRef.current.close();
        }
        socketRef.current = null;

        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    };

    const handleEndInterview = async () => {
        if (endingInterviewRef.current) {
            return;
        }

        endingInterviewRef.current = true;
        cleanupInterview();

        try {
            const response = await fetch(`${BACKEND_URL}/api/v1/end-interview`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ interviewId }),
            });

            if (!response.ok) {
                throw new Error(`Failed to end interview: ${response.status}`);
            }
            console.log("waiting for 2 seconds before navigating to results page")
            await new Promise(resolve => setTimeout(resolve, 2000));``
            navigate(`/results/${interviewId}`);
        } catch (error) {
            endingInterviewRef.current = false;
            console.error("Failed to end interview:", error);
        }
    }

    useEffect(() => {
        
        function connectDeepgramSocket(stream: MediaStream, interviewId: string) {

            // TODO: handle https endpoint
            let wsUrl = BACKEND_URL.replace(/^http/, 'ws');
            wsUrl = wsUrl + `?interviewId=${interviewId}`
            
            console.log({ wsUrl })
            const socket = new WebSocket(wsUrl)
            socketRef.current = socket

            socket.onopen = async ()  => {

                console.log("connection open with BE")
                const options = { mimeType: 'audio/webm;codecs=opus' };
    
                const mediaRecorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = mediaRecorder;
    
                let chunkId = 0;
                 // 4. Capture raw chunks and stream directly to your Node backend
                mediaRecorder.ondataavailable = async (event) => {

                    const buffer = await event.data.arrayBuffer();
                    if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                        socket.send(buffer); // Pushes the raw Blob binary data chunk
                    }
                };
    
                mediaRecorder.start(250);
            }

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'transcript') {
                        console.log('transcript', data.text)
                    }
                } catch (e) {
                    console.error('Error parsing backend payload:', e);
                }
            };

            socket.onclose = () => {
                console.log("disconnected")
                // setStatus('Disconnected');
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                    mediaRecorderRef.current.stop();
                }
                // stopRecording();
            };

            socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                // setStatus('Connection error');
            };
            
        }
        
        (async () => {
            const pc = new RTCPeerConnection();
            peerConnectionRef.current = pc;

            // Set up to play remote audio from the model
            // audioElement.current = document.createElement("audio");
            audioElementRef.current!.autoplay = true;
            pc.ontrack = (e) => (audioElementRef.current!.srcObject = e.streams[0]);

            // Add local audio track for microphone input in the browser
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            streamRef.current = stream;

            connectDeepgramSocket(stream, interviewId) //sends audio stream to backend via websocket

            pc.addTrack(stream.getTracks()[0]!);

            // Set up data channel for sending and receiving events

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
        })();

        return () => {
            cleanupInterview();

        };
    }, [interviewId]);

    return (
        <div>
            <h1>
                Interview for :<span>{interviewId}</span>
                <audio ref={audioElementRef} />
                <Button onClick={handleEndInterview}>End Interview</Button>
            </h1>
        </div>
    );
}