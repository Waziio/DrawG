import { Server, Socket } from "socket.io";
import { redis } from "../../app";
import Room from "../classes/Room";
import { RoomFromRedis } from "../types/types";
import Player from "../classes/Player";
import { getRandomWords } from "../utils/utils";

export function setupRoomHandlers(socket: Socket, io: Server) {
    socket.on("joinRoom", (roomId: string) => {
        socket.join(`room:${roomId}`);
        console.log(`Socket ${socket.id} has joined room ${roomId}`);
    });

    socket.on("startGame", async (roomId: string) => {
        const result = await redis.get(`room:${roomId}`);
        if (result) {
            // Get room infos
            const roomFound: RoomFromRedis = JSON.parse(result);
            const players = roomFound.players.map((player) => new Player(player.username, player.hasDrawn));
            const owner =
                players.find((player) => player.getUsername() === roomFound.owner.username) ??
                new Player(roomFound.owner.username, roomFound.owner.hasDrawn);
            const room = new Room(roomId, owner, players, roomFound.nbPlayersMax);
            // Define a drawer
            const drawer = room.defineDrawer();
            // Store new infos in redis
            await redis.set(`room${roomId}`, JSON.stringify(room.getData()));
        }
    });

    socket.on("draw", (data: { roomId: string; canvasData: string }) => {
        console.log("is drawing");
        io.to(`room:${data.roomId}`).emit("isDrawing", data);
    });

    socket.on("sendMessage", async (data: { roomId: string; message: string; username: string }) => {
        io.to(`room:${data.roomId}`).emit("receiveMessage", {
            message: data.message,
            username: data.username,
        });

        const result = await redis.get(`room:${data.roomId}`);
        if (result) {
            // Get room infos
            const roomFound: RoomFromRedis = JSON.parse(result);
            const players = roomFound.players.map((player) => new Player(player.username, player.hasDrawn, player.score));
            const owner =
                players.find((player) => player.getUsername() === roomFound.owner.username) ??
                new Player(roomFound.owner.username, roomFound.owner.hasDrawn);
            const room = new Room(data.roomId, owner, players, roomFound.nbPlayersMax, roomFound.isPlaying, roomFound.wordToGuess);

            if (room.guess(data.message, data.username)) {
                // Player has guessed the word
                const newDrawer = room.defineDrawer();
                await redis.set(`room:${data.roomId}`, JSON.stringify(room.getData()));
                if (newDrawer) {
                    const words = getRandomWords(3);
                    io.to(`room:${data.roomId}`).emit("roundEnd", { room: room.getData(), drawer: newDrawer, words });
                } else {
                    io.to(`room:${data.roomId}`).emit("gameEnd", { room: room.getData() });
                }
            }
        }
    });
}
