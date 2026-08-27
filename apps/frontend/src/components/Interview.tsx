import { useParams } from "react-router"

export function Interview(){
    const {id } = useParams()
    return <div>
        <h1>
            Interview for :<span>{id}</span>
        </h1>
    </div>
}