import { useState } from "react"
import "../styles/globals.css"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { toast } from "sonner"
import axios from "axios"
import { BACKEND_URL } from "@/lib/config"
import { useNavigate } from "react-router"

export function Form (){

    const [githubLink, setGithubLink] = useState('')
    const [linkedinLink, setLinkedinLink] = useState('')
    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)

    const onSubmit = async () => {
        console.log({ githubLink })
        if (!githubLink ){
            toast(" Github link is required")
        }
        setLoading(true)

        const resp = await axios.post(BACKEND_URL+'/api/v1/pre-interview',{
            github: githubLink,
            // linkedin: linkedinLink

        })
        setLoading(false)
        console.log({ resp:resp.data })
        if (resp.data.id){
            navigate(`interview/${resp.data.id}`)
        }


        
    }

    return <div className="flex flex-col items-center justify-center gap-4">
                <h2 className="text-3xl font-bold text-gray-900 mb-4" >Ai Interviewer</h2>
                <div className="flex flex-col gap-2">
                    {/* <Input className="p-2" type="text" placeholder="Linkedin URL" onChange={ e => setLinkedinLink(e.target.value)} /> */}
                    <Input disabled={loading} className="p-2" type="text" placeholder="Github URL"   onChange={ e => setGithubLink(e.target.value)} />
                </div>
                <Button disabled={loading} onClick={onSubmit}>{loading ? "preparing interview..." : "Start Interview"}</Button>
        </div>
}