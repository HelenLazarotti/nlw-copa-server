import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate"

export async function guessesRoutes(fastify: FastifyInstance) {
    fastify.get('/guesses/count', async() => {

        const count = await prisma.guess.count()
        
        return {count}
    })

    //CRIANDO PALPITE:
    //tenho vários bolões e quero um específico
    //mesma coisa game.
    //e quero criar um palpite
    fastify.post('/pools/:poolId/games/:gameId/guesses', {
        onRequest: [authenticate]
    }, async (request, reply) => {
        const createGuessParams = z.object({
            poolId: z.string(),
            gameId: z.string()
        })

        //pra mim enviar o palpite, eu preciso recebê-lo, quanto cada time vai pontuar:
        //vai vir do corpo da requisição e não da URL como o restante:
        const createGuessBody = z.object({
            firstTeamPoints: z.number(),
            secondTeamPoints: z.number()
        })

        const { poolId, gameId } = createGuessParams.parse(request.params)

        const { firstTeamPoints, secondTeamPoints } = createGuessBody.parse(request.body)

        //vamos fazer algumas validações:
        //1º procurar um participante onde:
        const participant = await prisma.participant.findUnique({
            //a união user e pool ID
            where: {
                userId_poolId: {
                    poolId,
                    userId: request.user.sub
                }
            }
        })
        //se não for retornado nada dali de cima:
        if (!participant) {
            //quer dizer que o usuário não faz parte desse bolão:
            return reply.status(400).send({
                message: "You're not allowed to create a guess inside this pool."
            })
        }

        //vou procurar se já existe um palpite enviado por esse usuário, pois se ele já fez um nesse jogo, NÃO PODE fazer outro:
        const guess = await prisma.guess.findUnique({
            where: {
                participantId_gameId: {
                    participantId: participant.id,
                    gameId
                }
            }
        })

        //condição:
        if(guess) {
            return reply.status(400).send({
                message: "You already sent a guess to this game on this pool."
            })
        }

        //se tudo isso pasou eu procuto pelo game:
        const game = await prisma.game.findUnique({
            where: {
                //onde o ID do jogo seja igual ao gameID que ta sendo enviado na URL 
                id: gameId
            }
        })

        //se o jogo não existir retorno erro
        if (!game){
            return reply.status(400).send({
                message: "Game not found."
            })
        }

        //se a data do jogo for anterior(no JS podemos comparar datas com os sinais de < e >) a data atual
        if(game.date < new Date()){
            //tbm retorno erro:
            return reply.status(400).send({
                message: "You cannot send guesses after the game."
            })
        }
        //agora sim, se TOOOODAS avaliações passaram eu CRIO o palpite:
        await prisma.guess.create({
            data: {
                participantId: participant.id,
                gameId,
                firstTeamPoints,
                secondTeamPoints,
            }
        })
        //status 201 é de criação:
        return reply.status(201).send()
    })
}