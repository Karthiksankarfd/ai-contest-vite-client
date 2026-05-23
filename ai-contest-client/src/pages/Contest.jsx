import { useContext } from "react";
import ContestCard from "../components/contest/ContestCard"
import { useEffect } from "react";
import { ContestListContext } from "../context/ContestList";
import { SocketContext } from "../context/SocketContext";
function Contest() {

    const { socket } = useContext(SocketContext);
    const { contestList, setContestList } = useContext(ContestListContext);

    async function fetchContests() {
        try {
            const response = await fetch(`${import.meta.env.VITE_BASE_API_URL}/contests` , {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
             }  
            );         
            const data = await response.json();
            if (response.ok) {
                console.log("All Contests:", data);  
                setContestList(() => data.contests);      
            } else {
                console.error("Failed to fetch contests:", data);
            }
        } catch (error) {
            console.error("Error fetching contests:", error);
        }   
    }

    useEffect(() => {
        fetchContests();
        socket.on("joined-to-room" , (data)=>{
        console.log("Joined Room Event :" , data )
    })
    }, [])



  return (
    <section className="py-5">
        <div className="grid grid-cols-4 gap-4">
            {contestList.map((contest) => (
                <ContestCard key={contest?.contestId} contest={contest} />
            ))}
        </div>
    </section>
  )
}

export default Contest