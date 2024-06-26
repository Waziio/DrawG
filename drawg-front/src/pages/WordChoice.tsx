import { useContext, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { WordList } from "../components/wordList"
import RoomService from "../services/room"
import { SocketContext } from "../App"
import useRoomAuthorization from "../hooks/useRoomAuthorization"

export function WordChoice() {
    useRoomAuthorization()
    const location = useLocation()
    const navigate = useNavigate()
    
    const socket = useContext(SocketContext)
    const words: Array<string> = location.state?.data.words
    const drawer = location.state?.data.drawer
    const currentUser = location.state?.currentUser
    const room = location.state?.data.room
    const [wordToGuess, setWordToGuess] = useState('')
    
    async function onChoose(word: string) {
        const roomService = new RoomService()
        setWordToGuess(word)
        await roomService.chooseWord(room.id, word)
    }
    
    useEffect(() => {
        const handleRoundStarted = (data: any) => {
            const navigationData = { currentUser, drawer, room, wordToGuess }
            navigate(`/room/${data.room.id}/game`, { state: navigationData })
        }

        socket.on(`roundStarted`, handleRoundStarted)

        return () => {
            socket.off(`roundStarted`, handleRoundStarted)
        };
    }, [wordToGuess])

    return (
        <>
        {currentUser?.username === drawer?.username ? 
        (
        <div id="words">
            <WordList words={words} onChoose={onChoose}></WordList>
        </div>
        )
         : (
            <p>{drawer?.username} has to choose a word...</p>
         )
        }
        </>
    )

}